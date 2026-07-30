// ─── Department Controller ──────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import departmentService from '../services/department.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/common.validator';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';

class DepartmentController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const { data, total } = await departmentService.getAll(req.query, req.user?.id);
      sendPaginated(res, data, total, page, limit);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const dept = await departmentService.getById(getParam(req, 'id'));
      sendSuccess(res, dept);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createDepartmentSchema.parse(req.body);
      const dept = await departmentService.create(data, req.user!.id);
      sendSuccess(res, dept, 'Department created', 201);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateDepartmentSchema.parse(req.body);
      const dept = await departmentService.update(getParam(req, 'id'), data, req.user!.id);
      sendSuccess(res, dept, 'Department updated');
    } catch (error) { next(error); }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const dept = await departmentService.toggleStatus(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, dept, 'Department status updated');
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await departmentService.delete(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, null, 'Department deleted');
    } catch (error) { next(error); }
  }
}

export default new DepartmentController();
