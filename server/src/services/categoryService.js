import { db } from '../db/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const KINDS = new Set(['INCOME', 'EXPENSE', 'BOTH']);
const SCOPES = new Set(['HOUSE', 'PERSONAL']);

export function listCategories({ active, scope } = {}) {
  const clauses = [];
  const params = {};
  if (active === true) clauses.push('active = 1');
  if (active === false) clauses.push('active = 0');
  if (scope) {
    clauses.push('scope = @scope');
    params.scope = scope;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM categories ${where} ORDER BY name`).all(params);
}

export function getCategoryById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function assertUsableCategory(id, type, { scope } = {}) {
  const category = getCategoryById(id);
  if (!category || !category.active) {
    throw new ValidationError('Categoria inexistente ou inativa', { categoryId: 'invalid' });
  }
  if (scope && category.scope !== scope) {
    throw new ValidationError('Categoria não pertence a esse módulo', { categoryId: 'invalid' });
  }
  if (category.kind !== 'BOTH' && category.kind !== type) {
    throw new ValidationError('Categoria não é compatível com o tipo da movimentação', {
      categoryId: 'invalid',
    });
  }
  return category;
}

export function createCategory({ name, kind, scope = 'HOUSE' }) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new ValidationError('Nome da categoria é obrigatório', { name: 'required' });
  }
  if (!KINDS.has(kind)) {
    throw new ValidationError('Tipo de categoria inválido', { kind: 'invalid' });
  }
  if (!SCOPES.has(scope)) {
    throw new ValidationError('Escopo de categoria inválido', { scope: 'invalid' });
  }
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(trimmed);
  if (existing) {
    throw new ConflictError('Já existe uma categoria com esse nome');
  }
  const info = db
    .prepare('INSERT INTO categories (name, kind, scope) VALUES (?, ?, ?)')
    .run(trimmed, kind, scope);
  return getCategoryById(info.lastInsertRowid);
}

export function updateCategory(id, { name, kind }) {
  const category = getCategoryById(id);
  if (!category) throw new NotFoundError('Categoria não encontrada');

  const trimmed = (name ?? category.name).trim();
  const nextKind = kind ?? category.kind;
  if (!trimmed) {
    throw new ValidationError('Nome da categoria é obrigatório', { name: 'required' });
  }
  if (!KINDS.has(nextKind)) {
    throw new ValidationError('Tipo de categoria inválido', { kind: 'invalid' });
  }
  const clash = db
    .prepare('SELECT id FROM categories WHERE name = ? AND id != ?')
    .get(trimmed, id);
  if (clash) {
    throw new ConflictError('Já existe uma categoria com esse nome');
  }

  db.prepare('UPDATE categories SET name = ?, kind = ? WHERE id = ?').run(trimmed, nextKind, id);
  return getCategoryById(id);
}

export function setCategoryStatus(id, active) {
  const category = getCategoryById(id);
  if (!category) throw new NotFoundError('Categoria não encontrada');
  db.prepare('UPDATE categories SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
  return getCategoryById(id);
}
