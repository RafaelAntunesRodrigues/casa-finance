import { listUsers } from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  res.json(listUsers().filter((u) => u.active));
});
