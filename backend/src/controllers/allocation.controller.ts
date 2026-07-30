// ─── Allocation & Transfer Controller ───────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import allocationService from '../services/allocation.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { createAllocationSchema, returnAllocationSchema, createTransferSchema } from '../validators/common.validator';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';

class AllocationController {
  async allocate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createAllocationSchema.parse(req.body);
      const allocation = await allocationService.allocate(data, req.user!.id);
      sendSuccess(res, allocation, 'Asset allocated', 201);
    } catch (error) { next(error); }
  }

  async returnAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const data = returnAllocationSchema.parse(req.body);
      const allocation = await allocationService.returnAsset(getParam(req, 'id'), data.condition, req.user!.id);
      sendSuccess(res, allocation, 'Asset returned');
    } catch (error) { next(error); }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await allocationService.getAllocationHistory(getParam(req, 'assetId'));
      sendSuccess(res, history);
    } catch (error) { next(error); }
  }

  // ─── Transfers ────────────────────────────────────────────────────────────
  async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createTransferSchema.parse(req.body);
      const transfer = await allocationService.createTransfer(data, req.user!.id);
      sendSuccess(res, transfer, 'Transfer request created', 201);
    } catch (error) { next(error); }
  }

  async getTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const { data, total } = await allocationService.getTransfers(req.query);
      sendPaginated(res, data, total, page, limit);
    } catch (error) { next(error); }
  }

  async approveTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await allocationService.approveTransfer(getParam(req, 'id'), req.user!.id, req.user!.role);
      sendSuccess(res, transfer, 'Transfer approved');
    } catch (error) { next(error); }
  }

  async rejectTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const transfer = await allocationService.rejectTransfer(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, transfer, 'Transfer rejected');
    } catch (error) { next(error); }
  }

  async getMyTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await allocationService.getMyTransfers(req.user!.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  async createEmployeeTransferRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, reason } = req.body;
      if (!assetId) {
        res.status(400).json({ success: false, message: 'assetId is required' });
        return;
      }
      const transfer = await allocationService.createEmployeeTransferRequest(assetId, reason, req.user!.id);
      sendSuccess(res, transfer, 'Transfer request submitted', 201);
    } catch (error) { next(error); }
  }
}

export default new AllocationController();
