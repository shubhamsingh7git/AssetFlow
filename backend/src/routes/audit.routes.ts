// ─── Audit Routes ───────────────────────────────────────────────────────────
import { Router } from 'express';
import auditController from '../controllers/audit.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('Administrator', 'Asset Manager'));

router.get('/', auditController.getAll);
router.get('/:id', auditController.getById);
router.post('/', auditController.create);
router.patch('/:id/items/:itemId', auditController.updateItem);
router.patch('/:id/close', auditController.closeCycle);
router.get('/:id/discrepancy-report', auditController.getDiscrepancyReport);

export default router;
