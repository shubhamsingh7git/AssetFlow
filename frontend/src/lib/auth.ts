/**
 * DARE Authentication Service for AssetFlow
 * Handles JWT token storage, login, admin register, Google OAuth, and auth state.
 * Connected to the Express backend — no mock fallbacks.
 */

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = rawApiUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
const TOKEN_KEY = "dare_token";
const USER_KEY = "dare_user";

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  name?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  role?: "Employee" | "Department Head" | "Asset Manager" | "Administrator";
  department?: string | null;
  departmentId?: string | null;
  provider?: string;
  organizationId?: string | null;
  isOrganizationOwner?: boolean;
  onboardingCompleted?: boolean;
  onboardingStep?: string;
  forcePasswordChange?: boolean;
  organization?: {
    id: string;
    name: string;
    slug?: string;
    logo?: string;
    industry?: string;
    companySize?: string;
    country?: string;
    timezone?: string;
    currency?: string;
    onboardingStep?: string;
    onboardingCompleted?: boolean;
  } | null;
}

// ─── Token Storage ──────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

// ─── Cached User ────────────────────────────────────────────────────────────

export function getCachedUser(): UserResponse | null {
  const data = localStorage.getItem(USER_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

export function cacheUser(user: UserResponse): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// ─── API Calls (Real Backend) ───────────────────────────────────────────────

/**
 * Company Admin Registration — creates Organization + Admin User
 */
export async function adminRegister(
  companyName: string,
  adminName: string,
  email: string,
  password: string
): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE}/api/auth/admin-register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ companyName, adminName, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.detail || `Registration failed (${response.status})`);
  }

  const result = data.data || data;
  setToken(result.access_token);

  if (result.user) {
    cacheUser(result.user);
  } else {
    try {
      const user = await getCurrentUser();
      cacheUser(user);
    } catch {
      // Non-critical
    }
  }

  return {
    access_token: result.access_token,
    token_type: result.token_type || "bearer",
  };
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.detail || `Login failed (${response.status})`);
  }

  // The backend returns { success, data: { access_token, user } }
  const result = data.data || data;
  setToken(result.access_token);

  if (result.user) {
    cacheUser(result.user);
  } else {
    // Fetch and cache user profile
    try {
      const user = await getCurrentUser();
      cacheUser(user);
    } catch {
      // Non-critical — we have the token
    }
  }

  return {
    access_token: result.access_token,
    token_type: result.token_type || "bearer",
  };
}

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }
    throw new Error("Failed to fetch user profile");
  }

  const data = await response.json();
  // Backend wraps in { success, data: user }
  return data.data || data;
}

export function logout(): void {
  // Fire-and-forget backend logout to clear refresh cookie
  fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
    credentials: "include",
  }).catch(() => {});
  clearToken();
}

// ─── Google OAuth ───────────────────────────────────────────────────────────

/**
 * Returns the URL to redirect the browser to for Google OAuth consent.
 * This hits the backend endpoint which constructs the Google URL and redirects.
 */
export function getGoogleAuthUrl(): string {
  return `${API_BASE}/api/auth/google`;
}

/**
 * Handle the token received from Google OAuth callback redirect.
 * Stores the token and fetches the user profile.
 */
export async function handleGoogleCallback(token: string): Promise<UserResponse> {
  setToken(token);

  const user = await getCurrentUser();
  cacheUser(user);

  return user;
}
