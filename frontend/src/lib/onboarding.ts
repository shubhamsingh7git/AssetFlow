/**
 * Onboarding & Organization Service API helper for AssetFlow ERP
 */

import { getAuthHeaders, cacheUser } from './auth';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawApiUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');

export interface OrganizationData {
  name: string;
  logo?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  timezone?: string;
  currency?: string;
  address?: string;
  website?: string;
  description?: string;
}

export interface OnboardingStatusResponse {
  hasOrganization: boolean;
  organization?: {
    id: string;
    name: string;
    currency?: string;
    industry?: string;
  };
  step: 'ORGANIZATION' | 'DEPARTMENTS' | 'EMPLOYEES' | 'ASSETS' | 'COMPLETED';
  completed: boolean;
  isOwner?: boolean;
  counts: {
    departments: number;
    employees: number;
    assets: number;
  };
}

export async function getOnboardingStatus(): Promise<OnboardingStatusResponse> {
  const res = await fetch(`${API_BASE}/api/onboarding/status`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to fetch onboarding status');
  }
  return data.data || data;
}

export async function updateOnboardingStatus(
  step: 'ORGANIZATION' | 'DEPARTMENTS' | 'EMPLOYEES' | 'ASSETS' | 'COMPLETED',
  completed?: boolean
) {
  const res = await fetch(`${API_BASE}/api/onboarding/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ step, completed }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to update onboarding status');
  }

  // Refresh cached user profile
  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { ...getAuthHeaders() },
      credentials: 'include',
    });
    if (meRes.ok) {
      const meData = await meRes.json();
      if (meData.data) cacheUser(meData.data);
    }
  } catch {
    // Non-critical
  }

  return data.data || data;
}

export async function createOrganization(input: OrganizationData) {
  const res = await fetch(`${API_BASE}/api/organizations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(input),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create organization');
  }

  if (data.data?.user) {
    cacheUser(data.data.user);
  }

  return data.data || data;
}

export async function createSetupDepartment(name: string, description?: string) {
  const res = await fetch(`${API_BASE}/api/departments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ name, description }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Failed to create department "${name}"`);
  }
  return data.data || data;
}

export async function createSetupEmployee(employee: {
  name: string;
  email: string;
  department?: string;
  role?: string;
  jobTitle?: string;
  phone?: string;
}) {
  const res = await fetch(`${API_BASE}/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(employee),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Failed to create employee "${employee.name}"`);
  }
  return data.data || data;
}

export async function createSetupAsset(asset: {
  assetName: string;
  category: string;
  assetId?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  vendor?: string;
  warranty?: string;
  department?: string;
  location?: string;
}) {
  const res = await fetch(`${API_BASE}/api/assets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(asset),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Failed to register asset "${asset.assetName}"`);
  }
  return data.data || data;
}
