import prisma from '../config/database';
import { MaintenanceStatus, Prisma } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';

class MaintenanceRepository {
  async findAll(params: { skip?: number; take?: number; where?: Prisma.MaintenanceRequestWhereInput; orderBy?: Prisma.MaintenanceRequestOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({ ...params, include: { asset: { select: { id: true, tag: true, name: true } }, requestedBy: { select: { id: true, name: true } } } }),
      prisma.maintenanceRequest.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.maintenanceRequest.findUnique({ where: { id }, include: { asset: true, requestedBy: { select: { id: true, name: true } } } });
  }

  async create(data: Prisma.MaintenanceRequestCreateInput) {
    return prisma.maintenanceRequest.create({ data, include: { asset: { select: { id: true, tag: true, name: true } }, requestedBy: { select: { id: true, name: true } } } });
  }

  async advance(id: string, technicianName?: string, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.maintenanceRequest.findUnique({ where: { id }, include: { asset: true } });
      if (!ticket) {
        throw new AppError('Maintenance ticket not found.', 404, 'No maintenance request record matches the provided ID.', 'id');
      }

      const statusFlow: Record<string, MaintenanceStatus> = {
        PENDING: 'APPROVED',
        APPROVED: 'TECHNICIAN_ASSIGNED',
        TECHNICIAN_ASSIGNED: 'IN_PROGRESS',
        IN_PROGRESS: 'RESOLVED',
      };

      const nextStatus = statusFlow[ticket.status];
      if (!nextStatus) {
        throw new AppError(
          'Cannot advance maintenance ticket.',
          400,
          `Current status ${ticket.status} has no next state. Ticket is already RESOLVED.`,
          'status'
        );
      }

      const updateData: any = { status: nextStatus };
      if (nextStatus === 'TECHNICIAN_ASSIGNED' && technicianName) updateData.technicianName = technicianName;
      if (nextStatus === 'RESOLVED') updateData.resolvedAt = new Date();
      if (notes) updateData.notes = notes;

      const updated = await tx.maintenanceRequest.update({ where: { id }, data: updateData, include: { asset: { select: { id: true, tag: true, name: true } }, requestedBy: { select: { id: true, name: true } } } });

      // Business rules: update asset status
      if (['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'].includes(nextStatus)) {
        await tx.asset.update({ where: { id: ticket.assetId }, data: { status: 'MAINTENANCE' } });
      } else if (nextStatus === 'RESOLVED') {
        await tx.asset.update({ where: { id: ticket.assetId }, data: { status: 'AVAILABLE' } });
      }

      await tx.assetHistory.create({ data: { assetId: ticket.assetId, event: `Maintenance ${nextStatus.toLowerCase().replace(/_/g, ' ')}` } });

      return updated;
    });
  }

  async updateStatus(id: string, newStatus: MaintenanceStatus, technicianName?: string, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.maintenanceRequest.findUnique({ where: { id }, include: { asset: true } });
      if (!ticket) {
        throw new AppError('Maintenance ticket not found.', 404, 'No maintenance request record matches the provided ID.', 'id');
      }

      // Validate transition sequence
      const validTransitions: Record<string, string[]> = {
        PENDING: ['APPROVED', 'RESOLVED'],
        APPROVED: ['TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
        TECHNICIAN_ASSIGNED: ['IN_PROGRESS', 'RESOLVED'],
        IN_PROGRESS: ['RESOLVED'],
        RESOLVED: ['IN_PROGRESS', 'RESOLVED'],
      };

      if (validTransitions[ticket.status] && !validTransitions[ticket.status].includes(newStatus)) {
        throw new AppError(
          'Invalid status transition.',
          400,
          `Cannot transition maintenance status from ${ticket.status} to ${newStatus}.`,
          'status'
        );
      }

      const updateData: any = { status: newStatus };
      if (technicianName) updateData.technicianName = technicianName;
      if (newStatus === 'RESOLVED') updateData.resolvedAt = new Date();
      if (notes) updateData.notes = notes;

      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: updateData,
        include: { asset: { select: { id: true, tag: true, name: true } }, requestedBy: { select: { id: true, name: true } } },
      });

      // Update Asset Status based on Maintenance status
      if (['APPROVED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS'].includes(newStatus)) {
        await tx.asset.update({ where: { id: ticket.assetId }, data: { status: 'MAINTENANCE' } });
      } else if (newStatus === 'RESOLVED') {
        await tx.asset.update({ where: { id: ticket.assetId }, data: { status: 'AVAILABLE' } });
      }

      await tx.assetHistory.create({
        data: { assetId: ticket.assetId, event: `Maintenance status updated to ${newStatus.toLowerCase().replace(/_/g, ' ')}` },
      });

      return updated;
    });
  }

  async delete(id: string) {
    return prisma.maintenanceRequest.delete({
      where: { id },
      include: { asset: { select: { id: true, tag: true, name: true } } },
    });
  }

  async countToday() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return prisma.maintenanceRequest.count({ where: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'RESOLVED' } } });
  }
}

export default new MaintenanceRepository();
