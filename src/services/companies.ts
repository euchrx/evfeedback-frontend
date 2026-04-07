import { api } from "./api";

export type Company = {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateCompanyPayload = {
  name: string;
};

export type UpdateCompanyPayload = Partial<{
  name: string;
  active: boolean;
}>;

export async function getCompanies(): Promise<Company[]> {
  const response = await api.get("/companies");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getCompanyById(id: string): Promise<Company> {
  const response = await api.get(`/companies/${id}`);
  return response.data;
}

export async function createCompany(payload: CreateCompanyPayload) {
  const response = await api.post("/companies", payload);
  return response.data;
}

export async function updateCompany(id: string, payload: UpdateCompanyPayload) {
  const response = await api.patch(`/companies/${id}`, payload);
  return response.data;
}

export async function deactivateCompany(id: string) {
  const response = await api.patch(`/companies/${id}/deactivate`);
  return response.data;
}

export async function activateCompany(id: string) {
  const response = await api.patch(`/companies/${id}/activate`);
  return response.data;
}

export async function hardDeleteCompany(id: string) {
  const response = await api.delete(`/companies/${id}`);
  return response.data;
}