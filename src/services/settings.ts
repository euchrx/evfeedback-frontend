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