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
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
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
