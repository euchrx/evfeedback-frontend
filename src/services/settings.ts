import { api } from "./api";

export type Settings = {
  id?: string;
  companyId?: string;
  companyName?: string | null;
  logoUrl?: string | null;
  thankYouMessage?: string | null;
  primaryColor?: string | null;
  kioskResetSeconds?: number;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  textColor?: string | null;
  buttonTextColor?: string | null;
  notificationEmails?: string | null;
  dailyNotificationEnabled?: boolean;
  monthlyNotificationEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AppApkInfo = {
  originalName: string;
  storedName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  downloadPath: string;
  downloadUrl: string;
} | null;

export type UpdateSettingsPayload = {
  companyName?: string | null;
  logoUrl?: string | null;
  thankYouMessage?: string | null;
  primaryColor?: string | null;
  kioskResetSeconds?: number;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  textColor?: string | null;
  buttonTextColor?: string | null;
  notificationEmails?: string | null;
  dailyNotificationEnabled?: boolean;
  monthlyNotificationEnabled?: boolean;
};

export async function getMySettings(companyId?: string): Promise<Settings> {
  const response = await api.get("/settings/me", {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function updateMySettings(
  payload: UpdateSettingsPayload,
  companyId?: string
): Promise<Settings> {
  const response = await api.patch("/settings/me", payload, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function sendTestEmail(companyId?: string) {
  const response = await api.post(
    "/settings/test-email",
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );

  return response.data;
}

export async function getAppApkInfo(): Promise<AppApkInfo> {
  const response = await api.get("/settings/app-apk");
  return response.data;
}

export async function uploadAppApk(file: File): Promise<AppApkInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/settings/app-apk", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
