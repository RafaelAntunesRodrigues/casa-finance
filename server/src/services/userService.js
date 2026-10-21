import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';

const SALT_ROUNDS = 12;

export function findUserByUsername(username) {
  return db
    .prepare('SELECT * FROM users WHERE username = ? AND active = 1')
    .get(username);
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function toPublicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, username: user.username };
}

export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compareSync(plainPassword, passwordHash);
}

export function hashPassword(plainPassword) {
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
}

export function createUser({ name, username, password }) {
  const passwordHash = hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (name, username, password_hash) VALUES (?, ?, ?)')
    .run(name, username, passwordHash);
  return findUserById(info.lastInsertRowid);
}

export function listUsers() {
  return db.prepare('SELECT id, name, username, active FROM users ORDER BY name').all();
}
