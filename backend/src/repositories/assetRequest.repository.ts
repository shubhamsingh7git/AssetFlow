// ─── Asset Request Repository ───────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma, RequestStatus } from '@prisma/client';

class AssetRequestRepository {
  async create(data: { assetId: string; userId: string; reason?: string; organizationId?: string }) {
    return prisma.assetRequest.create({
      data: {
        assetId: data.assetId,
        userId: data.userId,
        reason: data.reason,
        organizationId: data.organizationId,
        status: RequestStatus.PENDING,
      },
      include: {
        asset: { include: { category: true } },
        user: { select: { id: true, name: true, email: true, department: true } },
      },
    });
  }

  async findAll(params: { skip?: number; take?: number; where?: Prisma.AssetRequestWhereInput; orderBy?: Prisma.AssetRequestOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.assetRequest.findMany({
        ...params,
        include: {
          asset: { include: { category: true } },
          user: { select: { id: true, name: true, email: true, department: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.assetRequest.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.assetRequest.findUnique({
      where: { id },
      include: {
        asset: { include: { category: true } },
        user: { select: { id: true, name: true, email: true, department: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
  }

  async approveRequest(requestId: string, adminId: string) {
    return prisma.$transaction(async (tx) => {
      const req = await tx.assetRequest.findUnique({
        where: { id: requestId },
        include: { asset: true, user: true },
      });
      if (!req) throw new Error('Asset request not found');
      if (req.status !== 'PENDING') throw new Error(`Request has already been ${req.status.toLowerCase()}`);

      // Verify asset is still available
      const asset = await tx.asset.findUnique({ where: { id: req.assetId } });
      if (!asset) throw new Error('Asset not found');
      if (asset.status !== 'AVAILABLE') throw new Error(`Cannot approve request: Asset status is ${asset.status}`);

      // 1. Update AssetRequest status
      const updatedReq = await tx.assetRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', approvedById: adminId },
        include: { asset: true, user: { select: { id: true, name: true, email: true } } },
      });

      // 2. Create AssetAllocation
      await tx.assetAllocation.create({
        data: { assetId: req.assetId, userId: req.userId, isActive: true },
      });

      // 3. Update Asset status and allocatedToId
      await tx.asset.update({
        where: { id: req.assetId },
        data: { status: 'ALLOCATED', allocatedToId: req.userId },
      });

      // 4. Record AssetHistory
      await tx.assetHistory.create({
        data: {
          assetId: req.assetId,
          event: `Request approved — Allocated to ${req.user.name}`,
          userId: adminId,
        },
      });

      return updatedReq;
    });
  }

  async rejectRequest(requestId: string, adminId: string) {
    const req = await prisma.assetRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new Error('Asset request not found');
    if (req.status !== 'PENDING') throw new Error(`Request has already been ${req.status.toLowerCase()}`);

    return prisma.assetRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', approvedById: adminId },
      include: { asset: true, user: { select: { id: true, name: true, email: true } } },
    });
  }

  async countPending(organizationId?: string) {
    const where: any = { status: RequestStatus.PENDING };
    if (organizationId) where.organizationId = organizationId;
    return prisma.assetRequest.count({ where });
  }
}

export default new AssetRequestRepository();
