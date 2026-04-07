import { api } from "./api";

export type UserRole = "SUPER_ADMIN" | "COMPANY_ADMIN" | "MANAGER";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  companyId: string;
  company?: {
    id: string;
    name: string;
    active?: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyId?: string;
  active?: boolean;
};

export type UpdateUserPayload = Partial<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  companyId: string;
}>;

export async function getUsers(companyId?: string): Promise<UserItem[]> {
  const response = await api.get("/users", {
    params: companyId ? { companyId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getUserById(
  id: string,
  companyId?: string,
): Promise<UserItem> {
  const response = await api.get(`/users/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await api.post("/users", payload);
  return response.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload) {
  const response = await api.patch(`/users/${id}`, payload);
  return response.data;
}

export async function deactivateUser(id: string, companyId?: string) {
  const response = await api.patch(
    `/users/${id}/deactivate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function activateUser(id: string, companyId?: string) {
  const response = await api.patch(
    `/users/${id}/activate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function hardDeleteUser(id: string, companyId?: string) {
  const response = await api.delete(`/users/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}