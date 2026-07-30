// ─── Dashboard Service ──────────────────────────────────────────────────────
import prisma from '../config/database';
import assetRepo from '../repositories/asset.repository';
import bookingRepo from '../repositories/booking.repository';
import allocationRepo from '../repositories/allocation.repository';
import maintenanceRepo from '../repositories/maintenance.repository';
import departmentRepo from '../repositories/department.repository';
import categoryRepo from '../repositories/category.repository';
import userRepo from '../repositories/user.repository';

class DashboardService {
  async getEmployeeStats(userId?: string) {
    let orgId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      orgId = user?.organizationId || null;
    }
    const orgWhere = orgId ? { organizationId: orgId } : {};

    const [availableHardware, allocated, activeBookings, pendingTransfers, maintenanceToday] = await Promise.all([
      prisma.asset.count({ where: { ...orgWhere, status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { ...orgWhere, status: 'ALLOCATED' } }),
      prisma.booking.count({ where: { ...orgWhere, status: 'CONFIRMED' } }),
      allocationRepo.countPendingTransfers(),
      prisma.maintenanceRequest.count({ where: orgWhere }),
    ]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totalRoomResources = await prisma.booking.groupBy({
      by: ['resourceName'],
      where: { ...orgWhere, resourceType: 'room' },
    });
    const totalRooms = Math.max(totalRoomResources.length, 1);
    const bookedRoomsToday = await prisma.booking.groupBy({
      by: ['resourceName'],
      where: { ...orgWhere, date: { gte: today }, status: 'CONFIRMED', resourceType: 'room' },
    });
    const availableRooms = Math.max(0, totalRooms - bookedRoomsToday.length);

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const upcomingReturns = await prisma.assetAllocation.count({
      where: { isActive: true, allocatedAt: { lte: thirtyDaysAgo } },
    });

    return {
      availableHardware,
      allocated,
      availableRooms,
      activeBookings,
      pendingTransfers,
      upcomingReturns,
      maintenanceToday,
    };
  }

  async getAdminStats(userId?: string) {
    let orgId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      orgId = user?.organizationId || null;
    }
    const orgWhere = orgId ? { organizationId: orgId } : {};

    const [departmentCount, employeeCount, categoryCount, activeUsersCount, deptHeadsCount, assetManagersCount, administratorsCount, totalAssetsCount] = await Promise.all([
      prisma.department.count({ where: orgWhere }),
      prisma.user.count({ where: orgWhere }),
      prisma.assetCategory.count({ where: orgWhere }),
      prisma.user.count({ where: { ...orgWhere, status: 'ACTIVE' } }),
      prisma.user.count({ where: { ...orgWhere, role: { name: 'Department Head' } } }),
      prisma.user.count({ where: { ...orgWhere, role: { name: 'Asset Manager' } } }),
      prisma.user.count({ where: { ...orgWhere, role: { name: 'Administrator' } } }),
      prisma.asset.count({ where: orgWhere }),
    ]);

    return { departmentCount, employeeCount, categoryCount, activeUsersCount, deptHeadsCount, assetManagersCount, administratorsCount, totalAssetsCount };
  }

  async getUtilizationByDepartment(userId?: string) {
    let orgId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      orgId = user?.organizationId || null;
    }
    const orgWhere = orgId ? { organizationId: orgId } : {};

    const departments = await prisma.department.findMany({
      where: orgWhere,
      include: {
        _count: { select: { employees: true } },
        employees: {
          include: { allocatedAssets: { where: { isActive: true } } },
        },
      },
    });

    return departments.map(dept => ({
      department: dept.name,
      employeeCount: dept._count.employees,
      allocatedAssets: dept.employees.reduce((sum, emp) => sum + emp.allocatedAssets.length, 0),
    }));
  }

  async getMaintenanceFrequency(userId?: string) {
    let orgId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      orgId = user?.organizationId || null;
    }
    const orgWhere = orgId ? { organizationId: orgId } : {};

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthly = await prisma.maintenanceRequest.groupBy({
      by: ['createdAt'],
      where: { ...orgWhere, createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });

    const monthlyMap: Record<string, number> = {};
    monthly.forEach(m => {
      const key = new Date(m.createdAt).toISOString().slice(0, 7);
      monthlyMap[key] = (monthlyMap[key] || 0) + m._count.id;
    });

    return Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));
  }

  async getMostUsedAssets(userId?: string) {
    let orgId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      orgId = user?.organizationId || null;
    }
    const orgWhere = orgId ? { organizationId: orgId } : {};

    const bookings = await prisma.booking.groupBy({
      by: ['resourceName'],
      where: orgWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    return bookings.map(b => ({ resource: b.resourceName, bookings: b._count.id }));
  }

  async getRecentActivity(userId?: string, limit = 20) {
    const where: any = {};
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.organizationId) {
        where.organizationId = user.organizationId;
      } else {
        where.userId = userId;
      }
    }

    return prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    });
  }

  // ─── Employee Personal Dashboard ─────────────────────────────────────────
  async getEmployeePersonalStats(userId: string) {
    const [myAssets, myActiveBookings, myMaintenanceRequests, myPendingTransfers] = await Promise.all([
      prisma.assetAllocation.count({ where: { userId, isActive: true } }),
      prisma.booking.count({ where: { userId, status: 'CONFIRMED' } }),
      prisma.maintenanceRequest.count({ where: { requestedById: userId } }),
      prisma.transferRequest.count({ where: { fromUserId: userId, status: 'REQUESTED' } }),
    ]);

    // Recent notifications count
    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      myAssets,
      myActiveBookings,
      myMaintenanceRequests,
      myPendingTransfers,
      unreadNotifications,
    };
  }

  async getEmployeePersonalActivity(userId: string, limit = 20) {
    return prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    });
  }
}

export default new DashboardService();
