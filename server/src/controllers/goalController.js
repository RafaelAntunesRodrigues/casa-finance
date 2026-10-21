import {
  createGoal,
  deleteGoal,
  listGoalsForMonth,
  setGoalStatus,
  updateGoal,
} from '../services/goalService.js';
import { goalInputSchema, goalQuerySchema, goalStatusSchema, parseOrThrow } from '../validation/schemas.js';
import { ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { currentMonth } from '../utils/dates.js';

export const list = asyncHandler(async (req, res) => {
  const { month } = parseOrThrow(goalQuerySchema, req.query, ValidationError);
  res.json(listGoalsForMonth(month || currentMonth()));
});

export const create = asyncHandler(async (req, res) => {
  const payload = parseOrThrow(goalInputSchema, req.body, ValidationError);
  const goal = createGoal({ ...payload, createdBy: req.session.userId });
  res.status(201).json(goal);
});

export const update = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const payload = parseOrThrow(goalInputSchema, req.body, ValidationError);
  res.json(updateGoal(id, payload));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { active } = parseOrThrow(goalStatusSchema, req.body, ValidationError);
  res.json(setGoalStatus(id, active));
});

export const remove = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  deleteGoal(id);
  res.status(204).end();
});
