import { db } from '../db/index.js';
import { monthRange } from '../utils/dates.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { getCategoryById } from './categoryService.js';
import { sumPersonalByType, sumPersonalExpenseForCategory } from './personalTransactionService.js';

const BASE_SELECT = `
  SELECT
    g.id,
    g.name,
    g.target_cents AS targetCents,
    g.category_id AS categoryId,
    c.name AS categoryName,
    g.owner_id AS ownerId,
    o.name AS ownerName,
    g.recurrence,
    g.month,
    g.active,
    g.created_by AS createdBy,
    u.name AS createdByName,
    g.created_at AS createdAt,
    g.updated_at AS updatedAt
  FROM goals g
  LEFT JOIN categories c ON c.id = g.category_id
  LEFT JOIN users o ON o.id = g.owner_id
  JOIN users u ON u.id = g.created_by
`;

function sumHouseByType(type, start, end) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
       WHERE type = ? AND transaction_date BETWEEN ? AND ?`
    )
    .get(type, start, end);
  return row.total;
}

function sumHouseExpenseForCategory(categoryId, start, end) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
       WHERE type = 'EXPENSE' AND category_id = ? AND transaction_date BETWEEN ? AND ?`
    )
    .get(categoryId, start, end);
  return row.total;
}

/**
 * Meta sem categoria = alvo de economia (quer ficar >= alvo):
 *  - casal (sem owner): resultado da casa + resultado pessoal dos dois.
 *  - pessoal (com owner): resultado pessoal daquele usuário.
 * Meta com categoria = limite de gasto (quer ficar <= alvo):
 *  - casal: gasto da casa naquela categoria (categoria precisa ser HOUSE).
 *  - pessoal: gasto pessoal daquele usuário naquela categoria (categoria
 *    precisa ser PERSONAL).
 */
function computeProgress(goal, month) {
  const [start, end] = monthRange(month);

  if (goal.categoryId) {
    const currentCents = goal.ownerId
      ? sumPersonalExpenseForCategory(goal.categoryId, { ownerId: goal.ownerId, start, end })
      : sumHouseExpenseForCategory(goal.categoryId, start, end);
    const percentage = goal.targetCents > 0 ? Math.round((currentCents / goal.targetCents) * 100) : 0;
    return {
      kind: 'SPENDING_CAP',
      currentCents,
      percentage: Math.max(0, Math.min(100, percentage)),
      achieved: currentCents <= goal.targetCents,
    };
  }

  let currentCents;
  if (goal.ownerId) {
    const income = sumPersonalByType('INCOME', { ownerId: goal.ownerId, start, end });
    const expense = sumPersonalByType('EXPENSE', { ownerId: goal.ownerId, start, end });
    currentCents = income - expense;
  } else {
    const houseNet = sumHouseByType('INCOME', start, end) - sumHouseByType('EXPENSE', start, end);
    const personalIncome = sumPersonalByType('INCOME', { start, end });
    const personalExpense = sumPersonalByType('EXPENSE', { start, end });
    currentCents = houseNet + (personalIncome - personalExpense);
  }

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

function assertValidScope(categoryId, ownerId) {
  if (categoryId === null || categoryId === undefined) return;
  const category = getCategoryById(categoryId);
  if (!category) {
    throw new ValidationError('Categoria inexistente', { categoryId: 'invalid' });
  }
  const expectedScope = ownerId ? 'PERSONAL' : 'HOUSE';
  if (category.scope !== expectedScope) {
    throw new ValidationError(
      ownerId
        ? 'Metas pessoais só podem usar categorias do módulo pessoal'
        : 'Metas do casal só podem usar categorias da casa',
      { categoryId: 'invalid' }
    );
  }
}

export function createGoal({ name, targetCents, categoryId, ownerId, recurrence, month, createdBy }) {
  assertValidScope(categoryId, ownerId);
  const info = db
    .prepare(
      `INSERT INTO goals (name, target_cents, category_id, owner_id, recurrence, month, created_by)
       VALUES (@name, @targetCents, @categoryId, @ownerId, @recurrence, @month, @createdBy)`
    )
    .run({
      name,
      targetCents,
      categoryId: categoryId ?? null,
      ownerId: ownerId ?? null,
      recurrence,
      month: recurrence === 'ONCE' ? month : null,
      createdBy,
    });
  return getGoalById(info.lastInsertRowid);
}

export function updateGoal(id, { name, targetCents, categoryId, ownerId, recurrence, month }) {
  const existing = getGoalById(id);
  if (!existing) throw new NotFoundError('Meta não encontrada');
  assertValidScope(categoryId, ownerId);

  db.prepare(
    `UPDATE goals
     SET name = @name,
         target_cents = @targetCents,
         category_id = @categoryId,
         owner_id = @ownerId,
         recurrence = @recurrence,
         month = @month,
         updated_at = datetime('now')
     WHERE id = @id`
  ).run({
    id,
    name,
    targetCents,
    categoryId: categoryId ?? null,
    ownerId: ownerId ?? null,
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
