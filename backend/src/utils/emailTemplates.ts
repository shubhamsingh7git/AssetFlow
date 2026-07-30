// ─── AssetFlow HTML Email Templates ──────────────────────────────────────────
// Professional, brand-aligned HTML templates for SaaS ERP notifications.

interface BaseEmailOptions {
  title: string;
  recipientName: string;
  summary: string;
  detailsHtml: string;
  ctaText?: string;
  ctaUrl?: string;
}

function renderBaseTemplate(options: BaseEmailOptions): string {
  const { title, recipientName, summary, detailsHtml, ctaText = 'Log In to AssetFlow', ctaUrl = 'http://localhost:5173' } = options;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #334155; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 32px; text-align: center; }
    .brand { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand span { color: #3b82f6; }
    .subtitle { color: #94a3b8; font-size: 13px; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 36px 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    .summary { font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .details-box { background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px; }
    .details-box table { width: 100%; border-collapse: collapse; }
    .details-box td { padding: 8px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0; }
    .details-box tr:last-child td { border-bottom: none; }
    .label { font-weight: 600; color: #64748b; width: 35%; }
    .value { font-weight: 600; color: #0f172a; word-break: break-word; }
    .cta-container { text-align: center; margin: 32px 0 16px 0; }
    .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 8px; transition: background-color 0.2s; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">Asset<span>Flow</span> ERP</div>
      <div class="subtitle">Enterprise Resource & Asset Lifecycle Platform</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${recipientName},</div>
      <div class="summary">${summary}</div>
      <div class="details-box">
        ${detailsHtml}
      </div>
      ${ctaText && ctaUrl ? `
      <div class="cta-container">
        <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      This is an automated notification from <strong>AssetFlow ERP</strong>.<br>
      If you have questions, please contact your Organization Administrator.<br>&copy; 2026 AssetFlow Enterprise ERP. All rights reserved.
    </div>
  </div>
</body>
</html>
  `;
}

// ─── Template Builders ────────────────────────────────────────────────────────

export function buildWelcomeEmail(params: {
  name: string;
  email: string;
  tempPassword?: string;
  organizationName?: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Organization</td><td class="value">${params.organizationName || 'AssetFlow Enterprise'}</td></tr>
      <tr><td class="label">Work Email</td><td class="value">${params.email}</td></tr>
      ${params.tempPassword ? `<tr><td class="label">Temporary Password</td><td class="value" style="font-family: monospace; background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${params.tempPassword}</td></tr>` : ''}
    </table>
  `;

  return renderBaseTemplate({
    title: 'Welcome to AssetFlow ERP',
    recipientName: params.name,
    summary: `Your employee account has been created for <strong>${params.organizationName || 'your organization'}</strong> on AssetFlow ERP. You can log in using the details below. Please update your password after logging in.`,
    detailsHtml,
    ctaText: 'Access Your Portal',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildPasswordResetEmail(params: {
  name: string;
  tempPassword: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Temporary Password</td><td class="value" style="font-family: monospace; background: #e2e8f0; padding: 4px 8px; border-radius: 4px;">${params.tempPassword}</td></tr>
      <tr><td class="label">Action Required</td><td class="value">Change password upon logging in</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Password Reset Notification',
    recipientName: params.name,
    summary: 'Your account password has been updated by an administrator. Please use the initial password below to log in and set your personal password.',
    detailsHtml,
    ctaText: 'Log In & Update Password',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildAdminForgotPasswordEmail(params: {
  name: string;
  resetUrl: string;
  organizationName?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Organization</td><td class="value">${params.organizationName || 'AssetFlow ERP'}</td></tr>
      <tr><td class="label">Token Security</td><td class="value">Cryptographically Hashed (1 Hour Expiry)</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Admin Password Reset Request',
    recipientName: params.name,
    summary: 'We received a password reset request for your Company Admin account on <strong>AssetFlow ERP</strong>. Click the link below to enter your new password.',
    detailsHtml,
    ctaText: 'Reset Password Now',
    ctaUrl: params.resetUrl,
  });
}

export function buildAssetAllocatedEmail(params: {
  name: string;
  assetTag: string;
  assetName: string;
  allocatedAt: string;
  notes?: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Asset Tag</td><td class="value">${params.assetTag}</td></tr>
      <tr><td class="label">Asset Name</td><td class="value">${params.assetName}</td></tr>
      <tr><td class="label">Allocation Date</td><td class="value">${params.allocatedAt}</td></tr>
      ${params.notes ? `<tr><td class="label">Notes</td><td class="value">${params.notes}</td></tr>` : ''}
    </table>
  `;

  return renderBaseTemplate({
    title: 'Asset Allocated to You',
    recipientName: params.name,
    summary: `An organizational asset has been assigned to you: <strong>${params.assetName} (${params.assetTag})</strong>. Please verify custody in your portal.`,
    detailsHtml,
    ctaText: 'View Allocated Asset',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildAssetReturnedEmail(params: {
  name: string;
  assetTag: string;
  assetName: string;
  returnedAt: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Asset Tag</td><td class="value">${params.assetTag}</td></tr>
      <tr><td class="label">Asset Name</td><td class="value">${params.assetName}</td></tr>
      <tr><td class="label">Return Date</td><td class="value">${params.returnedAt}</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Asset Return Processed',
    recipientName: params.name,
    summary: `The custody record for <strong>${params.assetName} (${params.assetTag})</strong> has been closed as returned. Thank you.`,
    detailsHtml,
    ctaText: 'Check My Assets',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildBookingApprovedEmail(params: {
  name: string;
  resourceName: string;
  date: string;
  timeSlot: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Resource</td><td class="value">${params.resourceName}</td></tr>
      <tr><td class="label">Booking Date</td><td class="value">${params.date}</td></tr>
      <tr><td class="label">Time Slot</td><td class="value">${params.timeSlot}</td></tr>
      <tr><td class="label">Status</td><td class="value" style="color: #16a34a; font-weight: bold;">CONFIRMED</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Resource Booking Confirmed',
    recipientName: params.name,
    summary: `Your reservation request for <strong>${params.resourceName}</strong> on <strong>${params.date}</strong> has been approved by the administration.`,
    detailsHtml,
    ctaText: 'View My Bookings',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildBookingRejectedEmail(params: {
  name: string;
  resourceName: string;
  date: string;
  timeSlot: string;
  reason?: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Resource</td><td class="value">${params.resourceName}</td></tr>
      <tr><td class="label">Booking Date</td><td class="value">${params.date}</td></tr>
      <tr><td class="label">Time Slot</td><td class="value">${params.timeSlot}</td></tr>
      <tr><td class="label">Status</td><td class="value" style="color: #dc2626; font-weight: bold;">REJECTED</td></tr>
      ${params.reason ? `<tr><td class="label">Reason</td><td class="value">${params.reason}</td></tr>` : ''}
    </table>
  `;

  return renderBaseTemplate({
    title: 'Resource Booking Rejected',
    recipientName: params.name,
    summary: `Unfortunately, your booking request for <strong>${params.resourceName}</strong> could not be approved at this time.`,
    detailsHtml,
    ctaText: 'Find Alternate Slots',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildMaintenanceApprovedEmail(params: {
  name: string;
  assetTag: string;
  assetName: string;
  issue: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Asset Tag</td><td class="value">${params.assetTag}</td></tr>
      <tr><td class="label">Asset Name</td><td class="value">${params.assetName}</td></tr>
      <tr><td class="label">Reported Issue</td><td class="value">${params.issue}</td></tr>
      <tr><td class="label">Ticket Status</td><td class="value" style="color: #2563eb; font-weight: bold;">APPROVED</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Maintenance Request Approved',
    recipientName: params.name,
    summary: `Your maintenance ticket for <strong>${params.assetName} (${params.assetTag})</strong> has been approved for repair dispatch.`,
    detailsHtml,
    ctaText: 'Track Maintenance Status',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildMaintenanceTechnicianAssignedEmail(params: {
  name: string;
  assetTag: string;
  assetName: string;
  technicianName: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Asset Tag</td><td class="value">${params.assetTag}</td></tr>
      <tr><td class="label">Asset Name</td><td class="value">${params.assetName}</td></tr>
      <tr><td class="label">Assigned Technician</td><td class="value">${params.technicianName}</td></tr>
      <tr><td class="label">Ticket Status</td><td class="value" style="color: #9333ea; font-weight: bold;">TECHNICIAN ASSIGNED</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Technician Dispatched for Maintenance',
    recipientName: params.name,
    summary: `Technician <strong>${params.technicianName}</strong> has been assigned to investigate and service <strong>${params.assetName} (${params.assetTag})</strong>.`,
    detailsHtml,
    ctaText: 'View Ticket Progress',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildMaintenanceResolvedEmail(params: {
  name: string;
  assetTag: string;
  assetName: string;
  resolutionNotes?: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Asset Tag</td><td class="value">${params.assetTag}</td></tr>
      <tr><td class="label">Asset Name</td><td class="value">${params.assetName}</td></tr>
      ${params.resolutionNotes ? `<tr><td class="label">Resolution Notes</td><td class="value">${params.resolutionNotes}</td></tr>` : ''}
      <tr><td class="label">Ticket Status</td><td class="value" style="color: #16a34a; font-weight: bold;">RESOLVED & AVAILABLE</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Maintenance Ticket Resolved',
    recipientName: params.name,
    summary: `Servicing on <strong>${params.assetName} (${params.assetTag})</strong> has been completed. The item status has returned to <strong>AVAILABLE</strong>.`,
    detailsHtml,
    ctaText: 'View Ticket Record',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildTransferApprovedEmail(params: {
  name: string;
  assetTag: string;
  assetName: string;
  fromUser: string;
  toUser: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Asset Tag</td><td class="value">${params.assetTag}</td></tr>
      <tr><td class="label">Asset Name</td><td class="value">${params.assetName}</td></tr>
      <tr><td class="label">Transferred From</td><td class="value">${params.fromUser}</td></tr>
      <tr><td class="label">Transferred To</td><td class="value">${params.toUser}</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Asset Transfer Completed',
    recipientName: params.name,
    summary: `The transfer request for <strong>${params.assetName} (${params.assetTag})</strong> has been approved and completed.`,
    detailsHtml,
    ctaText: 'View Asset Custody',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildAccountActivatedEmail(params: {
  name: string;
  email: string;
  loginUrl?: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Account Email</td><td class="value">${params.email}</td></tr>
      <tr><td class="label">Account Status</td><td class="value" style="color: #16a34a; font-weight: bold;">ACTIVE</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Your Account is Active',
    recipientName: params.name,
    summary: 'Your AssetFlow ERP account has been activated by your administrator. You can now access all portal tools.',
    detailsHtml,
    ctaText: 'Log In to AssetFlow',
    ctaUrl: params.loginUrl || 'http://localhost:5173',
  });
}

export function buildAccountDeactivatedEmail(params: {
  name: string;
  email: string;
}) {
  const detailsHtml = `
    <table>
      <tr><td class="label">Account Email</td><td class="value">${params.email}</td></tr>
      <tr><td class="label">Account Status</td><td class="value" style="color: #dc2626; font-weight: bold;">DEACTIVATED</td></tr>
    </table>
  `;

  return renderBaseTemplate({
    title: 'Account Status Update',
    recipientName: params.name,
    summary: 'Your account on AssetFlow ERP has been deactivated. If you believe this is an error, please contact your Organization Administrator.',
    detailsHtml,
    ctaText: '',
    ctaUrl: '',
  });
}
