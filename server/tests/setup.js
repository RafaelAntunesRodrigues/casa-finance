import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = './data/test-casa-finance.db';
process.env.SESSION_SECRET = 'test-secret-not-for-production';
process.env.BACKUP_DIR = './backups-test';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, '..', '..');
const dbPath = path.join(projectRoot, 'data', 'test-casa-finance.db');

for (const suffix of ['', '-wal', '-shm']) {
  const file = dbPath + suffix;
  if (fs.existsSync(file)) fs.unlinkSync(file);
}
