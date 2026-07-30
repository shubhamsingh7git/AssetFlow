// ─── User Routes ────────────────────────────────────────────────────────────
import { Router } from 'express';
import userController from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/', authorize('Administrator'), userController.getAll);
router.post('/', authorize('Administrator'), userController.create);
router.get('/:id', userController.getById);
router.patch('/:id', authorize('Administrator'), userController.update);
router.patch('/:id/role', authorize('Administrator'), userController.assignRole);
router.patch('/:id/status', authorize('Administrator'), userController.toggleStatus);
router.delete('/:id', authorize('Administrator'), userController.delete);

export default router;
