import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { create, list, update, updateStatus } from '../controllers/categoryController.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/status', updateStatus);

export default router;
