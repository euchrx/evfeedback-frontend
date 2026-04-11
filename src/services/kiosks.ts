import { api } from "./api";

export type Kiosk = {
  id: string;
  name: string;
  token?: string | null;
  locationDescription?: string | null;
  active: boolean;
  companyId: string;
  branchId: string;
  company?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    companyId: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateKioskPayload = {
  name: string;
  locationDescription?: string;
  companyId: string;
  branchId: string;
  active?: boolean;
};

export type UpdateKioskPayload = {
  name?: string;
  locationDescription?: string;
  companyId?: string;
  branchId?: string;
  active?: boolean;
};

export async function getKiosks(companyId?: string): Promise<Kiosk[]> {
  const response = await api.get("/kiosks", {
    params: companyId ? { companyId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createKiosk(payload: CreateKioskPayload): Promise<Kiosk> {
  const response = await api.post("/kiosks", payload);
  return response.data;
}

export async function updateKiosk(
  id: string,
  payload: UpdateKioskPayload,
  companyId?: string,
): Promise<Kiosk> {
  const response = await api.patch(`/kiosks/${id}`, payload, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function activateKiosk(id: string, companyId?: string): Promise<Kiosk> {
  const response = await api.patch(
    `/kiosks/${id}/activate`,
    {},
    { params: companyId ? { companyId } : undefined },
  );

  return response.data;
}

export async function deactivateKiosk(id: string, companyId?: string): Promise<Kiosk> {
  const response = await api.patch(
    `/kiosks/${id}/deactivate`,
    {},
    { params: companyId ? { companyId } : undefined },
  );

  return response.data;
}

export async function regenerateKioskToken(
  id: string,
  companyId?: string,
): Promise<Kiosk> {
  const response = await api.patch(
    `/kiosks/${id}/regenerate-token`,
    {},
    { params: companyId ? { companyId } : undefined },
  );

  return response.data;
}

export async function hardDeleteKiosk(id: string, companyId?: string): Promise<void> {
  await api.delete(`/kiosks/${id}`, {
    params: companyId ? { companyId } : undefined,
  });
}