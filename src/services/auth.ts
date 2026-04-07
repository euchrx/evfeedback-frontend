import { api } from "./api";
import { removeAuthToken, saveAuthToken } from "./authToken";
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

export async function login(payload: LoginPayload) {
  const response = await api.post("/auth/login", payload);
  const data = response.data as LoginResponse;

  if (data?.access_token) {
    saveAuthToken(data.access_token);
  }

  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  return data;
}

export async function fetchMe() {
  const response = await api.get("/auth/me");

  if (response.data) {
    localStorage.setItem(USER_KEY, JSON.stringify(response.data));
  }

  return response.data as AuthUser;
}

export function getAuthToken() {
  return localStorage.getItem("evfeedback_token");
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
  removeAuthToken();
  localStorage.removeItem(USER_KEY);
}