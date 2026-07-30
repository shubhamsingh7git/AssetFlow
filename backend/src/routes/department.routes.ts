// ─── Department Routes ──────────────────────────────────────────────────────
import { Router } from 'express';
import departmentController from '../controllers/department.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('Administrator'));

router.get('/', departmentController.getAll);
router.get('/:id', departmentController.getById);
router.post('/', departmentController.create);
router.patch('/:id', departmentController.update);
router.patch('/:id/status', departmentController.toggleStatus);
router.delete('/:id', departmentController.delete);

export default router;
