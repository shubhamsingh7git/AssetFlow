// ─── Dashboard Controller ───────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import dashboardService from '../services/dashboard.service';
import { sendSuccess } from '../utils/response';

class DashboardController {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getEmployeeStats(req.user?.id);
      sendSuccess(res, stats);
    } catch (error) { next(error); }
  }

  async getAdminStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getAdminStats(req.user?.id);
      sendSuccess(res, stats);
    } catch (error) { next(error); }
  }

  async getUtilization(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getUtilizationByDepartment(req.user?.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  async getMaintenanceFrequency(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getMaintenanceFrequency(req.user?.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  async getMostUsed(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getMostUsedAssets(req.user?.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await dashboardService.getRecentActivity(req.user?.id, limit);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  async getEmployeePersonalStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getEmployeePersonalStats(req.user!.id);
      sendSuccess(res, stats);
    } catch (error) { next(error); }
  }

  async getEmployeePersonalActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const data = await dashboardService.getEmployeePersonalActivity(req.user!.id, limit);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }
}

export default new DashboardController();
