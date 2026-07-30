// ─── Category Routes ────────────────────────────────────────────────────────
import { Router } from 'express';
import categoryController from '../controllers/category.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('Administrator'));

router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.post('/', categoryController.create);
router.patch('/:id', categoryController.update);
router.delete('/:id', categoryController.delete);

export default router;
