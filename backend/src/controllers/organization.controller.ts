// ─── Organization & Onboarding Controller ────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import organizationService from '../services/organization.service';
import { createOrganizationSchema, updateOrganizationSchema, updateOnboardingStatusSchema } from '../validators/organization.validator';
import { sendSuccess } from '../utils/response';
import authService from '../services/auth.service';

export class OrganizationController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createOrganizationSchema.parse(req.body);
      const result = await organizationService.createOrganization(req.user!.id, data);
      
      const profile = await authService.getProfile(req.user!.id);
      sendSuccess(res, { organization: result.organization, user: profile }, 'Organization created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getMine(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await organizationService.getOrganizationForUser(req.user!.id);
      sendSuccess(res, org, 'Organization details retrieved');
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateOrganizationSchema.parse(req.body);
      const org = await organizationService.updateOrganization(req.user!.id, data);
      sendSuccess(res, org, 'Organization updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await organizationService.getOnboardingStatus(req.user!.id);
      sendSuccess(res, status, 'Onboarding status retrieved');
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { step, completed } = updateOnboardingStatusSchema.parse(req.body);
      const status = await organizationService.updateOnboardingStatus(req.user!.id, step, completed);
      sendSuccess(res, status, 'Onboarding status updated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export default new OrganizationController();
