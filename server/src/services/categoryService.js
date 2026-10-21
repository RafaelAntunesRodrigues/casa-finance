import { db } from '../db/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.js';

const KINDS = new Set(['INCOME', 'EXPENSE', 'BOTH']);

export function listCategories({ active } = {}) {
  if (active === true) {
    return db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY name').all();
  }
  if (active === false) {
    return db.prepare('SELECT * FROM categories WHERE active = 0 ORDER BY name').all();
  }
  return db.prepare('SELECT * FROM categories ORDER BY name').all();
}

export function getCategoryById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

export function assertUsableCategory(id, type) {
  const category = getCategoryById(id);
  if (!category || !category.active) {
    throw new ValidationError('Categoria inexistente ou inativa', { categoryId: 'invalid' });
  }
  if (category.kind !== 'BOTH' && category.kind !== type) {
    throw new ValidationError('Categoria não é compatível com o tipo da movimentação', {
      categoryId: 'invalid',
    });
  }
  return category;
}

export function createCategory({ name, kind }) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new ValidationError('Nome da categoria é obrigatório', { name: 'required' });
  }
  if (!KINDS.has(kind)) {
    throw new ValidationError('Tipo de categoria inválido', { kind: 'invalid' });
  }
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(trimmed);
  if (existing) {
    throw new ConflictError('Já existe uma categoria com esse nome');
  }
  const info = db
    .prepare('INSERT INTO categories (name, kind) VALUES (?, ?)')
    .run(trimmed, kind);
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
