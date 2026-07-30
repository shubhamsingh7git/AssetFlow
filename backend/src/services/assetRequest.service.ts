// ─── Asset Request Service ──────────────────────────────────────────────────
import assetRequestRepo from '../repositories/assetRequest.repository';
import assetRepo from '../repositories/asset.repository';
import userRepo from '../repositories/user.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import notificationRepo from '../repositories/notification.repository';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination } from '../utils/pagination';

class AssetRequestService {
  async createRequest(data: { assetId: string; reason?: string }, userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError('User not found', 404);

    const asset = await assetRepo.findById(data.assetId);
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.status !== 'AVAILABLE') {
      throw new AppError(`Asset "${asset.name}" (${asset.tag}) is currently ${asset.status.toLowerCase()} and cannot be requested`, 400);
    }

    const request = await assetRequestRepo.create({
      assetId: data.assetId,
      userId,
      reason: data.reason,
      organizationId: user.organizationId || undefined,
    });

    // Create activity log
    await activityLogRepo.create({
      action: 'ASSET_REQUESTED',
      targetResource: 'Asset',
      targetId: data.assetId,
      details: `Asset request submitted for ${asset.name} (${asset.tag}) by ${user.name}`,
      category: 'Approvals',
      userId,
      organizationId: user.organizationId || undefined,
    });

    // Send notification to Admin/Organization
    await notificationRepo.create({
      type: 'ASSET_REQUESTED',
      message: `Asset request from ${user.name} for ${asset.name} (${asset.tag})`,
      userId,
    });

    return request;
  }

  async getAllRequests(query: Record<string, any>, userOrgId?: string) {
    const { skip, take, orderBy } = parsePagination(query);
    const where: any = {};
    if (userOrgId) where.organizationId = userOrgId;
    if (query.status) where.status = query.status;
    return assetRequestRepo.findAll({ skip, take, where, orderBy: orderBy || { createdAt: 'desc' } });
  }

  async getMyRequests(userId: string) {
    const { data } = await assetRequestRepo.findAll({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return data;
  }

  async approveRequest(requestId: string, adminId: string) {
    try {
      const updated = await assetRequestRepo.approveRequest(requestId, adminId);

      // Create activity log
      await activityLogRepo.create({
        action: 'ASSET_APPROVED',
        targetResource: 'AssetRequest',
        targetId: requestId,
        details: `Asset request approved for ${updated.asset.name} (${updated.asset.tag}) - Allocated to ${updated.user.name}`,
        category: 'Approvals',
        userId: adminId,
      });

      // Send notification to employee
      await notificationRepo.create({
        type: 'ASSET_ASSIGNED',
        message: `Your request for asset ${updated.asset.name} (${updated.asset.tag}) has been approved!`,
        userId: updated.userId,
      });

      return updated;
    } catch (err: any) {
      throw new AppError(err.message || 'Failed to approve asset request', 400);
    }
  }

  async rejectRequest(requestId: string, adminId: string) {
    try {
      const updated = await assetRequestRepo.rejectRequest(requestId, adminId);

      // Create activity log
      await activityLogRepo.create({
        action: 'ASSET_REJECTED',
        targetResource: 'AssetRequest',
        targetId: requestId,
        details: `Asset request rejected for ${updated.asset.name} (${updated.asset.tag}) requested by ${updated.user.name}`,
        category: 'Approvals',
        userId: adminId,
      });

      // Send notification to employee
      await notificationRepo.create({
        type: 'ASSET_REJECTED',
        message: `Your request for asset ${updated.asset.name} (${updated.asset.tag}) has been rejected.`,
        userId: updated.userId,
      });

      return updated;
    } catch (err: any) {
      throw new AppError(err.message || 'Failed to reject asset request', 400);
    }
  }
}

export default new AssetRequestService();
