// ─── Allocation & Transfer Routes ───────────────────────────────────────────
import { Router } from 'express';
import allocationController from '../controllers/allocation.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Employee: own transfers
router.get('/my-transfers', allocationController.getMyTransfers);
router.post('/transfer-request', allocationController.createEmployeeTransferRequest);

// Allocations (Admin only)
router.post('/', authorize('Administrator', 'Asset Manager'), allocationController.allocate);
router.post('/:id/return', allocationController.returnAsset);
router.get('/history/:assetId', allocationController.getHistory);

// Transfers (Admin)
router.post('/transfers', allocationController.createTransfer);
router.get('/transfers', authorize('Administrator', 'Asset Manager', 'Department Head'), allocationController.getTransfers);
router.patch('/transfers/:id/approve', authorize('Administrator', 'Asset Manager', 'Department Head'), allocationController.approveTransfer);
router.patch('/transfers/:id/reject', authorize('Administrator', 'Asset Manager', 'Department Head'), allocationController.rejectTransfer);

export default router;
