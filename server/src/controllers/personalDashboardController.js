import { getPersonalDashboard } from '../services/personalDashboardService.js';
import { parseOrThrow, personalDashboardQuerySchema } from '../validation/schemas.js';
import { ValidationError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { currentMonth } from '../utils/dates.js';

export const show = asyncHandler(async (req, res) => {
  const { month } = parseOrThrow(personalDashboardQuerySchema, req.query, ValidationError);
  res.json(getPersonalDashboard(req.ownerId, month || currentMonth()));
});
