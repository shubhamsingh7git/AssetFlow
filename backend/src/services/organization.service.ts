// ─── Organization Service ───────────────────────────────────────────────────
import organizationRepo from '../repositories/organization.repository';
import userRepo from '../repositories/user.repository';
import departmentRepo from '../repositories/department.repository';
import assetRepo from '../repositories/asset.repository';
import { AppError } from '../middlewares/errorHandler';
import { CreateOrganizationInput, UpdateOrganizationInput } from '../validators/organization.validator';
import prisma from '../config/database';

export class OrganizationService {
  async createOrganization(userId: string, input: CreateOrganizationInput) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.organizationId && user.organization?.onboardingCompleted) {
      throw new AppError('User already belongs to a fully configured organization', 400);
    }

    // Generate unique slug
    let baseSlug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'org';
    
    let slug = baseSlug;
    let counter = 1;
    while (await organizationRepo.findBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create organization
    const org = await organizationRepo.create({
      name: input.name,
      slug,
      logo: input.logo || null,
      industry: input.industry || null,
      companySize: input.companySize || null,
      country: input.country || 'United States',
      timezone: input.timezone || 'UTC',
      currency: input.currency || 'USD',
      address: input.address || null,
      website: input.website || null,
      description: input.description || null,
      onboardingStep: 'DEPARTMENTS',
      onboardingCompleted: false,
      createdBy: userId,
    });

    // Ensure user has Administrator role
    const adminRole = await userRepo.getRoleByName('Administrator');

    // Update user to link organization and set owner
    const updatedUser = await userRepo.update(userId, {
      organization: { connect: { id: org.id } },
      isOrganizationOwner: true,
      role: adminRole ? { connect: { id: adminRole.id } } : undefined,
    });

    return {
      organization: org,
      user: updatedUser,
    };
  }

  async getOrganizationForUser(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.organizationId) {
      return null;
    }

    return organizationRepo.findById(user.organizationId);
  }

  async updateOrganization(userId: string, input: UpdateOrganizationInput) {
    const user = await userRepo.findById(userId);
    if (!user || !user.organizationId) {
      throw new AppError('User does not belong to an organization', 400);
    }

    if (!user.isOrganizationOwner && user.role.name !== 'Administrator') {
      throw new AppError('Only organization owner or admin can update organization details', 403);
    }

    return organizationRepo.update(user.organizationId, input);
  }

  async getOnboardingStatus(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.organizationId) {
      return {
        hasOrganization: false,
        step: 'ORGANIZATION',
        completed: false,
        counts: { departments: 0, employees: 0, assets: 0 },
      };
    }

    const org = await organizationRepo.findById(user.organizationId);
    if (!org) {
      return {
        hasOrganization: false,
        step: 'ORGANIZATION',
        completed: false,
        counts: { departments: 0, employees: 0, assets: 0 },
      };
    }

    const [departmentsCount, employeesCount, assetsCount] = await Promise.all([
      prisma.department.count({ where: { organizationId: org.id } }),
      prisma.user.count({ where: { organizationId: org.id } }),
      prisma.asset.count({ where: { organizationId: org.id } }),
    ]);

    return {
      hasOrganization: true,
      organization: {
        id: org.id,
        name: org.name,
        currency: org.currency,
        industry: org.industry,
      },
      step: org.onboardingStep,
      completed: org.onboardingCompleted,
      isOwner: user.isOrganizationOwner,
      counts: {
        departments: departmentsCount,
        employees: employeesCount,
        assets: assetsCount,
      },
    };
  }

  async updateOnboardingStatus(userId: string, step: string, completed?: boolean) {
    const user = await userRepo.findById(userId);
    if (!user || !user.organizationId) {
      throw new AppError('User does not belong to an organization', 400);
    }

    const dataToUpdate: any = { onboardingStep: step };
    if (typeof completed === 'boolean') {
      dataToUpdate.onboardingCompleted = completed;
    } else if (step === 'COMPLETED') {
      dataToUpdate.onboardingCompleted = true;
    }

    const updatedOrg = await organizationRepo.update(user.organizationId, dataToUpdate);

    return {
      step: updatedOrg.onboardingStep,
      completed: updatedOrg.onboardingCompleted,
      organization: updatedOrg,
    };
  }
}

export default new OrganizationService();
