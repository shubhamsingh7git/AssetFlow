// ─── Asset Repository ───────────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

class AssetRepository {
  async findAll(params: { skip?: number; take?: number; where?: Prisma.AssetWhereInput; orderBy?: Prisma.AssetOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.asset.findMany({ 
        ...params, 
        include: { 
          category: true, 
          department: true,
          allocations: { where: { isActive: true }, include: { user: { select: { id: true, name: true, email: true } } } } 
        } 
      }),
      prisma.asset.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.asset.findUnique({ 
      where: { id }, 
      include: { 
        category: true, 
        department: true,
        organization: true,
        allocations: { where: { isActive: true }, include: { user: true } }, 
        history: { orderBy: { date: 'desc' }, take: 30, include: { user: { select: { id: true, name: true } } } }, 
        maintenance: { orderBy: { createdAt: 'desc' }, take: 10 },
        requests: { orderBy: { id: 'desc' }, take: 10, include: { user: { select: { id: true, name: true } } } },
        transfers: { orderBy: { id: 'desc' }, take: 10, include: { fromUser: true, toUser: true } }
      } 
    });
  }

  async findByTag(tag: string) { 
    return prisma.asset.findUnique({ where: { tag }, include: { category: true, department: true } }); 
  }

  async findBySerialNumber(serialNumber: string) {
    if (!serialNumber) return null;
    return prisma.asset.findFirst({ where: { serialNumber }, include: { category: true } });
  }

  async findByBarcode(barcode: string) {
    if (!barcode) return null;
    return prisma.asset.findFirst({ where: { barcode }, include: { category: true } });
  }

  async create(data: Prisma.AssetCreateInput) {
    return prisma.asset.create({ data, include: { category: true, department: true } });
  }

  async update(id: string, data: Prisma.AssetUpdateInput) {
    return prisma.asset.update({ where: { id }, data, include: { category: true, department: true } });
  }

  async delete(id: string) { 
    return prisma.asset.delete({ where: { id } }); 
  }

  async generateTag(): Promise<string> {
    const lastAsset = await prisma.asset.findFirst({ orderBy: { createdAt: 'desc' }, select: { tag: true } });
    if (!lastAsset) return 'AST-10001';
    const tagStr = lastAsset.tag;
    const numMatch = tagStr.match(/\d+/);
    if (!numMatch) return 'AST-10001';
    const num = parseInt(numMatch[0], 10) || 10000;
    const prefix = tagStr.replace(/\d+/, '') || 'AST-';
    return `${prefix}${String(num + 1).padStart(numMatch[0].length, '0')}`;
  }

  async getHistory(assetId: string) {
    return prisma.assetHistory.findMany({ where: { assetId }, orderBy: { date: 'desc' }, include: { user: { select: { id: true, name: true } } } });
  }

  async addHistory(data: { assetId: string; event: string; details?: string; userId?: string }) {
    return prisma.assetHistory.create({ data });
  }

  async countByStatus(status: string) { return prisma.asset.count({ where: { status: status as any } }); }
  async countAll() { return prisma.asset.count(); }
}

export default new AssetRepository();
