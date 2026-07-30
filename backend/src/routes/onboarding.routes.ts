// ─── Onboarding Routes ────────────────────────────────────────────────────────
import { Router } from 'express';
import organizationController from '../controllers/organization.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/status', organizationController.getStatus);
router.patch('/status', organizationController.updateStatus);

export default router;
