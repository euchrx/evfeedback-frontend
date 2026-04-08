import axios from "axios";
import { readAuthToken } from "./authToken";

const baseURL = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const url = config.url ?? "";

  const isPublicKioskRoute =
    url.startsWith("/kiosk/config") ||
    url.startsWith("/kiosk/tags") ||
    url.startsWith("/kiosk/feedback");

  if (!isPublicKioskRoute) {
    const token = readAuthToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization;
  }

  return config;
});