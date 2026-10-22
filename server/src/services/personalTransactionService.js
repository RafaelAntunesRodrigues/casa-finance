import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { monthRange } from '../utils/dates.js';
import { NotFoundError } from '../utils/errors.js';
import { assertUsableCategory } from './categoryService.js';

const BASE_SELECT = `
  SELECT
    t.id,
    t.owner_id AS ownerId,
    o.name AS ownerName,
    t.type,
    t.expense_kind AS expenseKind,
    t.amount_cents AS amountCents,
    t.category_id AS categoryId,
    c.name AS categoryName,
    t.description,
    t.transaction_date AS transactionDate,
    t.installment_group_id AS installmentGroupId,
    t.installment_number AS installmentNumber,
    t.installment_total AS installmentTotal,
    t.fixed_template_id AS fixedTemplateId,
    t.created_by AS createdBy,
    u.name AS createdByName,
    t.created_at AS createdAt,
    t.updated_at AS updatedAt
  FROM personal_transactions t
  JOIN categories c ON c.id = t.category_id
  JOIN users u ON u.id = t.created_by
  JOIN users o ON o.id = t.owner_id
`;

function addMonths(dateStr, offset) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const totalMonths = y * 12 + (m - 1) + offset;
  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;
  const lastDay = new Date(Date.UTC(newYear, newMonth, 0)).getUTCDate();
  const newDay = Math.min(d, lastDay);
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}`;
}

/**
 * Garante que todo gasto fixo ativo do dono tenha um lançamento real no mês
 * informado (geração "preguiçosa" — roda sempre que o mês é consultado).
 */
export function ensureFixedOccurrences(ownerId, month) {
  if (!month) return;
  const templates = db
    .prepare(
      `SELECT * FROM personal_fixed_templates
       WHERE owner_id = ? AND active = 1 AND start_month <= ?`
    )
    .all(ownerId, month);

  for (const tpl of templates) {
    const exists = db
      .prepare(
        `SELECT 1 FROM personal_transactions
         WHERE fixed_template_id = ? AND strftime('%Y-%m', transaction_date) = ?`
      )
      .get(tpl.id, month);
    if (exists) continue;

    const transactionDate = `${month}-${String(tpl.day_of_month).padStart(2, '0')}`;
    db.prepare(
      `INSERT INTO personal_transactions
        (owner_id, type, expense_kind, amount_cents, category_id, description, transaction_date, fixed_template_id, created_by)
       VALUES (?, 'EXPENSE', 'FIXED', ?, ?, ?, ?, ?, ?)`
    ).run(tpl.owner_id, tpl.amount_cents, tpl.category_id, tpl.description, transactionDate, tpl.id, tpl.created_by);
  }
}

function buildFilters({ ownerId, month, type, categoryId, q }) {
  const clauses = ['t.owner_id = @ownerId'];
  const params = { ownerId };

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
  if (q) {
    clauses.push('t.description LIKE @q');
    params.q = `%${q}%`;
  }

  return { where: `WHERE ${clauses.join(' AND ')}`, params };
}

export function listPersonalTransactions(filters) {
  ensureFixedOccurrences(filters.ownerId, filters.month);
  const { where, params } = buildFilters(filters);
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 50;
  const offset = (page - 1) * pageSize;

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM personal_transactions t ${where}`)
    .get(params).count;

  const items = db
    .prepare(
      `${BASE_SELECT} ${where} ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit: pageSize, offset });

  return { items, total, page, pageSize };
}

export function listPersonalTransactionsForExport(filters) {
  ensureFixedOccurrences(filters.ownerId, filters.month);
  const { where, params } = buildFilters(filters);
  return db
    .prepare(`${BASE_SELECT} ${where} ORDER BY t.transaction_date DESC, t.created_at DESC, t.id DESC`)
    .all(params);
}

export function getPersonalTransactionById(id) {
  return db.prepare(`${BASE_SELECT} WHERE t.id = ?`).get(id);
}

// amountCents aqui é o valor de CADA parcela (não o total da compra) — cada
// linha gerada usa o mesmo valor, sem nenhuma divisão/rateio.
function createInstallmentExpense({ ownerId, amountCents, installments, categoryId, description, transactionDate, createdBy }) {
  const groupId = crypto.randomUUID();
  const insert = db.prepare(
    `INSERT INTO personal_transactions
      (owner_id, type, expense_kind, amount_cents, category_id, description, transaction_date,
       installment_group_id, installment_number, installment_total, created_by)
     VALUES (@ownerId, 'EXPENSE', 'INSTALLMENT', @amountCents, @categoryId, @description, @transactionDate,
             @groupId, @number, @total, @createdBy)`
  );

  let firstId;
  db.exec('BEGIN');
  try {
    for (let i = 0; i < installments; i += 1) {
      const info = insert.run({
        ownerId,
        amountCents,
        categoryId,
        description: `${description} (${i + 1}/${installments})`,
        transactionDate: addMonths(transactionDate, i),
        groupId,
        number: i + 1,
        total: installments,
        createdBy,
      });
      if (i === 0) firstId = info.lastInsertRowid;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return getPersonalTransactionById(firstId);
}

export function createPersonalTransaction({
  ownerId,
  type,
  expenseKind,
  amountCents,
  installments,
  categoryId,
  description,
  transactionDate,
  createdBy,
}) {
  assertUsableCategory(categoryId, type, { scope: 'PERSONAL' });

  if (type === 'EXPENSE' && expenseKind === 'INSTALLMENT') {
    return createInstallmentExpense({ ownerId, amountCents, installments, categoryId, description, transactionDate, createdBy });
  }

  const info = db
    .prepare(
      `INSERT INTO personal_transactions
        (owner_id, type, expense_kind, amount_cents, category_id, description, transaction_date, created_by)
       VALUES (@ownerId, @type, @expenseKind, @amountCents, @categoryId, @description, @transactionDate, @createdBy)`
    )
    .run({
      ownerId,
      type,
      expenseKind: type === 'EXPENSE' ? 'NORMAL' : null,
      amountCents,
      categoryId,
      description,
      transactionDate,
      createdBy,
    });
  return getPersonalTransactionById(info.lastInsertRowid);
}

export function updatePersonalTransaction(id, { type, amountCents, categoryId, description, transactionDate }) {
  const existing = getPersonalTransactionById(id);
  if (!existing) throw new NotFoundError('Movimentação não encontrada');
  assertUsableCategory(categoryId, type, { scope: 'PERSONAL' });

  db.prepare(
    `UPDATE personal_transactions
     SET type = @type,
         amount_cents = @amountCents,
         category_id = @categoryId,
         description = @description,
         transaction_date = @transactionDate,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({ id, type, amountCents, categoryId, description, transactionDate });

  return getPersonalTransactionById(id);
}

export function deletePersonalTransaction(id) {
  const existing = getPersonalTransactionById(id);
  if (!existing) throw new NotFoundError('Movimentação não encontrada');
  db.prepare('DELETE FROM personal_transactions WHERE id = ?').run(id);
}

// ---------- Gastos fixos (templates) ----------

const FIXED_TEMPLATE_SELECT = `
  SELECT
    f.id, f.owner_id AS ownerId, f.category_id AS categoryId, c.name AS categoryName,
    f.description, f.amount_cents AS amountCents, f.day_of_month AS dayOfMonth,
    f.start_month AS startMonth, f.active, f.created_by AS createdBy, f.created_at AS createdAt
  FROM personal_fixed_templates f
  JOIN categories c ON c.id = f.category_id
`;

export function getFixedTemplateById(id) {
  return db.prepare(`${FIXED_TEMPLATE_SELECT} WHERE f.id = ?`).get(id);
}

export function listFixedTemplates(ownerId) {
  return db
    .prepare(`${FIXED_TEMPLATE_SELECT} WHERE f.owner_id = ? ORDER BY f.active DESC, f.description`)
    .all(ownerId);
}

export function createFixedTemplate({ ownerId, categoryId, description, amountCents, dayOfMonth, startMonth, createdBy }) {
  assertUsableCategory(categoryId, 'EXPENSE', { scope: 'PERSONAL' });
  const info = db
    .prepare(
      `INSERT INTO personal_fixed_templates
        (owner_id, category_id, description, amount_cents, day_of_month, start_month, created_by)
       VALUES (@ownerId, @categoryId, @description, @amountCents, @dayOfMonth, @startMonth, @createdBy)`
    )
    .run({ ownerId, categoryId, description, amountCents, dayOfMonth, startMonth, createdBy });
  ensureFixedOccurrences(ownerId, startMonth);
  return getFixedTemplateById(info.lastInsertRowid);
}

export function setFixedTemplateStatus(id, active) {
  const existing = getFixedTemplateById(id);
  if (!existing) throw new NotFoundError('Gasto fixo não encontrado');
  db.prepare('UPDATE personal_fixed_templates SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return getFixedTemplateById(id);
}

export function deleteFixedTemplate(id) {
  const existing = getFixedTemplateById(id);
  if (!existing) throw new NotFoundError('Gasto fixo não encontrado');
  db.prepare('DELETE FROM personal_fixed_templates WHERE id = ?').run(id);
}

// ---------- Agregados usados pelo dashboard da casa e pelas metas ----------

export function sumPersonalByType(type, { ownerId, upTo, start, end } = {}) {
  const clauses = ['type = @type'];
  const params = { type };
  if (ownerId) {
    clauses.push('owner_id = @ownerId');
    params.ownerId = ownerId;
  }
  if (upTo) {
    clauses.push('transaction_date <= @upTo');
    params.upTo = upTo;
  } else {
    clauses.push('transaction_date BETWEEN @start AND @end');
    params.start = start;
    params.end = end;
  }
  const row = db
    .prepare(`SELECT COALESCE(SUM(amount_cents), 0) AS total FROM personal_transactions WHERE ${clauses.join(' AND ')}`)
    .get(params);
  return row.total;
}

export function sumPersonalExpenseForCategory(categoryId, { ownerId, start, end }) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM personal_transactions
       WHERE type = 'EXPENSE' AND category_id = ? AND owner_id = ? AND transaction_date BETWEEN ? AND ?`
    )
    .get(categoryId, ownerId, start, end);
  return row.total;
}
