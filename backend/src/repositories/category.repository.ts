// ─── Category Repository ────────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

class CategoryRepository {
  async findAll(params: { skip?: number; take?: number; where?: Prisma.AssetCategoryWhereInput; orderBy?: Prisma.AssetCategoryOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.assetCategory.findMany({ ...params, include: { customFields: true, _count: { select: { assets: true } } } }),
      prisma.assetCategory.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.assetCategory.findUnique({ where: { id }, include: { customFields: true, _count: { select: { assets: true } } } });
  }

  async findByName(name: string) { return prisma.assetCategory.findFirst({ where: { name } }); }

  async create(data: Prisma.AssetCategoryCreateInput) {
    return prisma.assetCategory.create({ data, include: { customFields: true, _count: { select: { assets: true } } } });
  }

  async update(id: string, data: Prisma.AssetCategoryUpdateInput) {
    return prisma.assetCategory.update({ where: { id }, data, include: { customFields: true, _count: { select: { assets: true } } } });
  }

  async delete(id: string) { return prisma.assetCategory.delete({ where: { id } }); }

  async replaceCustomFields(categoryId: string, fields: { name: string; type: string; required: boolean }[]) {
    await prisma.customField.deleteMany({ where: { categoryId } });
    if (fields.length > 0) {
      await prisma.customField.createMany({ data: fields.map(f => ({ ...f, categoryId })) });
    }
  }

  async count() { return prisma.assetCategory.count(); }
}

export default new CategoryRepository();
