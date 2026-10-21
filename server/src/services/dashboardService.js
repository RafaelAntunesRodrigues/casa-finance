import { db } from '../db/index.js';
import { monthRange } from '../utils/dates.js';

function sumByType(type, { upTo, start, end }) {
  if (upTo) {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
         WHERE type = ? AND transaction_date <= ?`
      )
      .get(type, upTo);
    return row.total;
  }
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
       WHERE type = ? AND transaction_date BETWEEN ? AND ?`
    )
    .get(type, start, end);
  return row.total;
}

export function getBalanceUpTo(date) {
  const income = sumByType('INCOME', { upTo: date });
  const expense = sumByType('EXPENSE', { upTo: date });
  const investment = sumByType('INVESTMENT', { upTo: date });
  return income - expense - investment;
}

export function getDashboard(month) {
  const [start, end] = monthRange(month);

  const balanceCents = getBalanceUpTo(end);
  const incomeCents = sumByType('INCOME', { start, end });
  const expenseCents = sumByType('EXPENSE', { start, end });
  const investmentCents = sumByType('INVESTMENT', { start, end });
  const netCents = incomeCents - expenseCents - investmentCents;

  const expensesByCategory = db
    .prepare(
      `SELECT c.id AS categoryId, c.name AS categoryName, SUM(t.amount_cents) AS amountCents
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'EXPENSE' AND t.transaction_date BETWEEN ? AND ?
       GROUP BY c.id, c.name
       ORDER BY amountCents DESC`
    )
    .all(start, end);

  const recentTransactions = db
    .prepare(
      `SELECT
         t.id,
         t.type,
         t.amount_cents AS amountCents,
         t.category_id AS categoryId,
         c.name AS categoryName,
         t.description,
         t.transaction_date AS transactionDate,
         t.created_by AS createdBy,
         u.name AS createdByName
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN users u ON u.id = t.created_by
       ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC
       LIMIT 8`
    )
    .all();

  return {
    month,
    balanceCents,
    incomeCents,
    expenseCents,
    investmentCents,
    netCents,
    expensesByCategory,
    recentTransactions,
  };
}
