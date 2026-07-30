// ─── Asset Request Controller ───────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import assetRequestService from '../services/assetRequest.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';

class AssetRequestController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { assetId, reason } = req.body;
      if (!assetId) {
        res.status(400).json({ success: false, message: 'assetId is required' });
        return;
      }
      const request = await assetRequestService.createRequest({ assetId, reason }, req.user!.id);
      sendSuccess(res, request, 'Asset request submitted', 201);
    } catch (error) { next(error); }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const { data, total } = await assetRequestService.getAllRequests(req.query, req.user!.organizationId);
      sendPaginated(res, data, total, page, limit);
    } catch (error) { next(error); }
  }

  async getMyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await assetRequestService.getMyRequests(req.user!.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }

  async approve(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await assetRequestService.approveRequest(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, request, 'Asset request approved');
    } catch (error) { next(error); }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const request = await assetRequestService.rejectRequest(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, request, 'Asset request rejected');
    } catch (error) { next(error); }
  }
}

export default new AssetRequestController();
