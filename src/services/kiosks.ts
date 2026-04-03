import { api } from "./api";

export type BranchOption = {
  id: string;
  name: string;
};

export type Kiosk = {
  id: string;
  name: string;
  token: string;
  branchId: string;
  branch?: {
    id: string;
    name: string;
  };
};

export type CreateKioskInput = {
  name: string;
  branchId: string;
};

export async function getKiosks() {
  const { data } = await api.get<Kiosk[]>("/kiosks");
  return data;
}

export async function createKiosk(payload: CreateKioskInput) {
  const { data } = await api.post<Kiosk>("/kiosks", payload);
  return data;
}

export async function deleteKiosk(id: string) {
  const { data } = await api.delete(`/kiosks/${id}`);
  return data;
}