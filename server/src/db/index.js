import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

// node:sqlite é nativo do Node.js (>=22.5) e evita qualquer dependência de
// compilação nativa (node-gyp), o que mantém a instalação simples em Windows
// sem Visual Studio Build Tools. Usamos process.getBuiltinModule em vez de
// `import ... from 'node:sqlite'` porque esse módulo ainda não possui alias
// sem o prefixo "node:", o que confunde o resolvedor de módulos do Vite/
// Vitest (usado pelos testes) ao tentar externalizá-lo.
const sqlite = process.getBuiltinModule('node:sqlite');

export const db = new sqlite.DatabaseSync(config.databasePath);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

export const sqliteBackup = sqlite.backup;

export default db;
