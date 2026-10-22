import { db } from '../db/index.js';

export const DEFAULT_HOUSE_CATEGORIES = [
  ['Saldo inicial / Aporte', 'INCOME'],
  ['Móveis', 'EXPENSE'],
  ['Eletrodomésticos', 'EXPENSE'],
  ['Reforma', 'EXPENSE'],
  ['Material de construção', 'EXPENSE'],
  ['Serviços / mão de obra', 'EXPENSE'],
  ['Documentação / taxas', 'EXPENSE'],
  ['Contas da casa', 'EXPENSE'],
  ['Decoração', 'EXPENSE'],
  ['Outros', 'BOTH'],
];

export const DEFAULT_PERSONAL_CATEGORIES = [
  ['Salário', 'INCOME'],
  ['Freelas / renda extra', 'INCOME'],
  ['Alimentação', 'EXPENSE'],
  ['Transporte', 'EXPENSE'],
  ['Lazer', 'EXPENSE'],
  ['Assinaturas', 'EXPENSE'],
  ['Saúde', 'EXPENSE'],
  ['Educação', 'EXPENSE'],
  ['Vestuário', 'EXPENSE'],
  ['Investimentos pessoais', 'BOTH'],
  ['Outros pessoais', 'BOTH'],
];

export function seedDefaultCategories() {
  const insert = db.prepare('INSERT OR IGNORE INTO categories (name, kind, scope) VALUES (?, ?, ?)');
  db.exec('BEGIN');
  try {
    for (const [name, kind] of DEFAULT_HOUSE_CATEGORIES) insert.run(name, kind, 'HOUSE');
    for (const [name, kind] of DEFAULT_PERSONAL_CATEGORIES) insert.run(name, kind, 'PERSONAL');
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return DEFAULT_HOUSE_CATEGORIES.length + DEFAULT_PERSONAL_CATEGORIES.length;
}
