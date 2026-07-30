// ─── Maintenance Routes ─────────────────────────────────────────────────────
import { Router } from 'express';
import maintenanceController from '../controllers/maintenance.controller';
import { authenticate, authorize } from '../middlewares/auth';
import { uploadImage } from '../middlewares/upload';

const router = Router();

router.use(authenticate);

// Employee: own tickets + create
router.get('/my-tickets', maintenanceController.getMyTickets);
router.post('/', maintenanceController.create);
router.post('/:id/image', uploadImage.single('image'), maintenanceController.uploadImage);

// Admin: all tickets + advance/update status/delete
router.get('/', authorize('Administrator', 'Asset Manager', 'Employee', 'Department Head'), maintenanceController.getAll);
router.get('/:id', maintenanceController.getById);

// Support both PATCH and PUT for advance & status
router.patch('/:id/advance', authorize('Administrator', 'Asset Manager'), maintenanceController.advance);
router.put('/:id/advance', authorize('Administrator', 'Asset Manager'), maintenanceController.advance);

router.patch('/:id/status', authorize('Administrator', 'Asset Manager', 'Department Head'), maintenanceController.updateStatus);
router.put('/:id/status', authorize('Administrator', 'Asset Manager', 'Department Head'), maintenanceController.updateStatus);

router.patch('/:id', authorize('Administrator', 'Asset Manager', 'Department Head'), maintenanceController.updateStatus);
router.put('/:id', authorize('Administrator', 'Asset Manager', 'Department Head'), maintenanceController.updateStatus);

router.delete('/:id', authorize('Administrator', 'Asset Manager'), maintenanceController.delete);

export default router;
