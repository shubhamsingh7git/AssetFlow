// ─── Department Repository ──────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

class DepartmentRepository {
  async findAll(params: { skip?: number; take?: number; where?: Prisma.DepartmentWhereInput; orderBy?: Prisma.DepartmentOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.department.findMany({
        ...params,
        include: { head: { include: { role: true } }, parent: true, children: true, _count: { select: { employees: true } } },
      }),
      prisma.department.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.department.findUnique({
      where: { id },
      include: { head: { include: { role: true } }, parent: true, children: true, employees: { include: { role: true } }, _count: { select: { employees: true } } },
    });
  }

  async findByName(name: string, organizationId?: string) {
    return prisma.department.findFirst({
      where: {
        name,
        ...(organizationId ? { organizationId } : {}),
      },
    });
  }

  async create(data: Prisma.DepartmentCreateInput) {
    return prisma.department.create({ data, include: { head: true, parent: true, _count: { select: { employees: true } } } });
  }

  async update(id: string, data: Prisma.DepartmentUpdateInput) {
    return prisma.department.update({ where: { id }, data, include: { head: true, parent: true, _count: { select: { employees: true } } } });
  }

  async delete(id: string) {
    return prisma.department.delete({ where: { id } });
  }

  async count() { return prisma.department.count(); }
}

export default new DepartmentRepository();
