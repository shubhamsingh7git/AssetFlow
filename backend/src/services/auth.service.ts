// ─── Auth Service ───────────────────────────────────────────────────────────
import crypto from 'crypto';
import userRepository from '../repositories/user.repository';
import organizationRepo from '../repositories/organization.repository';
import activityLogRepo from '../repositories/activitylog.repository';
import notificationRepo from '../repositories/notification.repository';
import emailService from './email.service';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtPayload } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { AdminRegisterInput, LoginInput } from '../validators/auth.validator';
import { ChangePasswordInput } from '../validators/employee.validator';
import env from '../config/env';
import prisma from '../config/database';

export class AuthService {
  /**
   * Register a new Company Admin — creates Organization + Admin User in one flow
   */
  async registerAdmin(input: AdminRegisterInput) {
    const { companyName, adminName, email, password } = input;

    // Check if user already exists
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    // Get Administrator role
    const adminRole = await userRepository.getRoleByName('Administrator');
    if (!adminRole) {
      throw new AppError('System error: Administrator role not found', 500);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate unique slug for the organization
    let baseSlug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'org';

    let slug = baseSlug;
    let counter = 1;
    while (await organizationRepo.findBySlug(slug)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create organization first
    const org = await prisma.organization.create({
      data: {
        name: companyName,
        slug,
        onboardingStep: 'DEPARTMENTS',
        onboardingCompleted: false,
      },
    });

    // Create admin user linked to the organization
    const user = await userRepository.create({
      name: adminName,
      email,
      password: hashedPassword,
      provider: 'local',
      forcePasswordChange: false,
      passwordUpdatedAt: new Date(),
      role: { connect: { id: adminRole.id } },
      organization: { connect: { id: org.id } },
      isOrganizationOwner: true,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(adminName)}`,
    });

    // Update the org createdBy field
    await prisma.organization.update({
      where: { id: org.id },
      data: { createdBy: user.id },
    });

    // Generate tokens with organizationId
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: org.id,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token
    await userRepository.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Login with email and password — used by both Admin and Employee
   */
  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check soft-deleted
    if ((user as any).isDeleted) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check account lock
    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new AppError('Account is locked. Contact your administrator or try again later.', 403);
      } else {
        // Lock window expired — unlock account
        await prisma.user.update({
          where: { id: user.id },
          data: { isLocked: false, lockedUntil: null, failedLoginAttempts: 0 },
        });
      }
    }

    // Check status
    if (user.status === 'INACTIVE') {
      throw new AppError('Account has been deactivated. Contact administrator.', 403);
    }

    // If user signed up via Google and has no password
    if (!user.password && user.provider === 'google') {
      throw new AppError('This account uses Google sign-in. Please use "Continue with Google" to log in.', 400);
    }

    // Verify password
    if (!user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const isNowLocked = failedAttempts >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          isLocked: isNowLocked,
          lockedUntil: isNowLocked ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      if (isNowLocked) {
        throw new AppError('Account locked due to 5 consecutive failed login attempts. Contact administrator.', 403);
      }
      throw new AppError('Invalid email or password', 401);
    }

    // Update last login timestamp & reset failed attempts
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
      include: { role: true, department: true, organization: true },
    });

    // Log activity
    await activityLogRepo.create({
      action: 'EMPLOYEE_LOGIN',
      targetResource: 'User',
      targetId: user.id,
      details: `${user.name} (${user.email}) logged in`,
      category: 'Approvals',
      userId: user.id,
    });

    // Generate tokens with organizationId
    const payload: JwtPayload = {
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role.name,
      organizationId: updatedUser.organizationId || undefined,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token
    await userRepository.updateRefreshToken(updatedUser.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(updatedUser),
    };
  }

  /**
   * Handle Google OAuth callback — exchange code for tokens, find/create user
   */
  async handleGoogleAuth(code: string) {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new AppError('Failed to exchange Google authorization code', 400);
    }

    // 2. Fetch user profile from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await profileResponse.json() as { id?: string; email?: string; name?: string; picture?: string };
    if (!profileResponse.ok || !profile.email) {
      throw new AppError('Failed to fetch Google user profile', 400);
    }

    const { id: googleId, email, name, picture } = profile as { id: string; email: string; name: string; picture: string };

    // 3. Check if user exists by googleId
    let user = await userRepository.findByGoogleId(googleId);

    if (!user) {
      // 4. Check if user exists by email (existing local account)
      user = await userRepository.findByEmail(email);

      if (user) {
        // Link Google account to existing user
        user = await userRepository.update(user.id, {
          googleId,
          provider: user.provider === 'local' ? 'local' : 'google',
          avatar: user.avatar || picture,
        });
      } else {
        // 5. Create new Employee account
        const employeeRole = await userRepository.getRoleByName('Employee');
        if (!employeeRole) {
          throw new AppError('System error: Employee role not found', 500);
        }

        user = await userRepository.create({
          name: name || email.split('@')[0],
          email,
          password: null,
          provider: 'google',
          googleId,
          role: { connect: { id: employeeRole.id } },
          avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name || email)}`,
        });
      }
    }

    // Check status
    if (user.status === 'INACTIVE') {
      throw new AppError('Account has been deactivated. Contact administrator.', 403);
    }

    // 6. Generate JWT tokens with organizationId
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: user.organizationId || undefined,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store refresh token
    await userRepository.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  /**
   * Refresh token rotation
   */
  async refreshTokens(currentRefreshToken: string) {
    // Verify the refresh token
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(currentRefreshToken);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    // Find user by refresh token
    const user = await userRepository.findByRefreshToken(currentRefreshToken);
    if (!user) {
      // Token reuse detected — invalidate all tokens for this user
      await userRepository.updateRefreshToken(payload.userId, null);
      throw new AppError('Refresh token has been revoked', 401);
    }

    // Fetch full user to get organizationId
    const fullUser = await userRepository.findById(user.id);

    // Generate new tokens
    const newPayload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.name,
      organizationId: fullUser?.organizationId || undefined,
    };

    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    // Rotate refresh token
    await userRepository.updateRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout — clear refresh token
   */
  async logout(userId: string) {
    await userRepository.updateRefreshToken(userId, null);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return this.sanitizeUser(user);
  }

  /**
   * Change password (self-service, used by employees on first login)
   */
  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.password) {
      throw new AppError('Cannot change password for OAuth accounts', 400);
    }

    // Verify current password
    const isValid = await comparePassword(input.currentPassword, user.password);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 401);
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(input.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forcePasswordChange: false,
        passwordUpdatedAt: new Date(),
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Admin Forgot Password Request — generates secure token and dispatches reset link email via Resend
   */
  async forgotPassword(email: string) {
    const genericMsg = 'If a Company Administrator account with that email exists, a password reset link has been sent.';

    const user = await userRepository.findByEmail(email);
    if (!user || user.isDeleted || user.role.name !== 'Administrator') {
      return { message: genericMsg };
    }

    // Generate cryptographically secure raw token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash token for secure storage
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 1 hour
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpires: tokenExpires,
      },
    });

    const resetUrl = `${env.APP_URL}/reset-password?token=${rawToken}`;

    // Send email asynchronously (non-blocking)
    emailService.sendAdminPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      organizationName: user.organization?.name,
    }).catch((err: any) => console.error('[Email Dispatch Warning] Failed to send admin password reset email:', err));

    // Log Activity
    await activityLogRepo.create({
      action: 'FORGOT_PASSWORD_REQUESTED',
      targetResource: 'User',
      targetId: user.id,
      details: `Admin password reset requested for email: ${user.email}`,
      category: 'Security',
      userId: user.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
    });

    // Create Notification
    await notificationRepo.create({
      type: 'GENERAL',
      message: `Password reset request received for ${user.email}`,
      userId: user.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
    });

    return { message: genericMsg };
  }

  /**
   * Reset Admin Password using token
   */
  async resetPassword(input: { token: string; newPassword: string }) {
    const { token, newPassword } = input;

    // Hash token to match stored database hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by valid unexpired token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpires: { gt: new Date() },
        isDeleted: false,
      },
      include: { organization: true },
    });

    if (!user) {
      throw new AppError('Invalid or expired password reset token. Please request a new link.', 400);
    }

    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpires: null,
        refreshToken: null, // Revoke active sessions
        forcePasswordChange: false,
        passwordUpdatedAt: new Date(),
        failedLoginAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });

    // Log Activity
    await activityLogRepo.create({
      action: 'PASSWORD_RESET_SUCCESS',
      targetResource: 'User',
      targetId: user.id,
      details: `Admin password reset completed successfully for ${user.email}`,
      category: 'Security',
      userId: user.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
    });

    // Create Notification
    await notificationRepo.create({
      type: 'GENERAL',
      message: 'Your administrator password was reset successfully.',
      userId: user.id,
      ...(user.organizationId ? { organizationId: user.organizationId } : {}),
    });

    return { message: 'Password reset successful. Please log in with your new password.' };
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: any) {
    const { password, refreshToken, ...safe } = user;
    return {
      id: safe.id,
      name: safe.name,
      email: safe.email,
      username: safe.name, // Frontend compatibility
      avatar: safe.avatar,
      status: safe.status,
      is_active: safe.status === 'ACTIVE',
      role: safe.role?.name || 'Employee',
      department: safe.department?.name || null,
      departmentId: safe.departmentId,
      organizationId: safe.organizationId || null,
      organization: safe.organization ? {
        id: safe.organization.id,
        name: safe.organization.name,
        slug: safe.organization.slug,
        logo: safe.organization.logo,
        industry: safe.organization.industry,
        companySize: safe.organization.companySize,
        country: safe.organization.country,
        timezone: safe.organization.timezone,
        currency: safe.organization.currency,
        onboardingStep: safe.organization.onboardingStep,
        onboardingCompleted: safe.organization.onboardingCompleted,
      } : null,
      isOrganizationOwner: safe.isOrganizationOwner || false,
      onboardingStep: safe.organization ? safe.organization.onboardingStep : 'ORGANIZATION',
      onboardingCompleted: safe.organization ? safe.organization.onboardingCompleted : false,
      provider: safe.provider || 'local',
      forcePasswordChange: safe.forcePasswordChange ?? false,
      mustChangePassword: safe.forcePasswordChange ?? false,
      isLocked: safe.isLocked || false,
      passwordUpdatedAt: safe.passwordUpdatedAt || null,
      employeeId: safe.employeeId || null,
      phone: safe.phone || null,
      designation: safe.designation || null,
      employmentType: safe.employmentType || null,
      lastLoginAt: safe.lastLoginAt || null,
      created_at: safe.createdAt,
      createdAt: safe.createdAt,
      updatedAt: safe.updatedAt,
    };
  }
}

export default new AuthService();
