// ─── Dashboard & Reports Routes ─────────────────────────────────────────────
import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

// Org-wide stats (any authenticated user can see basic stats)
router.get('/stats', dashboardController.getStats);

// Admin-only stats & reports
router.get('/admin-stats', authorize('Administrator'), dashboardController.getAdminStats);
router.get('/utilization', authorize('Administrator', 'Asset Manager'), dashboardController.getUtilization);
router.get('/maintenance-frequency', authorize('Administrator', 'Asset Manager'), dashboardController.getMaintenanceFrequency);
router.get('/most-used', authorize('Administrator', 'Asset Manager'), dashboardController.getMostUsed);
router.get('/recent-activity', dashboardController.getRecentActivity);

// Employee personal dashboard
router.get('/employee-stats', dashboardController.getEmployeePersonalStats);
router.get('/employee-activity', dashboardController.getEmployeePersonalActivity);

export default router;
