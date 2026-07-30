// ─── Department Service ─────────────────────────────────────────────────────
import departmentRepo from '../repositories/department.repository';
import userRepo from '../repositories/user.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination } from '../utils/pagination';

class DepartmentService {
  async getAll(query: Record<string, any>, userId?: string) {
    const { skip, take, orderBy } = parsePagination(query);
    const where: any = {};
    if (userId) {
      const user = await userRepo.findById(userId);
      if (user?.organizationId) {
        where.organizationId = user.organizationId;
      }
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = query.status;
    return departmentRepo.findAll({ skip, take, where, orderBy });
  }

  async getById(id: string) {
    const dept = await departmentRepo.findById(id);
    if (!dept) throw new AppError('Department not found', 404);
    return dept;
  }

  async create(data: any, userId: string) {
    const user = await userRepo.findById(userId);
    const orgId = user?.organizationId || data.organizationId;
    const existing = await departmentRepo.findByName(data.name, orgId || undefined);
    if (existing) throw new AppError('Department name already exists in this organization', 409);

    const createData: any = { name: data.name, description: data.description, status: data.status || 'ACTIVE' };
    if (orgId) createData.organization = { connect: { id: orgId } };
    if (data.parentId) createData.parent = { connect: { id: data.parentId } };
    if (data.headId) createData.head = { connect: { id: data.headId } };

    const dept = await departmentRepo.create(createData);
    await activityLogRepo.create({ action: 'DEPARTMENT_CREATED', targetResource: 'Department', targetId: dept.id, details: `Department "${dept.name}" created`, category: 'Approvals', userId });
    return dept;
  }

  async update(id: string, data: any, userId: string) {
    const dept = await departmentRepo.findById(id);
    if (!dept) throw new AppError('Department not found', 404);

    if (data.name && data.name !== dept.name) {
      const existing = await departmentRepo.findByName(data.name);
      if (existing) throw new AppError('Department name already exists', 409);
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.parentId !== undefined) updateData.parent = data.parentId ? { connect: { id: data.parentId } } : { disconnect: true };
    if (data.headId !== undefined) updateData.head = data.headId ? { connect: { id: data.headId } } : { disconnect: true };

    const updated = await departmentRepo.update(id, updateData);
    await activityLogRepo.create({ action: 'DEPARTMENT_UPDATED', targetResource: 'Department', targetId: id, details: `Department "${updated.name}" updated`, category: 'Approvals', userId });
    return updated;
  }

  async toggleStatus(id: string, userId: string) {
    const dept = await departmentRepo.findById(id);
    if (!dept) throw new AppError('Department not found', 404);
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await departmentRepo.update(id, { status: newStatus });
    await activityLogRepo.create({ action: 'DEPARTMENT_STATUS_CHANGED', targetResource: 'Department', targetId: id, details: `Department "${dept.name}" set to ${newStatus}`, category: 'Approvals', userId });
    return updated;
  }

  async delete(id: string, userId: string) {
    const dept = await departmentRepo.findById(id);
    if (!dept) throw new AppError('Department not found', 404);
    if (dept._count.employees > 0) throw new AppError('Cannot delete department with employees. Reassign employees first.', 400);
    await departmentRepo.delete(id);
    await activityLogRepo.create({ action: 'DEPARTMENT_DELETED', targetResource: 'Department', targetId: id, details: `Department "${dept.name}" deleted`, category: 'Approvals', userId });
  }
}

export default new DepartmentService();
