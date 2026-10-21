import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  create,
  exportCsv,
  getOne,
  list,
  remove,
  update,
} from '../controllers/transactionController.js';

const router = Router();

router.use(requireAuth);

router.get('/export.csv', exportCsv);
router.get('/', list);
router.post('/', create);
router.get('/:id', getOne);
router.put('/:id', update);
router.delete('/:id', remove);

export default router;
