import { api } from "./api";

export type KioskCompany = {
  id: string;
  name: string;
};

export type KioskBranch = {
  id: string;
  name: string;
  companyId?: string;
};

export type Kiosk = {
  id: string;
  name: string;
  token: string;
  branchId: string;
  companyId?: string;
  locationDescription?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  company?: KioskCompany;
  branch?: KioskBranch;
};

export type GetKiosksParams = {
  companyId?: string;
  active?: boolean;
};

export type CreateKioskPayload = {
  name: string;
  branchId: string;
  companyId?: string;
  locationDescription?: string;
  active?: boolean;
};

export type UpdateKioskPayload = {
  name?: string;
  branchId?: string;
  companyId?: string;
  locationDescription?: string;
  active?: boolean;
};

export async function getKiosks(companyId?: string): Promise<Kiosk[]> {
  const response = await api.get("/kiosks", {
    params: companyId ? { companyId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getKioskById(id: string, companyId?: string): Promise<Kiosk> {
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
  const response = await api.patch(`/kiosks/${id}`, payload, {
    params: payload.companyId ? { companyId: payload.companyId } : undefined,
  });

  return response.data;
}

export async function deactivateKiosk(id: string, companyId?: string) {
  const response = await api.patch(
    `/kiosks/${id}/deactivate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );

  return response.data;
}

export async function activateKiosk(id: string, companyId?: string) {
  const response = await api.patch(
    `/kiosks/${id}/activate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );

  return response.data;
}

export async function regenerateKioskToken(id: string, companyId?: string) {
  const response = await api.patch(
    `/kiosks/${id}/regenerate-token`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );

  return response.data;
}

export async function hardDeleteKiosk(id: string, companyId?: string) {
  const response = await api.delete(`/kiosks/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}