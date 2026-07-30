// ─── Centralized Resend Email Service ──────────────────────────────────────────
// Official Resend Node.js SDK integration for enterprise ERP email dispatches.
// Asynchronous, fail-safe architecture to ensure emails never block database transactions.

import { Resend } from 'resend';
import env from '../config/env';
import * as templates from '../utils/emailTemplates';

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = env.EMAIL_FROM || 'AssetFlow <onboarding@resend.dev>';
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
      console.log('📧 Resend EmailService initialized');
    } else {
      console.log('⚠️ RESEND_API_KEY not set — EmailService operating in log-only fallback mode');
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!to || !to.includes('@')) {
        console.warn(`[EmailService] Invalid recipient email address: ${to}`);
        return false;
      }

      if (!this.resend) {
        console.log(`[EmailService Log-Only] To: ${to} | Subject: "${subject}" | (Set RESEND_API_KEY to send live emails)`);
        return true;
      }

      console.log(`[EmailService] Sending email to ${to} ("${subject}")...`);
      const response = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject,
        html,
      });

      if (response.error) {
        console.error(`[EmailService Error] Failed to send email to ${to}:`, response.error);
        return false;
      }

      console.log(`[EmailService Success] Email sent to ${to} (ID: ${response.data?.id})`);
      return true;
    } catch (err: any) {
      console.error(`[EmailService Error] Unexpected exception sending email to ${to}:`, err?.message || err);
      return false;
    }
  }

  // ─── Public Notification Methods ──────────────────────────────────────────

  async sendWelcomeEmail(params: {
    to: string;
    name: string;
    tempPassword?: string;
    organizationName?: string;
  }) {
    const html = templates.buildWelcomeEmail({
      name: params.name,
      email: params.to,
      tempPassword: params.tempPassword,
      organizationName: params.organizationName,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, 'Welcome to AssetFlow ERP', html);
  }

  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    tempPassword: string;
  }) {
    const html = templates.buildPasswordResetEmail({
      name: params.name,
      tempPassword: params.tempPassword,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, 'AssetFlow ERP — Password Reset', html);
  }

  async sendAssetAllocatedEmail(params: {
    to: string;
    name: string;
    assetTag: string;
    assetName: string;
    allocatedAt: string;
    notes?: string;
  }) {
    const html = templates.buildAssetAllocatedEmail({
      name: params.name,
      assetTag: params.assetTag,
      assetName: params.assetName,
      allocatedAt: params.allocatedAt,
      notes: params.notes,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Asset Allocated: ${params.assetName} (${params.assetTag})`, html);
  }

  async sendAssetReturnedEmail(params: {
    to: string;
    name: string;
    assetTag: string;
    assetName: string;
    returnedAt: string;
  }) {
    const html = templates.buildAssetReturnedEmail({
      name: params.name,
      assetTag: params.assetTag,
      assetName: params.assetName,
      returnedAt: params.returnedAt,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Asset Returned: ${params.assetName} (${params.assetTag})`, html);
  }

  async sendBookingApprovedEmail(params: {
    to: string;
    name: string;
    resourceName: string;
    date: string;
    timeSlot: string;
  }) {
    const html = templates.buildBookingApprovedEmail({
      name: params.name,
      resourceName: params.resourceName,
      date: params.date,
      timeSlot: params.timeSlot,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Booking Confirmed: ${params.resourceName}`, html);
  }

  async sendBookingRejectedEmail(params: {
    to: string;
    name: string;
    resourceName: string;
    date: string;
    timeSlot: string;
    reason?: string;
  }) {
    const html = templates.buildBookingRejectedEmail({
      name: params.name,
      resourceName: params.resourceName,
      date: params.date,
      timeSlot: params.timeSlot,
      reason: params.reason,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Booking Rejected: ${params.resourceName}`, html);
  }

  async sendMaintenanceApprovedEmail(params: {
    to: string;
    name: string;
    assetTag: string;
    assetName: string;
    issue: string;
  }) {
    const html = templates.buildMaintenanceApprovedEmail({
      name: params.name,
      assetTag: params.assetTag,
      assetName: params.assetName,
      issue: params.issue,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Maintenance Approved: ${params.assetTag}`, html);
  }

  async sendMaintenanceTechnicianAssignedEmail(params: {
    to: string;
    name: string;
    assetTag: string;
    assetName: string;
    technicianName: string;
  }) {
    const html = templates.buildMaintenanceTechnicianAssignedEmail({
      name: params.name,
      assetTag: params.assetTag,
      assetName: params.assetName,
      technicianName: params.technicianName,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Technician Dispatched: ${params.assetTag}`, html);
  }

  async sendMaintenanceResolvedEmail(params: {
    to: string;
    name: string;
    assetTag: string;
    assetName: string;
    resolutionNotes?: string;
  }) {
    const html = templates.buildMaintenanceResolvedEmail({
      name: params.name,
      assetTag: params.assetTag,
      assetName: params.assetName,
      resolutionNotes: params.resolutionNotes,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Maintenance Resolved: ${params.assetTag}`, html);
  }

  async sendTransferApprovedEmail(params: {
    to: string;
    name: string;
    assetTag: string;
    assetName: string;
    fromUser: string;
    toUser: string;
  }) {
    const html = templates.buildTransferApprovedEmail({
      name: params.name,
      assetTag: params.assetTag,
      assetName: params.assetName,
      fromUser: params.fromUser,
      toUser: params.toUser,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, `Asset Transfer Approved: ${params.assetTag}`, html);
  }

  async sendAccountActivatedEmail(params: {
    to: string;
    name: string;
  }) {
    const html = templates.buildAccountActivatedEmail({
      name: params.name,
      email: params.to,
      loginUrl: env.APP_URL,
    });
    return this.sendEmail(params.to, 'AssetFlow ERP — Account Activated', html);
  }

  async sendAccountDeactivatedEmail(params: {
    to: string;
    name: string;
  }) {
    const html = templates.buildAccountDeactivatedEmail({
      name: params.name,
      email: params.to,
    });
    return this.sendEmail(params.to, 'AssetFlow ERP — Account Deactivated', html);
  }

  async sendAdminPasswordResetEmail(params: {
    to: string;
    name: string;
    resetUrl: string;
    organizationName?: string;
  }) {
    const html = templates.buildAdminForgotPasswordEmail({
      name: params.name,
      resetUrl: params.resetUrl,
      organizationName: params.organizationName,
    });
    return this.sendEmail(params.to, 'AssetFlow ERP — Admin Password Reset Link', html);
  }

  async sendAdminForgotPasswordEmail(params: {
    to: string;
    name: string;
    resetUrl: string;
    organizationName?: string;
  }) {
    return this.sendAdminPasswordResetEmail(params);
  }
}

export const emailService = new EmailService();
export default emailService;
