import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';

const here = path.dirname(fileURLToPath(import.meta.url));

const CURRENT_SCHEMA_VERSION = 2;

export function applySchema() {
  const schema = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  db.exec(schema);
  runMigrations();
}

function runMigrations() {
  let { user_version: version } = db.prepare('PRAGMA user_version').get();
  if (version < 1) {
    migrateAddInvestmentType();
    version = 1;
    db.exec(`PRAGMA user_version = ${version}`);
  }
  if (version < 2) {
    migrateAddPersonalModule();
    version = 2;
    db.exec(`PRAGMA user_version = ${version}`);
  }
}

function hasColumn(table, column) {
  return db
    .prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = ?`)
    .get(table, column) !== undefined;
}

/**
 * Introduz o módulo pessoal (Rafael/Duda): coluna `scope` em categories,
 * coluna `owner_id` em goals (ambas via ALTER TABLE ADD COLUMN, que o
 * SQLite suporta mesmo com CHECK/DEFAULT, sem precisar reconstruir a
 * tabela). As tabelas novas (personal_transactions, personal_fixed_templates)
 * já são criadas pelo schema.sql (CREATE TABLE IF NOT EXISTS).
 */
function migrateAddPersonalModule() {
  if (!hasColumn('categories', 'scope')) {
    db.exec(
      "ALTER TABLE categories ADD COLUMN scope TEXT NOT NULL DEFAULT 'HOUSE' CHECK (scope IN ('HOUSE', 'PERSONAL'))"
    );
    console.log('Migração aplicada: categories.scope adicionada.');
  }
  if (!hasColumn('goals', 'owner_id')) {
    db.exec('ALTER TABLE goals ADD COLUMN owner_id INTEGER REFERENCES users(id)');
    console.log('Migração aplicada: goals.owner_id adicionada.');
  }
}

/**
 * Bancos criados antes do tipo INVESTMENT existir têm a coluna
 * transactions.type com CHECK restrito a INCOME/EXPENSE. SQLite não permite
 * alterar um CHECK existente via ALTER TABLE, então reconstruímos a tabela
 * no padrão recomendado pelo próprio SQLite, preservando todos os dados.
 * Instalações novas já nascem com o CHECK correto (ver schema.sql), então
 * isso vira um no-op idempotente nesse caso.
 */
function migrateAddInvestmentType() {
  const table = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'transactions'")
    .get();
  if (!table || table.sql.includes("'INVESTMENT'")) return;

  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE transactions_migrating (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'INVESTMENT')),
        amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
        category_id INTEGER NOT NULL,
        description TEXT NOT NULL CHECK (length(trim(description)) > 0),
        transaction_date TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
    db.exec(`
      INSERT INTO transactions_migrating
        (id, type, amount_cents, category_id, description, transaction_date, created_by, created_at, updated_at)
      SELECT id, type, amount_cents, category_id, description, transaction_date, created_by, created_at, updated_at
      FROM transactions;
    `);
    db.exec('DROP TABLE transactions;');
    db.exec('ALTER TABLE transactions_migrating RENAME TO transactions;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, transaction_date);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_category_date ON transactions(category_id, transaction_date);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(created_by, transaction_date);');
    db.exec('COMMIT');
    console.log('Migração aplicada: transactions.type agora aceita INVESTMENT.');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export { CURRENT_SCHEMA_VERSION };
