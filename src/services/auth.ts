import { api } from "./api";
import { hasAuthToken, readAuthToken, removeAuthToken, saveAuthToken } from "./authToken";
import type { AuthUser } from "../utils/permissions";

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

const USER_KEY = "evfeedback_user";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveStoredUser(user: AuthUser) {
  if (!canUseStorage()) return;

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredUser() {
  if (!canUseStorage()) return;

  localStorage.removeItem(USER_KEY);
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post("/auth/login", payload);
  const data = response.data as LoginResponse;

  if (data?.access_token) {
    saveAuthToken(data.access_token);
  } else {
    removeAuthToken();
  }

  if (data?.user) {
    saveStoredUser(data.user);
  } else {
    removeStoredUser();
  }

  return data;
}

export async function fetchMe(): Promise<AuthUser> {
  const response = await api.get("/auth/me");
  const user = response.data as AuthUser;

  if (user) {
    saveStoredUser(user);
  }

  return user;
}

export function getAuthToken() {
  return readAuthToken();
}

export function getStoredUser(): AuthUser | null {
  if (!canUseStorage()) return null;

  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    removeStoredUser();
    return null;
  }
}

export function isAuthenticated() {
  return hasAuthToken() && !!getStoredUser();
}

export function clearAuthSession() {
  removeAuthToken();
  removeStoredUser();
}

export function logout() {
  clearAuthSession();
}