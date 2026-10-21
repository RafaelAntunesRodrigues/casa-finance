import { createInterface } from 'node:readline/promises';
import { createUser, findUserByUsername } from '../src/services/userService.js';

const MIN_PASSWORD_LENGTH = 8;

function askVisible(rl, query) {
  return rl.question(query);
}

function askHidden(query) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('NO_TTY'));
      return;
    }
    const stdin = process.stdin;
    process.stdout.write(query);
    let input = '';

    const onData = (char) => {
      const str = char.toString('utf8');
      if (str === '\n' || str === '\r' || str === '\u0004') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input);
        return;
      }
      if (str === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      }
      if (str === '\u007f' || str === '\b') {
        input = input.slice(0, -1);
        return;
      }
      input += str;
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    stdin.on('data', onData);
  });
}

async function resolveField({ rl, envValue, label, hidden }) {
  if (envValue && envValue.trim()) return envValue.trim();
  if (hidden) {
    try {
      return await askHidden(`${label}: `);
    } catch {
      throw new Error(
        `${label} não informado via variável de ambiente e o terminal atual não suporta entrada oculta interativa.`
      );
    }
  }
  return askVisible(rl, `${label}: `);
}

async function provisionUser(rl, index) {
  const envPrefix = `USER${index}_`;
  const name = await resolveField({
    rl,
    envValue: process.env[`${envPrefix}NAME`],
    label: `Nome completo do usuário ${index}`,
  });
  const username = await resolveField({
    rl,
    envValue: process.env[`${envPrefix}USERNAME`],
    label: `Usuário (login) ${index}`,
  });

  const existing = findUserByUsername(username);
  if (existing) {
    console.log(`→ Usuário '${username}' já existe. Ignorando criação.`);
    return;
  }

  let password = await resolveField({
    rl,
    envValue: process.env[`${envPrefix}PASSWORD`],
    label: `Senha para '${username}' (mín. ${MIN_PASSWORD_LENGTH} caracteres)`,
    hidden: true,
  });

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Senha de '${username}' precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const user = createUser({ name, username, password });
  password = null;
  console.log(`✓ Usuário criado: ${user.name} (${user.username}), id ${user.id}`);
}

async function run() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await provisionUser(rl, 1);
    await provisionUser(rl, 2);
  } finally {
    rl.close();
  }
}

run()
  .then(() => {
    console.log('Provisionamento de usuários concluído.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Erro ao provisionar usuários:', err.message);
    process.exit(1);
  });
