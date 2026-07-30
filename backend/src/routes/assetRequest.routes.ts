// ─── Asset Request Routes ───────────────────────────────────────────────────
import { Router } from 'express';
import assetRequestController from '../controllers/assetRequest.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Employee: submit request & view own requests
router.post('/', assetRequestController.create);
router.get('/my-requests', assetRequestController.getMyRequests);

// Admin / Manager: view all requests & approve/reject
router.get('/', authorize('Administrator', 'Asset Manager', 'Department Head'), assetRequestController.getAll);
router.patch('/:id/approve', authorize('Administrator', 'Asset Manager', 'Department Head'), assetRequestController.approve);
router.patch('/:id/reject', authorize('Administrator', 'Asset Manager', 'Department Head'), assetRequestController.reject);

export default router;
