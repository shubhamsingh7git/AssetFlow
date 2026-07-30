import prisma from '../config/database';
import userRepository from '../repositories/user.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import notificationRepo from '../repositories/notification.repository';
import emailService from './email.service';
import { hashPassword } from '../utils/password';
import { generateSecureTemporaryPassword } from '../utils/security';
import { AppError } from '../middlewares/errorHandler';
import { CreateEmployeeInput, UpdateEmployeeInput, ResetEmployeePasswordInput } from '../validators/employee.validator';

export class EmployeeService {
  /**
   * Create a new employee account (admin only)
   */
  async createEmployee(input: CreateEmployeeInput, adminUser: { id: string; organizationId?: string }) {
    const { email, phone, employeeId, departmentId, roleName, designation, employmentType, joiningDate, managerId, status, forcePasswordChange } = input;

    const name = input.name || `${input.firstName || ''} ${input.lastName || ''}`.trim() || email;

    // Check if email already exists
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    // Resolve role
    const targetRoleName = roleName || 'Employee';
    let userRole = await userRepository.getRoleByName(targetRoleName);
    if (!userRole) {
      userRole = await userRepository.getRoleByName('Employee');
    }
    if (!userRole) {
      throw new AppError('System error: Employee role not found', 500);
    }

    // Automatically generate 16+ char strong temporary password if not provided by Admin
    const tempPassword = input.password || generateSecureTemporaryPassword(16);

    // Hash password using bcrypt
    const hashedPassword = await hashPassword(tempPassword);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        employeeId: employeeId || null,
        designation: designation || null,
        employmentType: employmentType || 'full-time',
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        managerId: managerId || null,
        status: status || 'ACTIVE',
        forcePasswordChange: forcePasswordChange !== false,
        provider: 'local',
        createdById: adminUser.id,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
        roleId: userRole.id,
        departmentId: departmentId || null,
        organizationId: adminUser.organizationId || null,
      },
      include: { role: true, department: true, organization: true },
    });

    // Log activity
    await activityLogRepo.create({
      action: 'EMPLOYEE_CREATED',
      targetResource: 'User',
      targetId: newUser.id,
      details: `Employee account created: ${name} (${email}) by admin`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    // Create In-App Notification
    await notificationRepo.create({
      type: 'EMPLOYEE_CREATED',
      message: `Welcome to ${newUser.organization?.name || 'AssetFlow ERP'}, ${newUser.name}!`,
      userId: newUser.id,
    });

    // Send Welcome Email via Resend containing the temporary password (non-blocking)
    emailService.sendWelcomeEmail({
      to: newUser.email,
      name: newUser.name,
      tempPassword,
      organizationName: newUser.organization?.name,
    }).catch((err) => console.error('[Email Dispatch Warning] Failed to send welcome email:', err));

    const { password: _, refreshToken: __, ...safe } = newUser as any;
    return safe;
  }

  /**
   * List employees with filters, search, and pagination
   */
  async listEmployees(params: {
    search?: string;
    department?: string;
    role?: string;
    status?: string;
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    organizationId?: string;
  }) {
    const { search, department, role, status, page, limit, sortBy, sortOrder, organizationId } = params;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (organizationId) {
      where.organizationId = organizationId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department && department !== 'All') {
      where.department = { name: department };
    }
    if (role && role !== 'All') {
      where.role = { name: role };
    }
    if (status && status !== 'All') {
      where.status = status;
    }

    const orderBy: any = { [sortBy || 'createdAt']: sortOrder || 'desc' };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
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

    const sanitized = data.map((u: any) => {
      const { password, refreshToken, ...safe } = u;
      return safe;
    });

    return { data: sanitized, total, page, limit };
  }

  /**
   * Get single employee by ID
   */
  async getEmployeeById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        department: { include: { parent: true } },
        organization: true,
        manager: { select: { id: true, name: true, email: true } },
      },
    });

    if (!user || user.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    const { password, refreshToken, ...safe } = user;
    return safe;
  }

  /**
   * Get employee profile with related data (assets, bookings, maintenance, activity)
   */
  async getEmployeeProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        department: { include: { parent: true } },
        organization: true,
        manager: { select: { id: true, name: true, email: true } },
        allocatedAssets: {
          where: { isActive: true },
          include: { asset: { include: { category: true } } },
          take: 20,
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        maintenanceReqs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { asset: true },
        },
        activityLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!user || user.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    const { password, refreshToken, ...safe } = user;
    return safe;
  }

  /**
   * Update employee details
   */
  async updateEmployee(id: string, input: UpdateEmployeeInput, adminUser: { id: string; organizationId?: string }) {
    const existing = await prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!existing || existing.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    // If email changed, check uniqueness
    if (input.email && input.email !== existing.email) {
      const emailTaken = await userRepository.findByEmail(input.email);
      if (emailTaken) {
        throw new AppError('An account with this email already exists', 409);
      }
    }

    // Build update data
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.employeeId !== undefined) updateData.employeeId = input.employeeId;
    if (input.designation !== undefined) updateData.designation = input.designation;
    if (input.employmentType !== undefined) updateData.employmentType = input.employmentType;
    if (input.joiningDate !== undefined) updateData.joiningDate = input.joiningDate ? new Date(input.joiningDate) : null;
    if (input.managerId !== undefined) updateData.managerId = input.managerId || null;
    if (input.status !== undefined) updateData.status = input.status;

    // Handle department change
    if (input.departmentId !== undefined) {
      updateData.departmentId = input.departmentId || null;
    }

    // Handle role change
    if (input.roleName) {
      const role = await userRepository.getRoleByName(input.roleName);
      if (role) {
        updateData.roleId = role.id;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true, department: true, organization: true },
    });

    // Log activity
    await activityLogRepo.create({
      action: 'EMPLOYEE_UPDATED',
      targetResource: 'User',
      targetId: id,
      details: `Employee updated: ${updated.name} (${updated.email})`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    const { password, refreshToken, ...safe } = updated as any;
    return safe;
  }

  /**
   * Reset employee password (admin action)
   */
  async resetPassword(id: string, input: ResetEmployeePasswordInput, adminUser: { id: string; organizationId?: string }) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    // Auto-generate strong 16+ char temporary password if omitted
    const tempPassword = input.newPassword || generateSecureTemporaryPassword(16);
    const hashedPassword = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });

    // Log activity
    await activityLogRepo.create({
      action: 'PASSWORD_RESET',
      targetResource: 'User',
      targetId: id,
      details: `Password reset for: ${existing.name} (${existing.email}) by admin`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    // Send Password Reset Email via Resend containing new temporary password (non-blocking)
    emailService.sendPasswordResetEmail({
      to: existing.email,
      name: existing.name,
      tempPassword,
    }).catch((err) => console.error('[Email Dispatch Warning] Failed to send password reset email:', err));

    return { message: 'Password reset successfully. A new temporary password has been emailed to the employee.' };
  }

  /**
   * Toggle employee account lock state (lock/unlock)
   */
  async toggleLock(id: string, adminUser: { id: string; organizationId?: string }) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    const newLockState = !existing.isLocked;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        isLocked: newLockState,
        lockedUntil: newLockState ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
        failedLoginAttempts: 0,
      },
      include: { role: true, department: true },
    });

    const action = newLockState ? 'EMPLOYEE_LOCKED' : 'EMPLOYEE_UNLOCKED';
    await activityLogRepo.create({
      action,
      targetResource: 'User',
      targetId: id,
      details: `Employee account ${newLockState ? 'locked' : 'unlocked'}: ${existing.name} (${existing.email})`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    const { password, refreshToken, ...safe } = updated as any;
    return safe;
  }

  /**
   * Toggle employee status (activate/deactivate)
   */
  async toggleStatus(id: string, adminUser: { id: string; organizationId?: string }) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      include: { role: true, department: true },
    });

    const action = newStatus === 'ACTIVE' ? 'EMPLOYEE_ACTIVATED' : 'EMPLOYEE_DEACTIVATED';
    await activityLogRepo.create({
      action,
      targetResource: 'User',
      targetId: id,
      details: `Employee ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}: ${existing.name} (${existing.email})`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    // Send Account Status Email via Resend (non-blocking)
    if (newStatus === 'ACTIVE') {
      emailService.sendAccountActivatedEmail({
        to: existing.email,
        name: existing.name,
      }).catch((err) => console.error('[Email Dispatch Warning] Failed to send account activated email:', err));
    } else {
      emailService.sendAccountDeactivatedEmail({
        to: existing.email,
        name: existing.name,
      }).catch((err) => console.error('[Email Dispatch Warning] Failed to send account deactivated email:', err));
    }

    const { password, refreshToken, ...safe } = updated as any;
    return safe;
  }

  /**
   * Soft delete employee
   */
  async softDelete(id: string, adminUser: { id: string; organizationId?: string }) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    // Prevent deleting organization owner
    if (existing.isOrganizationOwner) {
      throw new AppError('Cannot delete the organization owner', 403);
    }

    await prisma.user.update({
      where: { id },
      data: {
        isDeleted: true,
        status: 'INACTIVE',
        refreshToken: null,
      },
    });

    await activityLogRepo.create({
      action: 'EMPLOYEE_DELETED',
      targetResource: 'User',
      targetId: id,
      details: `Employee soft-deleted: ${existing.name} (${existing.email})`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    return { message: 'Employee deleted successfully' };
  }

  /**
   * Resend welcome email with fresh temporary password
   */
  async resendWelcomeEmail(id: string, adminUser: { id: string; organizationId?: string }) {
    const existing = await prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });
    if (!existing || existing.isDeleted) {
      throw new AppError('Employee not found', 404);
    }

    const tempPassword = generateSecureTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        forcePasswordChange: true,
        passwordUpdatedAt: new Date(),
        refreshToken: null,
      },
    });

    await emailService.sendWelcomeEmail({
      to: existing.email,
      name: existing.name,
      tempPassword,
      organizationName: existing.organization?.name,
    });

    await activityLogRepo.create({
      action: 'EMPLOYEE_WELCOME_RESENT',
      targetResource: 'User',
      targetId: id,
      details: `Welcome email & temporary password resent to: ${existing.name} (${existing.email})`,
      category: 'Employees',
      userId: adminUser.id,
      ...(adminUser.organizationId ? { organizationId: adminUser.organizationId } : {}),
    });

    return { message: `Welcome email and new temporary password sent to ${existing.email}` };
  }
}

export default new EmployeeService();
