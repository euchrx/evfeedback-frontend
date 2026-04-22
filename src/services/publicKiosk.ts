import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const publicApi = axios.create({
  baseURL,
});

export type PublicEnvironmentType = "POSTO" | "CONVENIENCIA" | "RESTAURANTE";

export type PublicKioskConfig = {
  kiosk: {
    id: string;
    name: string;
    token: string;
    branchId: string;
    companyId: string;
    locationDescription?: string | null;
    environmentType: PublicEnvironmentType;
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
  token: string,
): Promise<PublicKioskConfig> {
  const response = await publicApi.get("/kiosk/config", {
    params: { token },
  });

  return response.data as PublicKioskConfig;
}

export async function getPublicKioskTags(
  token: string,
): Promise<PublicKioskTag[]> {
  const response = await publicApi.get("/kiosk/tags", {
    params: { token },
  });

  return Array.isArray(response.data) ? (response.data as PublicKioskTag[]) : [];
}