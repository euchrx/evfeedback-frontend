import { api } from "./api";
import type { AuthUser } from "../utils/permissions";
import { isSuperAdmin as checkIsSuperAdmin } from "../utils/permissions";

export type { AuthUser } from "../utils/permissions";
export type UserRole = AuthUser["role"];

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

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post("/auth/login", payload);
  const data = response.data as LoginResponse;

  if (data?.access_token) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
  }

  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await api.get("/auth/me");
  const data = response.data as AuthUser;

  if (data) {
    localStorage.setItem(USER_KEY, JSON.stringify(data));
  }

  return data;
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

export function setStoredUser(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(USER_KEY);
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isSuperAdmin() {
  return checkIsSuperAdmin(getStoredUser());
}