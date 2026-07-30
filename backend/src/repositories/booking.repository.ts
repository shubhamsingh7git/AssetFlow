// ─── Booking Repository ─────────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

class BookingRepository {
  async findAll(params: { skip?: number; take?: number; where?: Prisma.BookingWhereInput; orderBy?: Prisma.BookingOrderByWithRelationInput }) {
    const [data, total] = await Promise.all([
      prisma.booking.findMany({ ...params, include: { user: { select: { id: true, name: true, email: true } }, asset: { select: { id: true, tag: true, name: true } } } }),
      prisma.booking.count({ where: params.where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return prisma.booking.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, email: true } }, asset: true } });
  }

  async create(data: Prisma.BookingCreateInput) {
    return prisma.booking.create({ data, include: { user: { select: { id: true, name: true, email: true } } } });
  }

  async cancel(id: string) {
    return prisma.booking.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  async updateStatus(id: string, status: 'CONFIRMED' | 'REJECTED' | 'CANCELLED') {
    return prisma.booking.update({
      where: { id },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async checkOverlap(resourceName: string, date: Date, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.BookingWhereInput = {
      resourceName,
      date,
      status: 'CONFIRMED',
      AND: [
        { startTime: { lt: endTime } },
        { endTime: { gt: startTime } },
      ],
    };
    if (excludeId) {
      where.id = { not: excludeId };
    }
    const count = await prisma.booking.count({ where });
    return count > 0;
  }

  async getSlots(resourceName: string, date: Date) {
    return prisma.booking.findMany({
      where: { resourceName, date, status: 'CONFIRMED' },
      orderBy: { startTime: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async countActive() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return prisma.booking.count({ where: { date: { gte: today }, status: 'CONFIRMED' } });
  }
}

export default new BookingRepository();
