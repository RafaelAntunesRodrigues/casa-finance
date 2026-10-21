import { UnauthorizedError } from '../utils/errors.js';

export function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next(new UnauthorizedError());
  }
  next();
}
