/**
 * AssetFlow — Centralized API Client
 * All authenticated data fetching for Dashboard & Admin Portal.
 * Single source of truth for frontend ↔ backend communication.
 */

import { getAuthHeaders, setToken, clearToken } from './auth';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Generic Helpers ────────────────────────────────────────────────────────

async function apiFetch<T = any>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
    credentials: 'include',
    ...options,
  });

  // Handle 401 token expiration with automatic refresh retry
  if (res.status === 401 && !isRetry && !path.includes('/api/auth/')) {
    try {
      const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newAccessToken = refreshData.data?.access_token || refreshData.access_token;
        if (newAccessToken) {
          setToken(newAccessToken);
          // Retry original request with new access token
          return apiFetch<T>(path, options, true);
        }
      }
    } catch {
      clearToken();
    }
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    console.error(`[API Error] Non-JSON response for ${path} (${res.status}):`, text.slice(0, 200));
    throw new Error(`API ${path} returned non-JSON response (${res.status}). Expected JSON response.`);
  }

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.message || json.error || `Request failed (${res.status})`);
  }

  return json.data ?? json;
}

async function apiGet<T = any>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

async function apiPost<T = any>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

async function apiPatch<T = any>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
}

async function apiDelete<T = any>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function fetchDashboardStats() {
  return apiGet('/api/dashboard/stats');
}

export function fetchAdminStats() {
  return apiGet('/api/dashboard/admin-stats');
}

export function fetchUtilization() {
  return apiGet<{ department: string; employeeCount: number; allocatedAssets: number }[]>('/api/dashboard/utilization');
}

export function fetchMaintenanceFrequency() {
  return apiGet<{ month: string; count: number }[]>('/api/dashboard/maintenance-frequency');
}

export function fetchMostUsedAssets() {
  return apiGet<{ resource: string; bookings: number }[]>('/api/dashboard/most-used');
}

export function fetchRecentActivity(limit = 20) {
  return apiGet(`/api/dashboard/recent-activity?limit=${limit}`);
}

// ─── Departments ────────────────────────────────────────────────────────────

export function fetchDepartments() {
  return apiGet('/api/departments');
}

export function createDepartment(data: { name: string; description?: string; parentId?: string; headId?: string }) {
  return apiPost('/api/departments', data);
}

export function updateDepartment(id: string, data: { name?: string; description?: string; parentId?: string; headId?: string }) {
  return apiPatch(`/api/departments/${id}`, data);
}

export function toggleDepartmentStatus(id: string) {
  return apiPatch(`/api/departments/${id}/status`);
}

export function deleteDepartment(id: string) {
  return apiDelete(`/api/departments/${id}`);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export function fetchCategories() {
  return apiGet('/api/categories');
}

export function createCategory(data: { name: string; description?: string; iconName?: string; customFields?: { name: string; type: string; required: boolean }[] }) {
  return apiPost('/api/categories', data);
}

export function updateCategory(id: string, data: { name?: string; description?: string; iconName?: string; status?: string; customFields?: { name: string; type: string; required: boolean }[] }) {
  return apiPatch(`/api/categories/${id}`, data);
}

export function deleteCategory(id: string) {
  return apiDelete(`/api/categories/${id}`);
}

// ─── Employees (Users) ──────────────────────────────────────────────────────

export function fetchEmployees() {
  return apiGet('/api/users');
}

export function createEmployee(data: { name: string; email: string; department?: string; role?: string; jobTitle?: string; phone?: string }) {
  return apiPost('/api/users', data);
}

export function updateEmployee(id: string, data: Record<string, unknown>) {
  return apiPatch(`/api/users/${id}`, data);
}

export function assignRole(id: string, role: string) {
  return apiPatch(`/api/users/${id}/role`, { role });
}

export function toggleEmployeeStatus(id: string) {
  return apiPatch(`/api/users/${id}/status`);
}

export function deleteEmployee(id: string) {
  return apiDelete(`/api/users/${id}`);
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export function fetchAssets(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiGet(`/api/assets${qs}`);
}

export function fetchAssetById(id: string) {
  return apiGet(`/api/assets/${id}`);
}

export function generateAssetTag() {
  return apiGet<{ tag: string }>('/api/assets/generate-tag');
}

export function createAsset(data: Record<string, unknown>) {
  return apiPost('/api/assets', data);
}

export const registerAsset = createAsset;

export function updateAsset(id: string, data: Record<string, unknown>) {
  return apiPatch(`/api/assets/${id}`, data);
}

export function deleteAsset(id: string) {
  return apiDelete(`/api/assets/${id}`);
}

export function fetchAssetHistory(id: string) {
  return apiGet(`/api/assets/${id}/history`);
}

export function createAllocation(data: { assetId: string; userId: string; allocatedAt?: string; returnDate?: string; notes?: string }) {
  return apiPost('/api/allocations', data);
}

export function returnAllocation(id: string, condition: string) {
  return apiPost(`/api/allocations/${id}/return`, { condition });
}

export function fetchAllocationHistory(assetId: string) {
  return apiGet(`/api/allocations/history/${assetId}`);
}

export function fetchTransfers() {
  return apiGet('/api/allocations/transfers');
}

export function createTransfer(data: { assetId: string; toUserId: string; reason?: string }) {
  return apiPost('/api/allocations/transfers', data);
}

export function approveTransfer(id: string) {
  return apiPatch(`/api/allocations/transfers/${id}/approve`);
}

export function rejectTransfer(id: string) {
  return apiPatch(`/api/allocations/transfers/${id}/reject`);
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export function fetchBookings() {
  return apiGet('/api/bookings');
}

export function fetchBookingSlots(resourceName: string, date: string) {
  return apiGet(`/api/bookings/slots?resourceName=${encodeURIComponent(resourceName)}&date=${encodeURIComponent(date)}`);
}

export function createBooking(data: { resourceName: string; resourceType?: string; date: string; startTime: string; endTime: string; notes?: string; assetId?: string }) {
  return apiPost('/api/bookings', data);
}

export function cancelBooking(id: string) {
  return apiPatch(`/api/bookings/${id}/cancel`);
}

// ─── Maintenance ────────────────────────────────────────────────────────────

export function fetchMaintenanceTickets() {
  return apiGet('/api/maintenance');
}

export function fetchMaintenanceById(id: string) {
  return apiGet(`/api/maintenance/${id}`);
}

export function createMaintenance(data: { assetId: string; issue: string }) {
  return apiPost('/api/maintenance', data);
}

export function advanceMaintenance(id: string, data?: { technicianName?: string; notes?: string }) {
  return apiPatch(`/api/maintenance/${id}/advance`, data || {});
}

export function deleteMaintenance(id: string) {
  return apiDelete(`/api/maintenance/${id}`);
}

// ─── Audits ─────────────────────────────────────────────────────────────────

export function fetchAudits() {
  return apiGet('/api/audits');
}

export function fetchAuditById(id: string) {
  return apiGet(`/api/audits/${id}`);
}

export function createAudit(data: { name: string; department: string; startDate: string; endDate: string; assetIds: string[] }) {
  return apiPost('/api/audits', data);
}

export function updateAuditItem(auditId: string, itemId: string, status: string) {
  return apiPatch(`/api/audits/${auditId}/items/${itemId}`, { status });
}

export function closeAuditCycle(id: string) {
  return apiPatch(`/api/audits/${id}/close`);
}

export function fetchDiscrepancyReport(id: string) {
  return apiGet(`/api/audits/${id}/discrepancy-report`);
}

// ─── Notifications ──────────────────────────────────────────────────────────

export function fetchNotifications() {
  return apiGet('/api/notifications');
}

export function fetchUnreadCount() {
  return apiGet<{ count: number }>('/api/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiPatch(`/api/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiPatch('/api/notifications/read-all');
}

// ─── Activity Logs ──────────────────────────────────────────────────────────

export function fetchActivityLogs() {
  return apiGet('/api/activity-logs');
}

// ─── Organization ───────────────────────────────────────────────────────────

export function fetchOrganization() {
  return apiGet('/api/organizations');
}

export function updateOrganization(data: Record<string, unknown>) {
  return apiPatch('/api/organizations', data);
}

// ─── Employee Management (Admin) ────────────────────────────────────────────

export function fetchEmployeeList(params?: Record<string, string>) {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`/api/employees${qs}`);
}

export function createEmployeeAccount(data: {
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  employeeId?: string;
  departmentId?: string;
  roleName?: string;
  designation?: string;
  employmentType?: string;
  joiningDate?: string;
  managerId?: string;
  status?: string;
  forcePasswordChange?: boolean;
}) {
  return apiPost('/api/employees', data);
}

export function getEmployeeProfile(id: string) {
  return apiGet(`/api/employees/${id}/profile`);
}

export function updateEmployeeAccount(id: string, data: Record<string, unknown>) {
  return apiPatch(`/api/employees/${id}`, data);
}

export function resetEmployeePassword(id: string, data?: { newPassword?: string; confirmPassword?: string }) {
  return apiPatch(`/api/employees/${id}/reset-password`, data || {});
}

export function toggleEmployeeAccountStatus(id: string) {
  return apiPatch(`/api/employees/${id}/status`);
}

export function toggleEmployeeLockStatus(id: string) {
  return apiPatch(`/api/employees/${id}/lock`);
}

export function deleteEmployeeAccount(id: string) {
  return apiDelete(`/api/employees/${id}`);
}

export function resendEmployeeWelcomeEmail(id: string) {
  return apiPost(`/api/employees/${id}/resend-welcome`, {});
}

// ─── Self-Service Auth ──────────────────────────────────────────────────────

export function changePassword(data: { currentPassword: string; newPassword: string; confirmPassword: string }) {
  return apiPost('/api/auth/change-password', data);
}

// ─── Employee Portal APIs ───────────────────────────────────────────────────

export function fetchEmployeeDashboardStats() {
  return apiGet('/api/dashboard/employee-stats');
}

export function fetchEmployeeActivity(limit = 20) {
  return apiGet(`/api/dashboard/employee-activity?limit=${limit}`);
}

export function fetchMyAssets() {
  return apiGet('/api/assets/my-assets');
}

export function fetchMyBookings() {
  return apiGet('/api/bookings/my-bookings');
}

export function fetchMyMaintenanceTickets() {
  return apiGet('/api/maintenance/my-tickets');
}

export function fetchMyTransfers() {
  return apiGet('/api/allocations/my-transfers');
}

export function createEmployeeTransferRequest(data: { assetId: string; reason?: string }) {
  return apiPost('/api/allocations/transfer-request', data);
}

export function fetchMyProfile() {
  return apiGet('/api/employees/me/profile');
}

export function updateMyProfile(data: { phone?: string; avatar?: string }) {
  return apiPatch('/api/employees/me/profile', data);
}

// ─── Asset Requests & Booking Approval APIs ─────────────────────────────────

export function fetchAvailableAssets() {
  return apiGet('/api/assets?status=AVAILABLE');
}

export function submitAssetRequest(data: { assetId: string; reason?: string }) {
  return apiPost('/api/asset-requests', data);
}

export function fetchAssetRequests(status?: string) {
  const query = status ? `?status=${status}` : '';
  return apiGet(`/api/asset-requests${query}`);
}

export function fetchMyAssetRequests() {
  return apiGet('/api/asset-requests/my-requests');
}

export function approveAssetRequest(id: string) {
  return apiPatch(`/api/asset-requests/${id}/approve`);
}

export function rejectAssetRequest(id: string) {
  return apiPatch(`/api/asset-requests/${id}/reject`);
}

export function approveBooking(id: string) {
  return apiPatch(`/api/bookings/${id}/approve`);
}

export function rejectBooking(id: string) {
  return apiPatch(`/api/bookings/${id}/reject`);
}

export function updateMaintenanceStatus(id: string, status: string, technicianName?: string, notes?: string) {
  return apiPatch(`/api/maintenance/${id}/status`, { status, technicianName, notes });
}

export function forgotPassword(email: string) {
  return apiPost('/api/auth/forgot-password', { email });
}

export function resetAdminPassword(data: { token: string; newPassword: string; confirmPassword: string }) {
  return apiPost('/api/auth/reset-password', data);
}


