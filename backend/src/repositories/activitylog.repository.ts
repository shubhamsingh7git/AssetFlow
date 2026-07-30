// ─── Activity Log Repository ────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

class ActivityLogRepository {
  async findAll(params: { skip?: number; take?: number; where?: Prisma.ActivityLogWhereInput; orderBy?: Prisma.ActivityLogOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.activityLog.findMany({ ...params, include: { user: { select: { id: true, name: true, email: true } } } }),
      prisma.activityLog.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async create(data: { action: string; targetResource?: string; targetId?: string; details?: string; category?: string; userId: string; organizationId?: string }) {
    return prisma.activityLog.create({ data, include: { user: { select: { id: true, name: true } } } });
  }
}

export default new ActivityLogRepository();
