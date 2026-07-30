// ─── Asset Controller ───────────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import assetService from '../services/asset.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { createAssetSchema, updateAssetSchema } from '../validators/common.validator';
import { parsePagination } from '../utils/pagination';
import { getParam } from '../utils/params';
import { uploadToCloudinary } from '../middlewares/upload';

class AssetController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as any);
      const { data, total } = await assetService.getAll(req.query);
      sendPaginated(res, data, total, page, limit);
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const asset = await assetService.getById(getParam(req, 'id'));
      sendSuccess(res, asset);
    } catch (error) { next(error); }
  }

  async generateTag(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await assetService.generateTag();
      sendSuccess(res, result);
    } catch (error) { next(error); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createAssetSchema.parse(req.body);
      const asset = await assetService.create(data, req.user!.id);
      sendSuccess(res, asset, 'Asset registered', 201);
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateAssetSchema.parse(req.body);
      const asset = await assetService.update(getParam(req, 'id'), data, req.user!.id);
      sendSuccess(res, asset, 'Asset updated');
    } catch (error) { next(error); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await assetService.delete(getParam(req, 'id'), req.user!.id);
      sendSuccess(res, null, 'Asset deleted');
    } catch (error) { next(error); }
  }

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await assetService.getHistory(getParam(req, 'id'));
      sendSuccess(res, history);
    } catch (error) { next(error); }
  }

  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new Error('No file uploaded');
      const imageUrl = await uploadToCloudinary(req.file.path, 'assetflow/assets');
      const asset = await assetService.updateImage(getParam(req, 'id'), imageUrl, req.user!.id);
      sendSuccess(res, asset, 'Image uploaded');
    } catch (error) { next(error); }
  }

  async getMyAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await assetService.getMyAssets(req.user!.id);
      sendSuccess(res, data);
    } catch (error) { next(error); }
  }
}

export default new AssetController();
