// ─── Employee Controller ────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import employeeService from '../services/employee.service';
import { createEmployeeSchema, updateEmployeeSchema, resetEmployeePasswordSchema } from '../validators/employee.validator';
import { sendSuccess, sendPaginated } from '../utils/response';
import { getParam } from '../utils/params';
import prisma from '../config/database';

class EmployeeController {
  /**
   * POST /api/employees — Create employee account
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createEmployeeSchema.parse(req.body);
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const employee = await employeeService.createEmployee(data, adminUser);
      sendSuccess(res, employee, 'Employee account created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/employees — List employees with search, filters, pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      const result = await employeeService.listEmployees({
        search: req.query.search as string,
        department: req.query.department as string,
        role: req.query.role as string,
        status: req.query.status as string,
        page,
        limit,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        organizationId: req.user!.organizationId,
      });

      sendPaginated(res, result.data, result.total, result.page, result.limit, 'Employees retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/employees/:id — Get single employee
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getEmployeeById(getParam(req, 'id'));
      sendSuccess(res, employee);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/employees/:id/profile — Get employee profile with relations
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await employeeService.getEmployeeProfile(getParam(req, 'id'));
      sendSuccess(res, profile, 'Employee profile retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/employees/:id — Update employee
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateEmployeeSchema.parse(req.body);
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const employee = await employeeService.updateEmployee(getParam(req, 'id'), data, adminUser);
      sendSuccess(res, employee, 'Employee updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/employees/:id/reset-password — Reset employee password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = resetEmployeePasswordSchema.parse(req.body || {});
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const result = await employeeService.resetPassword(getParam(req, 'id'), data, adminUser);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/employees/:id/status — Toggle employee status
   */
  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const employee = await employeeService.toggleStatus(getParam(req, 'id'), adminUser);
      sendSuccess(res, employee, `Employee ${employee.status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/employees/:id/lock — Toggle employee lock state
   */
  async toggleLock(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const employee = await employeeService.toggleLock(getParam(req, 'id'), adminUser);
      sendSuccess(res, employee, `Employee ${employee.isLocked ? 'locked' : 'unlocked'}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/employees/:id — Soft delete employee
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const result = await employeeService.softDelete(getParam(req, 'id'), adminUser);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/employees/:id/resend-welcome — Resend welcome email
   */
  async resendWelcome(req: Request, res: Response, next: NextFunction) {
    try {
      const adminUser = {
        id: req.user!.id,
        organizationId: req.user!.organizationId,
      };
      const result = await employeeService.resendWelcomeEmail(getParam(req, 'id'), adminUser);
      sendSuccess(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/employees/me/profile — Self-service profile
   */
  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true, name: true, email: true, avatar: true, phone: true,
          designation: true, employmentType: true, joiningDate: true, employeeId: true,
          department: { select: { id: true, name: true } },
          role: { select: { id: true, name: true } },
          allocatedAssets: {
            where: { isActive: true },
            include: { asset: { select: { id: true, tag: true, name: true, category: { select: { name: true } } } } },
          },
          status: true, createdAt: true,
        },
      });
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/employees/me/profile — Update own phone/avatar
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, avatar } = req.body;
      const updated = await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          ...(phone !== undefined && { phone }),
          ...(avatar !== undefined && { avatar }),
        },
        select: { id: true, name: true, email: true, phone: true, avatar: true },
      });
      sendSuccess(res, updated, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }
}

export default new EmployeeController();
