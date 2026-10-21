import { db } from '../db/index.js';
import { monthRange } from '../utils/dates.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getCategoryById } from './categoryService.js';

const BASE_SELECT = `
  SELECT
    g.id,
    g.name,
    g.target_cents AS targetCents,
    g.category_id AS categoryId,
    c.name AS categoryName,
    g.recurrence,
    g.month,
    g.active,
    g.created_by AS createdBy,
    u.name AS createdByName,
    g.created_at AS createdAt,
    g.updated_at AS updatedAt
  FROM goals g
  LEFT JOIN categories c ON c.id = g.category_id
  JOIN users u ON u.id = g.created_by
`;

function sumExpenseForCategory(categoryId, start, end) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
       WHERE type = 'EXPENSE' AND category_id = ? AND transaction_date BETWEEN ? AND ?`
    )
    .get(categoryId, start, end);
  return row.total;
}

function sumByTypeForMonth(type, start, end) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
       WHERE type = ? AND transaction_date BETWEEN ? AND ?`
    )
    .get(type, start, end);
  return row.total;
}

/**
 * Meta sem categoria = alvo de economia: compara o resultado líquido do mês
 * (entradas - saídas - investimentos) contra o valor alvo (quer ficar >=).
 * Meta com categoria = limite de gasto: compara o total gasto naquela
 * categoria no mês contra o valor alvo (quer ficar <=).
 */
function computeProgress(goal, month) {
  const [start, end] = monthRange(month);

  if (goal.categoryId) {
    const currentCents = sumExpenseForCategory(goal.categoryId, start, end);
    const percentage = goal.targetCents > 0 ? Math.round((currentCents / goal.targetCents) * 100) : 0;
    return {
      kind: 'SPENDING_CAP',
      currentCents,
      percentage: Math.max(0, Math.min(100, percentage)),
      achieved: currentCents <= goal.targetCents,
    };
  }

  const income = sumByTypeForMonth('INCOME', start, end);
  const expense = sumByTypeForMonth('EXPENSE', start, end);
  const investment = sumByTypeForMonth('INVESTMENT', start, end);
  const currentCents = income - expense - investment;
  const percentage = goal.targetCents > 0 ? Math.round((currentCents / goal.targetCents) * 100) : 0;
  return {
    kind: 'SAVINGS',
    currentCents,
    percentage: Math.max(0, Math.min(100, percentage)),
    achieved: currentCents >= goal.targetCents,
  };
}

export function listGoalsForMonth(month) {
  const rows = db
    .prepare(
      `${BASE_SELECT}
       WHERE g.active = 1
         AND (g.recurrence = 'MONTHLY' OR (g.recurrence = 'ONCE' AND g.month = ?))
       ORDER BY g.created_at DESC`
    )
    .all(month);

  return rows.map((goal) => ({ ...goal, progress: computeProgress(goal, month) }));
}

export function getGoalById(id) {
  return db.prepare(`${BASE_SELECT} WHERE g.id = ?`).get(id);
}

function assertCategoryExists(categoryId) {
  if (categoryId === null || categoryId === undefined) return;
  const category = getCategoryById(categoryId);
  if (!category) {
    throw new ValidationError('Categoria inexistente', { categoryId: 'invalid' });
  }
}

export function createGoal({ name, targetCents, categoryId, recurrence, month, createdBy }) {
  assertCategoryExists(categoryId);
  const info = db
    .prepare(
      `INSERT INTO goals (name, target_cents, category_id, recurrence, month, created_by)
       VALUES (@name, @targetCents, @categoryId, @recurrence, @month, @createdBy)`
    )
    .run({
      name,
      targetCents,
      categoryId: categoryId ?? null,
      recurrence,
      month: recurrence === 'ONCE' ? month : null,
      createdBy,
    });
  return getGoalById(info.lastInsertRowid);
}

export function updateGoal(id, { name, targetCents, categoryId, recurrence, month }) {
  const existing = getGoalById(id);
  if (!existing) throw new NotFoundError('Meta não encontrada');
  assertCategoryExists(categoryId);

  db.prepare(
    `UPDATE goals
     SET name = @name,
         target_cents = @targetCents,
         category_id = @categoryId,
         recurrence = @recurrence,
         month = @month,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id,
    name,
    targetCents,
    categoryId: categoryId ?? null,
    recurrence,
    month: recurrence === 'ONCE' ? month : null,
  });

  return getGoalById(id);
}

export function setGoalStatus(id, active) {
  const existing = getGoalById(id);
  if (!existing) throw new NotFoundError('Meta não encontrada');
  db.prepare('UPDATE goals SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return getGoalById(id);
}

export function deleteGoal(id) {
  const existing = getGoalById(id);
  if (!existing) throw new NotFoundError('Meta não encontrada');
  db.prepare('DELETE FROM goals WHERE id = ?').run(id);
}
