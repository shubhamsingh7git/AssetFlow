// ─── Organization Routes ──────────────────────────────────────────────────────
import { Router } from 'express';
import organizationController from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.post('/', organizationController.create);
router.get('/mine', organizationController.getMine);
router.patch('/mine', organizationController.update);

export default router;
