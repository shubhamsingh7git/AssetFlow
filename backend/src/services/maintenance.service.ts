// ─── Maintenance Service ────────────────────────────────────────────────────
import maintenanceRepo from '../repositories/maintenance.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import notificationRepo from '../repositories/notification.repository';
import emailService from './email.service';
import prisma from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination } from '../utils/pagination';

class MaintenanceService {
  async getAll(query: Record<string, any>) {
    const { skip, take, orderBy } = parsePagination(query);
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.assetId) where.assetId = query.assetId;
    if (query.search) {
      where.OR = [
        { issue: { contains: query.search, mode: 'insensitive' } },
        { asset: { tag: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    return maintenanceRepo.findAll({ skip, take, where, orderBy });
  }

  async getById(id: string) {
    const ticket = await maintenanceRepo.findById(id);
    if (!ticket) throw new AppError('Maintenance request not found', 404);
    return ticket;
  }

  async create(data: any, userId: string) {
    const ticket = await maintenanceRepo.create({
      issue: data.issue,
      notes: data.notes,
      asset: { connect: { id: data.assetId } },
      requestedBy: { connect: { id: userId } },
    });

    await activityLogRepo.create({ action: 'MAINTENANCE_REQUESTED', targetResource: 'Maintenance', targetId: ticket.id, details: `Maintenance requested: "${data.issue}" for ${ticket.asset.tag}`, category: 'Alerts', userId });
    return ticket;
  }

  private async triggerEmailNotification(ticket: any) {
    try {
      const requester = await prisma.user.findUnique({ where: { id: ticket.requestedById } });
      if (!requester?.email) return;

      if (ticket.status === 'APPROVED') {
        emailService.sendMaintenanceApprovedEmail({
          to: requester.email,
          name: requester.name,
          assetTag: ticket.asset.tag,
          assetName: ticket.asset.name,
          issue: ticket.issue,
        }).catch((err) => console.error('[Email Dispatch Warning] Maintenance approved email failed:', err));
      } else if (ticket.status === 'TECHNICIAN_ASSIGNED') {
        emailService.sendMaintenanceTechnicianAssignedEmail({
          to: requester.email,
          name: requester.name,
          assetTag: ticket.asset.tag,
          assetName: ticket.asset.name,
          technicianName: ticket.technicianName || 'Support Technician',
        }).catch((err) => console.error('[Email Dispatch Warning] Technician assigned email failed:', err));
      } else if (ticket.status === 'RESOLVED') {
        emailService.sendMaintenanceResolvedEmail({
          to: requester.email,
          name: requester.name,
          assetTag: ticket.asset.tag,
          assetName: ticket.asset.name,
          resolutionNotes: ticket.notes || undefined,
        }).catch((err) => console.error('[Email Dispatch Warning] Maintenance resolved email failed:', err));
      }
    } catch (err) {
      console.error('[Email Dispatch Warning] Error fetching requester for maintenance email:', err);
    }
  }

  async advance(id: string, userId: string, technicianName?: string, notes?: string) {
    try {
      const ticket = await maintenanceRepo.advance(id, technicianName, notes);
      const statusLabel = ticket.status.toLowerCase().replace(/_/g, ' ');

      await activityLogRepo.create({ action: `MAINTENANCE_${ticket.status}`, targetResource: 'Maintenance', targetId: id, details: `Maintenance ticket ${ticket.asset.tag} advanced to: ${statusLabel}`, category: 'Alerts', userId });

      if (ticket.status === 'APPROVED') {
        await notificationRepo.create({ type: 'MAINTENANCE_APPROVED', message: `Maintenance request for ${ticket.asset.tag} has been approved`, userId: ticket.requestedById });
      } else if (ticket.status === 'RESOLVED') {
        await notificationRepo.create({ type: 'MAINTENANCE_RESOLVED', message: `Maintenance for ${ticket.asset.tag} has been resolved`, userId: ticket.requestedById });
      }

      this.triggerEmailNotification(ticket);

      return ticket;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(err.message || 'Failed to advance ticket', 400);
    }
  }

  async updateStatus(id: string, status: any, userId: string, technicianName?: string, notes?: string) {
    try {
      const ticket = await maintenanceRepo.updateStatus(id, status, technicianName, notes);
      const statusLabel = ticket.status.toLowerCase().replace(/_/g, ' ');

      await activityLogRepo.create({
        action: `MAINTENANCE_${ticket.status}`,
        targetResource: 'Maintenance',
        targetId: id,
        details: `Maintenance ticket for ${ticket.asset.tag} updated to: ${statusLabel}`,
        category: 'Alerts',
        userId,
      });

      if (ticket.status === 'APPROVED') {
        await notificationRepo.create({ type: 'MAINTENANCE_APPROVED', message: `Maintenance request for ${ticket.asset.tag} has been approved`, userId: ticket.requestedById });
      } else if (ticket.status === 'RESOLVED') {
        await notificationRepo.create({ type: 'MAINTENANCE_RESOLVED', message: `Maintenance for ${ticket.asset.tag} has been resolved`, userId: ticket.requestedById });
      }

      this.triggerEmailNotification(ticket);

      return ticket;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(err.message || 'Failed to update maintenance status', 400);
    }
  }

  async getMyTickets(userId: string) {
    const { data } = await maintenanceRepo.findAll({
      where: { requestedById: userId },
      orderBy: { createdAt: 'desc' },
    });
    return data;
  }

  async delete(id: string, userId: string) {
    try {
      const ticket = await maintenanceRepo.findById(id);
      if (!ticket) throw new AppError('Maintenance request not found', 404);
      const deleted = await maintenanceRepo.delete(id);

      await activityLogRepo.create({
        action: 'MAINTENANCE_DELETED',
        targetResource: 'Maintenance',
        targetId: id,
        details: `Maintenance ticket for ${ticket.asset?.tag || id} deleted`,
        category: 'Alerts',
        userId,
      });

      return deleted;
    } catch (err: any) {
      throw new AppError(err.message || 'Failed to delete maintenance ticket', 400);
    }
  }
}

export default new MaintenanceService();
