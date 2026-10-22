import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { resolveOwner } from '../middleware/resolveOwner.js';
import { show as showDashboard } from '../controllers/personalDashboardController.js';
import {
  create,
  createFixed,
  exportCsv,
  getOne,
  list,
  listFixed,
  remove,
  removeFixed,
  update,
  updateFixedStatus,
} from '../controllers/personalTransactionController.js';

const router = Router();

router.use(requireAuth);
router.use('/:ownerId', resolveOwner);

router.get('/:ownerId/dashboard', showDashboard);

router.get('/:ownerId/transactions/export.csv', exportCsv);
router.get('/:ownerId/transactions', list);
router.post('/:ownerId/transactions', create);
router.get('/:ownerId/transactions/:id', getOne);
router.put('/:ownerId/transactions/:id', update);
router.delete('/:ownerId/transactions/:id', remove);

router.get('/:ownerId/fixed-expenses', listFixed);
router.post('/:ownerId/fixed-expenses', createFixed);
router.patch('/:ownerId/fixed-expenses/:id/status', updateFixedStatus);
router.delete('/:ownerId/fixed-expenses/:id', removeFixed);

export default router;
