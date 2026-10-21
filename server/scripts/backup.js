import fs from 'node:fs';
import path from 'node:path';
import { db, sqliteBackup } from '../src/db/index.js';
import { config } from '../src/config.js';

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`
  );
}

async function run() {
  fs.mkdirSync(config.backupDir, { recursive: true });
  const fileName = `casa-finance-${timestamp()}.db`;
  const destination = path.join(config.backupDir, fileName);

  // API de backup online do SQLite (node:sqlite): gera uma cópia consistente
  // do banco em uso, sem precisar parar o servidor nem copiar manualmente os
  // arquivos -wal/-shm.
  await sqliteBackup(db, destination);
  console.log(`Backup criado em ${destination}`);

  applyRetention();
}

function applyRetention() {
  const retention = config.backupRetention;
  const files = fs
    .readdirSync(config.backupDir)
    .filter((name) => name.startsWith('casa-finance-') && name.endsWith('.db'))
    .map((name) => ({ name, full: path.join(config.backupDir, name) }))
    .sort((a, b) => fs.statSync(b.full).mtimeMs - fs.statSync(a.full).mtimeMs);

  const toRemove = files.slice(retention);
  for (const file of toRemove) {
    fs.unlinkSync(file.full);
    console.log(`Backup antigo removido: ${file.name}`);
  }
}

run().catch((err) => {
  console.error('Falha ao gerar backup:', err);
  process.exitCode = 1;
});
