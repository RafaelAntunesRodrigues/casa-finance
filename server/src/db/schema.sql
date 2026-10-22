PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (kind IN ('INCOME', 'EXPENSE', 'BOTH')),
  -- HOUSE = categorias da casa (compartilhadas); PERSONAL = categorias dos
  -- módulos pessoais (Rafael/Duda).
  scope TEXT NOT NULL DEFAULT 'HOUSE' CHECK (scope IN ('HOUSE', 'PERSONAL')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
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

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date
  ON transactions(type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_category_date
  ON transactions(category_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(created_by, transaction_date);

-- Metas: alvo de economia (sem categoria) ou limite de gasto (com categoria).
-- recurrence='MONTHLY' vale para todo mes; 'ONCE' vale so para o mes em
-- que foi lancada (campo month, formato YYYY-MM).
-- owner_id NULL = meta do casal (combina casa + pessoal dos dois);
-- owner_id = id de um usuário = meta pessoal daquele usuário.
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  target_cents INTEGER NOT NULL CHECK (target_cents > 0),
  category_id INTEGER,
  owner_id INTEGER,
  recurrence TEXT NOT NULL CHECK (recurrence IN ('MONTHLY', 'ONCE')),
  month TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_goals_month ON goals(month);

-- Lançamentos pessoais (Rafael/Duda). Totalmente separados do saldo da
-- casa: entradas/saídas pessoais nunca entram em transactions. Visível para
-- os dois usuários (módulo pessoal é "aberto").
-- expense_kind só se aplica a type='EXPENSE': NORMAL (lançamento avulso),
-- FIXED (recorrente, gerado a partir de personal_fixed_templates) ou
-- INSTALLMENT (uma parcela de uma compra parcelada).
CREATE TABLE IF NOT EXISTS personal_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'INVESTMENT')),
  expense_kind TEXT CHECK (expense_kind IN ('NORMAL', 'FIXED', 'INSTALLMENT')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  category_id INTEGER NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  transaction_date TEXT NOT NULL,
  installment_group_id TEXT,
  installment_number INTEGER,
  installment_total INTEGER,
  fixed_template_id INTEGER,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (fixed_template_id) REFERENCES personal_fixed_templates(id)
);

CREATE INDEX IF NOT EXISTS idx_personal_tx_owner_date
  ON personal_transactions(owner_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_personal_tx_type_date
  ON personal_transactions(type, transaction_date);
CREATE INDEX IF NOT EXISTS idx_personal_tx_fixed_template
  ON personal_transactions(fixed_template_id, transaction_date);

-- Modelo de gasto fixo pessoal: a cada acesso ao mês, o sistema garante que
-- existe um lançamento real em personal_transactions para aquele mês
-- (geração "preguiçosa", ver personalTransactionService.ensureFixedOccurrences).
CREATE TABLE IF NOT EXISTS personal_fixed_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  description TEXT NOT NULL CHECK (length(trim(description)) > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  start_month TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_personal_fixed_owner ON personal_fixed_templates(owner_id);
