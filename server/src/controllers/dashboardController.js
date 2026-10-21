import { getDashboard } from '../services/dashboardService.js';
import { dashboardQuerySchema, parseOrThrow } from '../validation/schemas.js';
import { ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { currentMonth } from '../utils/dates.js';

export const show = asyncHandler(async (req, res) => {
  const { month } = parseOrThrow(dashboardQuerySchema, req.query, ValidationError);
  res.json(getDashboard(month || currentMonth()));
});
