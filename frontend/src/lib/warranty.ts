// ─── AssetFlow Warranty Reminder & Monitoring Engine ────────────────────────

export interface WarrantyStatusInfo {
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
  daysRemaining: number | null;
  label: string;
  badgeColor: string;
}

/**
 * Evaluates warranty expiry date and returns days remaining & threshold badge.
 */
export function getWarrantyStatus(warrantyExpiry: string | Date | null | undefined): WarrantyStatusInfo {
  if (!warrantyExpiry) {
    return { status: 'UNKNOWN', daysRemaining: null, label: 'No Warranty Data', badgeColor: 'bg-zinc-100 text-zinc-600' };
  }

  const expiry = new Date(warrantyExpiry);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'EXPIRED',
      daysRemaining,
      label: `Expired (${Math.abs(daysRemaining)} days ago)`,
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'
    };
  }

  if (daysRemaining <= 7) {
    return {
      status: 'EXPIRING_SOON',
      daysRemaining,
      label: `Critical: ${daysRemaining} days remaining`,
      badgeColor: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 animate-pulse'
    };
  }

  if (daysRemaining <= 30) {
    return {
      status: 'EXPIRING_SOON',
      daysRemaining,
      label: `Urgent: ${daysRemaining} days remaining`,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
    };
  }

  if (daysRemaining <= 90) {
    return {
      status: 'EXPIRING_SOON',
      daysRemaining,
      label: `Warning: ${daysRemaining} days remaining`,
      badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border border-yellow-300'
    };
  }

  return {
    status: 'ACTIVE',
    daysRemaining,
    label: `Active (${daysRemaining} days remaining)`,
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
  };
}
