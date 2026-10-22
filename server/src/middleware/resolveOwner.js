import { findUserById } from '../services/userService.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/** Valida o :ownerId da URL e expõe o id numérico em req.ownerId. */
export function resolveOwner(req, res, next) {
  const ownerId = Number(req.params.ownerId);
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    return next(new ValidationError('Usuário inválido', { ownerId: 'invalid' }));
  }
  const owner = findUserById(ownerId);
  if (!owner || !owner.active) {
    return next(new NotFoundError('Usuário não encontrado'));
  }
  req.ownerId = ownerId;
  next();
}
