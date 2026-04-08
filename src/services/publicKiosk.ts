import { api } from "./api";

export type PublicKioskConfig = {
  kiosk: {
    id: string;
    name: string;
    token: string;
    branchId: string;
    companyId: string;
    locationDescription?: string | null;
  };
  company: {
    id: string;
    name: string;
  } | null;
  branch: {
    id: string;
    name: string;
  } | null;
  settings: {
    id?: string;
    companyId?: string;
    companyName?: string | null;
    logoUrl?: string | null;
    thankYouMessage?: string | null;
    primaryColor?: string | null;
    kioskResetSeconds?: number | null;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    backgroundColor?: string | null;
    backgroundImageUrl?: string | null;
    cardBackgroundColor?: string | null;
    textColor?: string | null;
    buttonTextColor?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
};

export type PublicKioskTag = {
  id: string;
  name: string;
};

export async function getPublicKioskConfig(
  token: string
): Promise<PublicKioskConfig> {
  const response = await api.get("/kiosk/config", {
    params: { token },
  });

  return response.data;
}

export async function getPublicKioskTags(
  token: string
): Promise<PublicKioskTag[]> {
  const response = await api.get("/kiosk/tags", {
    params: { token },
  });

  return Array.isArray(response.data) ? response.data : [];
}