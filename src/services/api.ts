import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuthSession, getAuthToken } from "./auth";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL,
});

function isPublicKioskRoute(url?: string) {
  if (!url) return false;

  return (
    url.startsWith("/kiosk/config") ||
    url.startsWith("/kiosk/tags") ||
    url.startsWith("/kiosk/feedback")
  );
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  const publicRoute = isPublicKioskRoute(config.url);

  if (publicRoute) {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    return config;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearAuthSession();
    }

    return Promise.reject(error);
  },
);