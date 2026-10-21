import { findUserByUsername, findUserById, toPublicUser, verifyPassword } from '../services/userService.js';
import { loginSchema, parseOrThrow } from '../validation/schemas.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const { username, password } = parseOrThrow(loginSchema, req.body, ValidationError);

  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new UnauthorizedError('Usuário ou senha inválidos');
  }

  req.session.regenerate((err) => {
    if (err) throw err;
    req.session.userId = user.id;
    res.json({ user: toPublicUser(user) });
  });
});

export const logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('casafinance.sid');
    res.status(204).end();
  });
};

export const me = asyncHandler(async (req, res) => {
  const user = findUserById(req.session.userId);
  res.json({ user: toPublicUser(user) });
});
