import { api } from "./api";

export type Kiosk = {
  id: string;
  name: string;
  token: string;
  branchId: string;
  companyId: string;
  locationDescription?: string | null;
  active: boolean;
  branch?: {
    id: string;
    name: string;
    code?: string | null;
  };
  company?: {
    id: string;
    name: string;
    active?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateKioskPayload = {
  name: string;
  branchId: string;
  companyId?: string;
  locationDescription?: string;
  active?: boolean;
};

export type UpdateKioskPayload = Partial<{
  name: string;
  branchId: string;
  companyId: string;
  locationDescription: string | null;
  active: boolean;
}>;

export async function getKiosks(companyId?: string): Promise<Kiosk[]> {
  const response = await api.get("/kiosks", {
    params: companyId ? { companyId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getKioskById(
  id: string,
  companyId?: string,
): Promise<Kiosk> {
  const response = await api.get(`/kiosks/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function createKiosk(payload: CreateKioskPayload) {
  const response = await api.post("/kiosks", payload);
  return response.data;
}

export async function updateKiosk(id: string, payload: UpdateKioskPayload) {
  const response = await api.patch(`/kiosks/${id}`, payload);
  return response.data;
}

export async function deactivateKiosk(id: string, companyId?: string) {
  const response = await api.patch(
    `/kiosks/${id}/deactivate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function activateKiosk(id: string, companyId?: string) {
  const response = await api.patch(
    `/kiosks/${id}/activate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function regenerateKioskToken(id: string, companyId?: string) {
  const response = await api.patch(
    `/kiosks/${id}/regenerate-token`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function hardDeleteKiosk(id: string, companyId?: string) {
  const response = await api.delete(`/kiosks/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}