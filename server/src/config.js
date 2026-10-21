import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const serverRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const projectRoot = path.dirname(serverRoot);

function resolveFromProjectRoot(value, fallback) {
  const target = value && value.trim() ? value.trim() : fallback;
  return path.isAbsolute(target) ? target : path.join(projectRoot, target);
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  databasePath: resolveFromProjectRoot(process.env.DATABASE_PATH, './data/casa-finance.db'),
  backupDir: resolveFromProjectRoot(process.env.BACKUP_DIR, './backups'),
  backupRetention: Number(process.env.BACKUP_RETENTION) || 30,
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me',
  clientDistPath: path.join(projectRoot, 'client', 'dist'),
  projectRoot,
  serverRoot,
};

export default config;
