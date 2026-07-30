// ─── Employee Routes ────────────────────────────────────────────────────────
import { Router } from 'express';
import employeeController from '../controllers/employee.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// ─── Self-service (any authenticated user) ──────────────────────────────────
router.get('/me/profile', employeeController.getMyProfile);
router.patch('/me/profile', employeeController.updateMyProfile);

// ─── Admin-only employee management ─────────────────────────────────────────
router.post('/', authorize('Administrator'), employeeController.create);
router.get('/', authorize('Administrator'), employeeController.getAll);
router.get('/:id', authorize('Administrator'), employeeController.getById);
router.get('/:id/profile', authorize('Administrator'), employeeController.getProfile);
router.patch('/:id', authorize('Administrator'), employeeController.update);
router.patch('/:id/reset-password', authorize('Administrator'), employeeController.resetPassword);
router.post('/:id/resend-welcome', authorize('Administrator'), employeeController.resendWelcome);
router.patch('/:id/status', authorize('Administrator'), employeeController.toggleStatus);
router.patch('/:id/lock', authorize('Administrator'), employeeController.toggleLock);
router.delete('/:id', authorize('Administrator'), employeeController.delete);

export default router;
