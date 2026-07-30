// ─── Asset Service ──────────────────────────────────────────────────────────
import assetRepo from '../repositories/asset.repository';
import userRepo from '../repositories/user.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import notificationRepo from '../repositories/notification.repository';
import { AppError } from '../middlewares/errorHandler';
import { parsePagination } from '../utils/pagination';
import prisma from '../config/database';

class AssetService {
  async getAll(query: Record<string, any>) {
    const { skip, take, orderBy } = parsePagination(query);
    const where: any = {};

    if (query.search) {
      where.OR = [
        { tag: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { serialNumber: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
        { model: { contains: query.search, mode: 'insensitive' } },
        { manufacturer: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.status && query.status !== 'All') where.status = query.status;
    if (query.categoryId && query.categoryId !== 'All') where.categoryId = query.categoryId;
    if (query.category && query.category !== 'All') {
      where.category = { name: { equals: query.category, mode: 'insensitive' } };
    }
    if (query.departmentId && query.departmentId !== 'All') where.departmentId = query.departmentId;
    if (query.location) where.location = { contains: query.location, mode: 'insensitive' };

    return assetRepo.findAll({ skip, take, where, orderBy: orderBy || { createdAt: 'desc' } });
  }

  async getById(id: string) {
    const asset = await assetRepo.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);
    return asset;
  }

  async generateTag() {
    const suggestedTag = await assetRepo.generateTag();
    return { tag: suggestedTag };
  }

  async create(data: any, userId: string) {
    const user = await userRepo.findById(userId);
    const orgId = user?.organizationId || data.organizationId;

    let categoryId = data.categoryId;
    if (!categoryId && (data.category || data.categoryName)) {
      const catName = data.category || data.categoryName;
      let existingCat = await prisma.assetCategory.findFirst({
        where: { name: catName, ...(orgId ? { organizationId: orgId } : {}) },
      });
      if (!existingCat) {
        existingCat = await prisma.assetCategory.create({
          data: {
            name: catName,
            description: `${catName} category`,
            iconName: 'Laptop',
            ...(orgId ? { organization: { connect: { id: orgId } } } : {}),
          },
        });
      }
      categoryId = existingCat.id;
    }

    if (!categoryId) {
      let defaultCat = await prisma.assetCategory.findFirst();
      if (!defaultCat) {
        defaultCat = await prisma.assetCategory.create({
          data: { name: 'Hardware', description: 'General hardware assets', iconName: 'Laptop' },
        });
      }
      categoryId = defaultCat.id;
    }

    const tag = data.tag || data.assetCode || data.assetId || await assetRepo.generateTag();

    // ─── Duplicate Validation Checks ──────────────────────────────────────────
    const existingTag = await assetRepo.findByTag(tag);
    if (existingTag) {
      throw new AppError(`Asset Code "${tag}" is already registered in the system. Please use a unique asset code.`, 400);
    }

    if (data.serialNumber && data.serialNumber.trim()) {
      const existingSerial = await assetRepo.findBySerialNumber(data.serialNumber.trim());
      if (existingSerial) {
        throw new AppError(`Serial Number "${data.serialNumber.trim()}" is already assigned to asset "${existingSerial.name}" (${existingSerial.tag}).`, 400);
      }
    }

    if (data.barcode && data.barcode.trim()) {
      const existingBarcode = await assetRepo.findByBarcode(data.barcode.trim());
      if (existingBarcode) {
        throw new AppError(`Barcode/QR Code "${data.barcode.trim()}" is already assigned to asset "${existingBarcode.name}" (${existingBarcode.tag}).`, 400);
      }
    }

    // ─── Format Location String ───────────────────────────────────────────────
    let locationStr = data.location;
    if (!locationStr && (data.building || data.floor || data.room || data.storageLocation)) {
      const parts = [
        data.building ? `Bldg: ${data.building}` : null,
        data.floor ? `Floor ${data.floor}` : null,
        data.room ? `Room ${data.room}` : null,
        data.storageLocation ? `Loc: ${data.storageLocation}` : null,
      ].filter(Boolean);
      locationStr = parts.join(', ');
    }

    const createData: any = {
      tag,
      name: data.name || data.assetName,
      type: data.type || null,
      manufacturer: data.manufacturer || null,
      model: data.model || null,
      serialNumber: data.serialNumber ? data.serialNumber.trim() : null,
      barcode: data.barcode ? data.barcode.trim() : null,
      qrCode: data.qrCode || data.barcode || null,
      description: data.description || null,
      status: data.status || 'AVAILABLE',
      location: locationStr || 'Main Office',
      building: data.building || null,
      floor: data.floor || null,
      room: data.room || null,
      storageLocation: data.storageLocation || null,
      imageUrl: data.imageUrl || null,
      documentUrl: data.documentUrl || null,
      notes: data.notes || null,
      vendor: data.vendor || null,
      poNumber: data.poNumber || null,
      invoiceNumber: data.invoiceNumber || null,
      category: { connect: { id: categoryId } },
      ...(data.departmentId ? { department: { connect: { id: data.departmentId } } } : {}),
      ...(orgId ? { organization: { connect: { id: orgId } } } : {}),
    };

    if (data.purchaseDate) createData.purchaseDate = new Date(data.purchaseDate);
    if (data.purchaseCost !== undefined && data.purchaseCost !== null && data.purchaseCost !== '') {
      createData.purchaseCost = parseFloat(data.purchaseCost);
    }
    if (data.currentValue !== undefined && data.currentValue !== null && data.currentValue !== '') {
      createData.currentValue = parseFloat(data.currentValue);
    } else if (createData.purchaseCost) {
      createData.currentValue = createData.purchaseCost;
    }
    if (data.expectedLifeMonths !== undefined && data.expectedLifeMonths !== null && data.expectedLifeMonths !== '') {
      createData.expectedLifeMonths = parseInt(data.expectedLifeMonths, 10);
    }
    if (data.depreciationMethod) createData.depreciationMethod = data.depreciationMethod;

    if (data.warrantyExpiry || data.warranty) {
      const wDate = data.warrantyExpiry || data.warranty;
      if (!isNaN(Date.parse(wDate))) {
        createData.warrantyExpiry = new Date(wDate);
      }
    }

    const asset = await assetRepo.create(createData);

    // ─── History, Activity Log & Notifications ───────────────────────────────
    await assetRepo.addHistory({ 
      assetId: asset.id, 
      event: `Asset registered: ${asset.name} (${asset.tag})`, 
      userId 
    });

    const adminName = user?.name || 'Administrator';
    await activityLogRepo.create({ 
      action: 'ASSET_CREATED', 
      targetResource: 'Asset', 
      targetId: asset.id, 
      details: `Admin ${adminName} registered ${asset.name} (${asset.tag}).`, 
      category: 'Approvals', 
      userId,
      ...(orgId ? { organizationId: orgId } : {})
    });

    // In-app Notification for Admin
    await notificationRepo.create({
      userId,
      message: `Asset "${asset.name}" (${asset.tag}) has been registered into AssetFlow ERP and is ready for allocation.`,
      type: 'GENERAL',
    });

    return asset;
  }

  async update(id: string, data: any, userId: string) {
    const asset = await assetRepo.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.building !== undefined) updateData.building = data.building;
    if (data.floor !== undefined) updateData.floor = data.floor;
    if (data.room !== undefined) updateData.room = data.room;
    if (data.storageLocation !== undefined) updateData.storageLocation = data.storageLocation;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
    if (data.documentUrl !== undefined) updateData.documentUrl = data.documentUrl;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    if (data.poNumber !== undefined) updateData.poNumber = data.poNumber;
    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber;
    if (data.categoryId) updateData.category = { connect: { id: data.categoryId } };
    if (data.departmentId) updateData.department = { connect: { id: data.departmentId } };
    if (data.purchaseDate) updateData.purchaseDate = new Date(data.purchaseDate);
    if (data.purchaseCost !== undefined) updateData.purchaseCost = parseFloat(data.purchaseCost);
    if (data.currentValue !== undefined) updateData.currentValue = parseFloat(data.currentValue);
    if (data.warrantyExpiry) updateData.warrantyExpiry = new Date(data.warrantyExpiry);

    const updated = await assetRepo.update(id, updateData);
    await assetRepo.addHistory({ assetId: id, event: `Asset updated`, userId });
    await activityLogRepo.create({ action: 'ASSET_UPDATED', targetResource: 'Asset', targetId: id, details: `Asset ${updated.tag} updated`, category: 'Approvals', userId });
    return updated;
  }

  async delete(id: string, userId: string) {
    const asset = await assetRepo.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);
    if (asset.status === 'ALLOCATED') throw new AppError('Cannot delete an allocated asset. Return it first.', 400);
    await assetRepo.delete(id);
    await activityLogRepo.create({ action: 'ASSET_DELETED', targetResource: 'Asset', targetId: id, details: `Asset ${asset.tag} deleted`, category: 'Approvals', userId });
  }

  async getHistory(assetId: string) {
    return assetRepo.getHistory(assetId);
  }

  async updateImage(id: string, imageUrl: string, userId: string) {
    const asset = await assetRepo.findById(id);
    if (!asset) throw new AppError('Asset not found', 404);
    return assetRepo.update(id, { imageUrl });
  }

  async getMyAssets(userId: string) {
    const allocations = await prisma.assetAllocation.findMany({
      where: { userId, isActive: true },
      include: {
        asset: {
          include: {
            category: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { allocatedAt: 'desc' },
    });

    return allocations.map(a => ({
      id: a.asset.id,
      tag: a.asset.tag,
      name: a.asset.name,
      serialNumber: a.asset.serialNumber,
      category: a.asset.category,
      department: a.asset.department,
      status: a.asset.status,
      location: a.asset.location,
      imageUrl: a.asset.imageUrl,
      warrantyExpiry: a.asset.warrantyExpiry,
      allocatedAt: a.allocatedAt,
      allocationId: a.id,
    }));
  }
}

export default new AssetService();
