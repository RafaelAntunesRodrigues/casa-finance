import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { create, list, remove, update, updateStatus } from '../controllers/goalController.js';

const router = Router();

router.use(requireAuth);

router.get('/', list);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id/status', updateStatus);
router.delete('/:id', remove);

export default router;
