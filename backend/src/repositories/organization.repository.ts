// ─── Organization Repository ──────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class OrganizationRepository {
  async create(data: Prisma.OrganizationCreateInput) {
    return prisma.organization.create({
      data,
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            assets: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            assets: true,
            bookings: true,
            maintenanceRequests: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
    });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput) {
    return prisma.organization.update({
      where: { id },
      data,
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            assets: true,
          },
        },
      },
    });
  }
}

export default new OrganizationRepository();
