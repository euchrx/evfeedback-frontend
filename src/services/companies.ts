import { api } from "./api";

export type Company = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getCompanies(): Promise<Company[]> {
  const response = await api.get("/companies");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createCompany(payload: {
  name: string;
  slug: string;
}) {
  const response = await api.post("/companies", payload);
  return response.data;
}

export async function updateCompany(
  id: string,
  payload: Partial<{ name: string; slug: string; active: boolean }>
) {
  const response = await api.patch(`/companies/${id}`, payload);
  return response.data;
}

export async function deleteCompany(id: string) {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
}