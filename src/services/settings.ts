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

export type SendTestEmailResponse = {
  recipients: string[];
  message?: string;
};

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

function buildCompanyParams(companyId?: string) {
  return companyId ? { companyId } : undefined;
}

export async function getMySettings(companyId?: string): Promise<Settings> {
  const response = await api.get("/settings/me", {
    params: buildCompanyParams(companyId),
  });

  return response.data as Settings;
}

export async function updateMySettings(
  payload: UpdateSettingsPayload,
  companyId?: string,
): Promise<Settings> {
  const response = await api.patch("/settings/me", payload, {
    params: buildCompanyParams(companyId),
  });

  return response.data as Settings;
}

export async function sendTestEmail(
  companyId?: string,
): Promise<SendTestEmailResponse> {
  const response = await api.post(
    "/settings/test-email",
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as SendTestEmailResponse;
}

export async function getAppApkInfo(companyId?: string): Promise<AppApkInfo> {
  const response = await api.get("/settings/app-apk", {
    params: buildCompanyParams(companyId),
  });

  return response.data as AppApkInfo;
}

export async function uploadAppApk(
  file: File,
  companyId?: string,
): Promise<AppApkInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/settings/app-apk", formData, {
    params: buildCompanyParams(companyId),
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data as AppApkInfo;
}