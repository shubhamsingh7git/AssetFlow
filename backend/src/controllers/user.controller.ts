// ─── User Controller ────────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import userRepository from '../repositories/user.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';
import { updateUserSchema, assignRoleSchema } from '../validators/common.validator';
import { AppError } from '../middlewares/errorHandler';
import prisma from '../config/database';
import { hashPassword } from '../utils/password';

class UserController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { skip, take, orderBy, page, limit } = parsePagination(req.query as any);
      const currentUser = await userRepository.findById(req.user!.id);
      const where: any = {};
      
      if (currentUser?.organizationId) {
        where.organizationId = currentUser.organizationId;
      }

      const search = req.query.search as string;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (req.query.department && req.query.department !== 'All') where.department = { name: req.query.department };
      if (req.query.role && req.query.role !== 'All') where.role = { name: req.query.role };
      if (req.query.status && req.query.status !== 'All') where.status = req.query.status;

      const { data, total } = await userRepository.findAll({ skip, take, where, orderBy });
      const sanitized = data.map((u: any) => {
        const { password, refreshToken, ...safe } = u;
        return safe;
      });
      sendPaginated(res, sanitized, total, page, limit);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, departmentId, department, roleName, role, status } = req.body;
      if (!name || !email) {
        throw new AppError('Name and email are required', 400);
      }

      const existing = await userRepository.findByEmail(email);
      if (existing) throw new AppError('An account with this email already exists', 409);

      const currentUser = await userRepository.findById(req.user!.id);
      const orgId = currentUser?.organizationId;

      let targetRoleName = roleName || role || 'Employee';
      let userRole = await userRepository.getRoleByName(targetRoleName);
      if (!userRole) {
        userRole = await userRepository.getRoleByName('Employee');
      }

      let deptId = departmentId;
      if (!deptId && department) {
        const foundDept = await prisma.department.findFirst({
          where: { name: department, ...(orgId ? { organizationId: orgId } : {}) },
        });
        if (foundDept) deptId = foundDept.id;
      }

      const hashedPassword = await hashPassword(password || 'Employee@123');
      const newUser = await userRepository.create({
        name,
        email,
        password: hashedPassword,
        status: status || 'ACTIVE',
        provider: 'local',
        role: { connect: { id: userRole!.id } },
        ...(deptId ? { department: { connect: { id: deptId } } } : {}),
        ...(orgId ? { organization: { connect: { id: orgId } } } : {}),
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      });

      const { password: _, refreshToken: __, ...safe } = newUser as any;
      sendSuccess(res, safe, 'Employee created successfully', 201);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userRepository.findById(getParam(req, 'id'));
      if (!user) throw new AppError('User not found', 404);
      const { password, refreshToken, ...safe } = user;
      sendSuccess(res, safe);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateUserSchema.parse(req.body);
      const user = await userRepository.update(getParam(req, 'id'), data as any);
      const { password, refreshToken, ...safe } = user;
      sendSuccess(res, safe, 'User updated');
    } catch (error) { next(error); }
  }

  async assignRole(req: Request, res: Response, next: NextFunction) {
    try {
      const data = assignRoleSchema.parse(req.body);
      let roleId = data.roleId;
      if (!roleId && data.roleName) {
        const role = await userRepository.getRoleByName(data.roleName);
        if (!role) throw new AppError('Role not found', 404);
        roleId = role.id;
      }

      const user = await userRepository.update(getParam(req, 'id'), { role: { connect: { id: roleId! } } });
      const { password, refreshToken, ...safe } = user;
      await activityLogRepo.create({ action: 'ROLE_ASSIGNED', targetResource: 'User', targetId: user.id, details: `Role assigned: ${user.name} updated to ${user.role.name}`, category: 'Approvals', userId: req.user!.id });
      sendSuccess(res, safe, 'Role assigned successfully');
    } catch (error) { next(error); }
  }

  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getParam(req, 'id');
      const user = await userRepository.findById(id);
      if (!user) throw new AppError('User not found', 404);
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const updated = await userRepository.update(id, { status: newStatus });
      const { password, refreshToken, ...safe } = updated;
      sendSuccess(res, safe, `User ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`);
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await userRepository.delete(getParam(req, 'id'));
      sendSuccess(res, null, 'User deleted');
    } catch (error) { next(error); }
  }
}

export default new UserController();
