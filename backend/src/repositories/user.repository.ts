// ─── User Repository ────────────────────────────────────────────────────────
import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true, department: { include: { parent: true } }, organization: true },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { role: true, department: true, organization: true },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({
      data,
      include: { role: true, department: true, organization: true },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
      include: { role: true, department: true, organization: true },
    });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          role: true,
          department: { include: { parent: true } },
          organization: true,
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { data, total };
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    return prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async findByRefreshToken(refreshToken: string) {
    return prisma.user.findFirst({
      where: { refreshToken },
      include: { role: true },
    });
  }

  async getRoleByName(name: string) {
    let role = await prisma.role.findUnique({ where: { name } });
    if (!role) {
      role = await prisma.role.create({ data: { name } });
    }
    return role;
  }

  async findByGoogleId(googleId: string) {
    return prisma.user.findUnique({
      where: { googleId },
      include: { role: true, department: true },
    });
  }

  async countByRole(roleName: string) {
    return prisma.user.count({
      where: { role: { name: roleName } },
    });
  }

  async countActive() {
    return prisma.user.count({
      where: { status: 'ACTIVE' },
    });
  }
}

export default new UserRepository();
