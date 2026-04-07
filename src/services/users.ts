import { api } from "./api";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  active: boolean;
  companyId: string;
  company?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
};

export async function getUsersGlobal(): Promise<UserItem[]> {
  const response = await api.get("/users");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getUsersCompany(): Promise<UserItem[]> {
  const response = await api.get("/users/company");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createUserGlobal(payload: {
  name: string;
  email: string;
  password: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
  companyId: string;
}) {
  const response = await api.post("/users", payload);
  return response.data;
}

export async function createUserCompany(payload: {
  name: string;
  email: string;
  password: string;
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
}) {
  const response = await api.post("/users/company", payload);
  return response.data;
}

export async function updateUserGlobal(
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    password: string;
    role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
    active: boolean;
    companyId: string;
  }>
) {
  const response = await api.patch(`/users/${id}`, payload);
  return response.data;
}

export async function updateUserCompany(
  id: string,
  payload: Partial<{
    name: string;
    email: string;
    password: string;
    role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";
    active: boolean;
  }>
) {
  const response = await api.patch(`/users/company/${id}`, payload);
  return response.data;
}

export async function deleteUserGlobal(id: string) {
  const response = await api.delete(`/users/${id}`);
  return response.data;
}

export async function deleteUserCompany(id: string) {
  const response = await api.delete(`/users/company/${id}`);
  return response.data;
}