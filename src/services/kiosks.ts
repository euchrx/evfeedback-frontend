import { api } from "./api";

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

export async function getKiosks(): Promise<Kiosk[]> {
  const response = await api.get("/kiosks");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createKiosk(payload: { name: string; branchId: string }) {
  const response = await api.post("/kiosks", payload);
  return response.data;
}

export async function deleteKiosk(id: string) {
  const response = await api.delete(`/kiosks/${id}`);
  return response.data;
}