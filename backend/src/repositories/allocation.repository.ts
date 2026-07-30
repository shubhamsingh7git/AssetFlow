// ─── Allocation & Transfer Repository ───────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

class AllocationRepository {
  async allocate(data: { assetId: string; userId: string }) {
    return prisma.$transaction(async (tx) => {
      // Check if asset is already allocated
      const existing = await tx.assetAllocation.findFirst({ where: { assetId: data.assetId, isActive: true } });
      if (existing) throw new Error('Asset is already allocated');

      // Check asset status
      const asset = await tx.asset.findUnique({ where: { id: data.assetId } });
      if (!asset) throw new Error('Asset not found');
      if (asset.status !== 'AVAILABLE') {
        throw new Error(`Cannot allocate asset with status: ${asset.status}. Only AVAILABLE assets can be allocated.`);
      }

      const allocation = await tx.assetAllocation.create({ data: { assetId: data.assetId, userId: data.userId, isActive: true }, include: { asset: true, user: { select: { id: true, name: true, email: true } } } });
      await tx.asset.update({ where: { id: data.assetId }, data: { status: 'ALLOCATED', allocatedToId: data.userId } });
      await tx.assetHistory.create({ data: { assetId: data.assetId, event: `Allocated to ${allocation.user.name}`, userId: data.userId } });
      return allocation;
    });
  }

  async returnAsset(assetId: string, condition?: string) {
    return prisma.$transaction(async (tx) => {
      const allocation = await tx.assetAllocation.findFirst({ where: { assetId, isActive: true }, include: { user: true, asset: true } });
      if (!allocation) throw new Error('No active allocation found for this asset');

      await tx.assetAllocation.update({ where: { id: allocation.id }, data: { isActive: false, returnedAt: new Date(), returnCondition: condition || 'good' } });
      await tx.asset.update({ where: { id: assetId }, data: { status: 'AVAILABLE', allocatedToId: null } });
      await tx.assetHistory.create({ data: { assetId, event: `Returned by ${allocation.user.name} - condition: ${condition || 'good'}`, userId: allocation.userId } });
      return allocation;
    });
  }

  async getHistoryByAsset(assetId: string) {
    return prisma.assetAllocation.findMany({ where: { assetId }, orderBy: { allocatedAt: 'desc' }, include: { user: { select: { id: true, name: true, email: true } } } });
  }

  // ─── Transfers ────────────────────────────────────────────────────────────
  async createTransfer(data: { assetId: string; fromUserId: string; toUserId: string; reason?: string }) {
    return prisma.transferRequest.create({ data: { ...data, status: 'REQUESTED' }, include: { asset: true, fromUser: { select: { id: true, name: true, email: true } }, toUser: { select: { id: true, name: true, email: true } } } });
  }

  async findTransfers(params: { skip?: number; take?: number; where?: Prisma.TransferRequestWhereInput; orderBy?: Prisma.TransferRequestOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.transferRequest.findMany({ ...params, include: { asset: true, fromUser: { select: { id: true, name: true, email: true } }, toUser: { select: { id: true, name: true, email: true } }, approvedBy: { select: { id: true, name: true, email: true } } } }),
      prisma.transferRequest.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async approveTransfer(transferId: string, approverId: string, newStatus: string) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transferRequest.findUnique({ where: { id: transferId }, include: { asset: true } });
      if (!transfer) throw new Error('Transfer request not found');

      const updated = await tx.transferRequest.update({ where: { id: transferId }, data: { status: newStatus as any, approvedById: approverId }, include: { asset: true, fromUser: { select: { id: true, name: true, email: true } }, toUser: { select: { id: true, name: true, email: true } } } });

      // If final approval, execute the transfer
      if (newStatus === 'TRANSFERRED') {
        // Return from current user
        const activeAlloc = await tx.assetAllocation.findFirst({ where: { assetId: transfer.assetId, isActive: true } });
        if (activeAlloc) {
          await tx.assetAllocation.update({ where: { id: activeAlloc.id }, data: { isActive: false, returnedAt: new Date(), returnCondition: 'transferred' } });
        }
        // Allocate to new user
        await tx.assetAllocation.create({ data: { assetId: transfer.assetId, userId: transfer.toUserId, isActive: true } });
        await tx.asset.update({ where: { id: transfer.assetId }, data: { allocatedToId: transfer.toUserId, status: 'ALLOCATED' } });
        await tx.assetHistory.create({ data: { assetId: transfer.assetId, event: `Transferred from ${updated.fromUser.name} to ${updated.toUser.name}`, userId: approverId } });
      }

      return updated;
    });
  }

  async rejectTransfer(transferId: string, approverId: string) {
    return prisma.transferRequest.update({ where: { id: transferId }, data: { status: 'REJECTED', approvedById: approverId }, include: { asset: true, fromUser: { select: { id: true, name: true } }, toUser: { select: { id: true, name: true } } } });
  }

  async countPendingTransfers() {
    return prisma.transferRequest.count({ where: { status: { in: ['REQUESTED', 'DEPT_HEAD_APPROVED'] } } });
  }
}

export default new AllocationRepository();
