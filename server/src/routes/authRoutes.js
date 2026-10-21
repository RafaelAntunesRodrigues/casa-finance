import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimiter, login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
