import { db } from '../db/index.js';
import { NotFoundError } from '../utils/errors.js';
import { assertUsableCategory } from './categoryService.js';
import { monthRange } from '../utils/dates.js';

const BASE_SELECT = `
  SELECT
    t.id,
    t.type,
    t.amount_cents AS amountCents,
    t.category_id AS categoryId,
    c.name AS categoryName,
    t.description,
    t.transaction_date AS transactionDate,
    t.created_by AS createdBy,
    u.name AS createdByName,
    t.created_at AS createdAt,
    t.updated_at AS updatedAt
  FROM transactions t
  JOIN categories c ON c.id = t.category_id
  JOIN users u ON u.id = t.created_by
`;

function buildFilters({ month, type, categoryId, createdBy, q }) {
  const clauses = [];
  const params = {};

  if (month) {
    const [start, end] = monthRange(month);
    clauses.push('t.transaction_date BETWEEN @start AND @end');
    params.start = start;
    params.end = end;
  }
  if (type) {
    clauses.push('t.type = @type');
    params.type = type;
  }
  if (categoryId) {
    clauses.push('t.category_id = @categoryId');
    params.categoryId = categoryId;
  }
  if (createdBy) {
    clauses.push('t.created_by = @createdBy');
    params.createdBy = createdBy;
  }
  if (q) {
    clauses.push('t.description LIKE @q');
    params.q = `%${q}%`;
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return { where, params };
}

export function listTransactions(filters) {
  const { where, params } = buildFilters(filters);
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM transactions t ${where}`)
    .get(params).count;

  const items = db
    .prepare(
      `${BASE_SELECT} ${where} ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset });

  return { items, total, page, pageSize };
}

export function getTransactionById(id) {
  return db.prepare(`${BASE_SELECT} WHERE t.id = ?`).get(id);
}

export function createTransaction({ type, amountCents, categoryId, description, transactionDate, createdBy }) {
  assertUsableCategory(categoryId, type, { scope: 'HOUSE' });
  const info = db
    .prepare(
      `INSERT INTO transactions (type, amount_cents, category_id, description, transaction_date, created_by)
       VALUES (@type, @amountCents, @categoryId, @description, @transactionDate, @createdBy)`
    )
    .run({ type, amountCents, categoryId, description, transactionDate, createdBy });
  return getTransactionById(info.lastInsertRowid);
}

export function updateTransaction(id, { type, amountCents, categoryId, description, transactionDate }) {
  const existing = getTransactionById(id);
  if (!existing) throw new NotFoundError('Movimentação não encontrada');
  assertUsableCategory(categoryId, type, { scope: 'HOUSE' });

  db.prepare(
    `UPDATE transactions
     SET type = @type,
         amount_cents = @amountCents,
         category_id = @categoryId,
         description = @description,
         transaction_date = @transactionDate,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({ id, type, amountCents, categoryId, description, transactionDate });

  return getTransactionById(id);
}

export function deleteTransaction(id) {
  const existing = getTransactionById(id);
  if (!existing) throw new NotFoundError('Movimentação não encontrada');
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
}

export function listTransactionsForExport(filters) {
  const { where, params } = buildFilters(filters);
  return db
    .prepare(`${BASE_SELECT} ${where} ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC`)
    .all(params);
}
