import { db } from '../db/index.js';

export const DEFAULT_CATEGORIES = [
  ['Saldo inicial / Aporte', 'INCOME'],
  ['Móveis', 'EXPENSE'],
  ['Eletrodomésticos', 'EXPENSE'],
  ['Reforma', 'EXPENSE'],
  ['Material de construção', 'EXPENSE'],
  ['Serviços / mão de obra', 'EXPENSE'],
  ['Documentação / taxas', 'EXPENSE'],
  ['Contas da casa', 'EXPENSE'],
  ['Decoração', 'EXPENSE'],
  ['Investimentos', 'BOTH'],
  ['Outros', 'BOTH'],
];

export function seedDefaultCategories() {
  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, kind) VALUES (?, ?)');
  db.exec('BEGIN');
  try {
    for (const [name, kind] of DEFAULT_CATEGORIES) insert.run(name, kind);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return DEFAULT_CATEGORIES.length;
}
