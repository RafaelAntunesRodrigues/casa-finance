import {
  createCategory,
  listCategories,
  setCategoryStatus,
  updateCategory,
} from '../services/categoryService.js';
import {
  categoryInputSchema,
  categoryStatusSchema,
  categoryUpdateSchema,
  parseOrThrow,
} from '../validation/schemas.js';
import { ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  let active;
  if (req.query.active === 'true') active = true;
  if (req.query.active === 'false') active = false;
  const scope = req.query.scope === 'HOUSE' || req.query.scope === 'PERSONAL' ? req.query.scope : undefined;
  res.json(listCategories({ active, scope }));
});

export const create = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(categoryInputSchema, req.body, ValidationError);
  res.status(201).json(createCategory(payload));
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const payload = parseOrThrow(categoryUpdateSchema, req.body, ValidationError);
  res.json(updateCategory(id, payload));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { active } = parseOrThrow(categoryStatusSchema, req.body, ValidationError);
  res.json(setCategoryStatus(id, active));
});
