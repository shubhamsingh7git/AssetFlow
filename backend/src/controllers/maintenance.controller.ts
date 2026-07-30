// ─── Maintenance Controller ─────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import maintenanceService from '../services/maintenance.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { createMaintenanceSchema, advanceMaintenanceSchema } from '../validators/common.validator';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';
import { uploadToCloudinary } from '../middlewares/upload';
import prisma from '../config/database';

class MaintenanceController {
  private logRequest = (req: Request, details?: string) => {
    console.log(
      `[MAINTENANCE REQ] Method: ${req.method} | Path: ${req.originalUrl} | User: ${req.user?.email || req.user?.id} (${req.user?.role}) | Org: ${req.user?.organizationId || 'N/A'}${details ? ` | ${details}` : ''}`
    );
  };

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.logRequest(req);
      const { page, limit } = parsePagination(req.query as any);
      const { data, total } = await maintenanceService.getAll(req.query);
      console.log(`[MAINTENANCE RES] Returning ${data.length} tickets (Total: ${total}) | Status: 200 OK`);
      sendPaginated(res, data, total, page, limit);
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req, 'id');
      this.logRequest(req, `TicketID: ${id}`);
      const ticket = await maintenanceService.getById(id);
      console.log(`[MAINTENANCE RES] Returned ticket ${id} | Status: 200 OK`);
      sendSuccess(res, ticket);
    } catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.logRequest(req, `AssetID: ${req.body?.assetId}`);
      const data = createMaintenanceSchema.parse(req.body);
      const ticket = await maintenanceService.create(data, req.user!.id);
      console.log(`[MAINTENANCE RES] Created ticket ${ticket.id} | Status: 201 Created`);
      sendSuccess(res, ticket, 'Maintenance request created', 201);
    } catch (error) { next(error); }
  };

  advance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req, 'id');
      this.logRequest(req, `Advancing TicketID: ${id}`);
      const body = req.body || {};
      const data = advanceMaintenanceSchema.parse(body);
      const ticket = await maintenanceService.advance(id, req.user!.id, data.technicianName || undefined, data.notes || undefined);
      console.log(`[MAINTENANCE RES] Advanced ticket ${id} -> ${ticket.status} | Status: 200 OK`);
      sendSuccess(res, ticket, 'Maintenance ticket advanced');
    } catch (error) { next(error); }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req, 'id');
      const { status, technicianName, notes } = req.body;
      this.logRequest(req, `Updating TicketID: ${id} -> Status: ${status}`);
      const ticket = await maintenanceService.updateStatus(id, status, req.user!.id, technicianName, notes);
      console.log(`[MAINTENANCE RES] Ticket ${id} status updated to ${ticket.status} | Status: 200 OK`);
      sendSuccess(res, ticket, 'Maintenance ticket updated');
    } catch (error) { next(error); }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = getParam(req, 'id');
      this.logRequest(req, `Deleting TicketID: ${id}`);
      const deleted = await maintenanceService.delete(id, req.user!.id);
      console.log(`[MAINTENANCE RES] Deleted ticket ${id} | Status: 200 OK`);
      sendSuccess(res, deleted, 'Maintenance ticket deleted');
    } catch (error) { next(error); }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const id = getParam(req, 'id');
      this.logRequest(req, `Uploading image for TicketID: ${id}`);
      const imageUrl = await uploadToCloudinary(req.file.path, 'assetflow/maintenance');
      const updated = await prisma.maintenanceRequest.update({ where: { id }, data: { imageUrl } });
      console.log(`[MAINTENANCE RES] Uploaded image for ticket ${id} | Status: 200 OK`);
      sendSuccess(res, updated, 'Image uploaded');
    } catch (error) { next(error); }
  };

  getMyTickets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.logRequest(req, `My tickets query for UserID: ${req.user!.id}`);
      const data = await maintenanceService.getMyTickets(req.user!.id);
      console.log(`[MAINTENANCE RES] Returned ${data.length} tickets for user ${req.user!.id} | Status: 200 OK`);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  };
}

export default new MaintenanceController();
