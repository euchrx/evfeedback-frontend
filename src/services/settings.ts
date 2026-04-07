import { api } from "./api";

export type CompanySettings = {
  id: string;
  companyId: string;
  companyName?: string | null;
  logoUrl?: string | null;
  thankYouMessage?: string | null;
  primaryColor?: string | null;
  kioskResetSeconds: number;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  backgroundColor?: string | null;
  backgroundImageUrl?: string | null;
  cardBackgroundColor?: string | null;
  textColor?: string | null;
  buttonTextColor?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateCompanySettingsInput = {
  companyName?: string;
  logoUrl?: string;
  thankYouMessage?: string;
  primaryColor?: string;
  kioskResetSeconds?: number;
  heroTitle?: string;
  heroSubtitle?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  cardBackgroundColor?: string;
  textColor?: string;
  buttonTextColor?: string;
};

export async function getMySettings(): Promise<CompanySettings> {
  const response = await api.get("/settings/me");
  return response.data;
}

export async function updateMySettings(
  payload: UpdateCompanySettingsInput,
): Promise<CompanySettings> {
  const response = await api.patch("/settings/me", payload);
  return response.data;
}

export async function getCompanySettings(
  companyId: string,
): Promise<CompanySettings> {
  const response = await api.get(`/settings/company/${companyId}`);
  return response.data;
}

export async function updateCompanySettings(
  companyId: string,
  payload: UpdateCompanySettingsInput,
): Promise<CompanySettings> {
  const response = await api.patch(`/settings/company/${companyId}`, payload);
  return response.data;
}