import { api } from "./api";

export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  active?: boolean;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

const TOKEN_KEY = "evfeedback_token";
const USER_KEY = "evfeedback_user";

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  const data = response.data;

  if (data?.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
  }

  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  return data;
}

export async function fetchMe() {
  const response = await api.get<AuthUser>("/auth/me");

  if (response.data) {
    localStorage.setItem(USER_KEY, JSON.stringify(response.data));
  }

  return response.data;
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!getAuthToken() && !!getStoredUser();
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isSuperAdmin() {
  return getStoredUser()?.role === "SUPER_ADMIN";
}