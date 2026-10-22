import { db } from '../db/index.js';
import { monthRange } from '../utils/dates.js';
import { ensureFixedOccurrences, sumPersonalByType } from './personalTransactionService.js';

function getPersonalBalanceUpTo(ownerId, date) {
  const income = sumPersonalByType('INCOME', { ownerId, upTo: date });
  const expense = sumPersonalByType('EXPENSE', { ownerId, upTo: date });
  return income - expense;
}

function previousMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) - 1;
  const newY = Math.floor(totalMonths / 12);
  const newM = (totalMonths % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

function monthlyTrend(ownerId, month, count = 6) {
  const months = [];
  let cursor = month;
  for (let i = 0; i < count; i += 1) {
    months.unshift(cursor);
    cursor = previousMonth(cursor);
  }

  return months.map((m) => {
    const [start, end] = monthRange(m);
    const incomeCents = sumPersonalByType('INCOME', { ownerId, start, end });
    const expenseCents = sumPersonalByType('EXPENSE', { ownerId, start, end });
    const investmentCents = sumPersonalByType('INVESTMENT', { ownerId, start, end });
    return { month: m, incomeCents, expenseCents, investmentCents, netCents: incomeCents - expenseCents };
  });
}

export function getPersonalDashboard(ownerId, month) {
  ensureFixedOccurrences(ownerId, month);
  const [start, end] = monthRange(month);

  const balanceCents = getPersonalBalanceUpTo(ownerId, end);
  const incomeCents = sumPersonalByType('INCOME', { ownerId, start, end });
  const expenseCents = sumPersonalByType('EXPENSE', { ownerId, start, end });
  const investmentCents = sumPersonalByType('INVESTMENT', { ownerId, start, end });
  const netCents = incomeCents - expenseCents;
  const totalInvestedCents = sumPersonalByType('INVESTMENT', { ownerId, upTo: end });

  const expensesByCategory = db
    .prepare(
      `SELECT c.id AS categoryId, c.name AS categoryName, SUM(t.amount_cents) AS amountCents
       FROM personal_transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.type = 'EXPENSE' AND t.owner_id = ? AND t.transaction_date BETWEEN ? AND ?
       GROUP BY c.id, c.name
       ORDER BY amountCents DESC`
    )
    .all(ownerId, start, end);

  const recentTransactions = db
    .prepare(
      `SELECT
         t.id, t.type, t.expense_kind AS expenseKind, t.amount_cents AS amountCents,
         t.category_id AS categoryId, c.name AS categoryName, t.description,
         t.transaction_date AS transactionDate, t.installment_number AS installmentNumber,
         t.installment_total AS installmentTotal, t.created_by AS createdBy, u.name AS createdByName
       FROM personal_transactions t
       JOIN categories c ON c.id = t.category_id
       JOIN users u ON u.id = t.created_by
       WHERE t.owner_id = ?
       ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC
       LIMIT 8`
    )
    .all(ownerId);

  return {
    month,
    balanceCents,
    incomeCents,
    expenseCents,
    investmentCents,
    netCents,
    totalInvestedCents,
    expensesByCategory,
    recentTransactions,
    monthlyTrend: monthlyTrend(ownerId, month),
  };
}
