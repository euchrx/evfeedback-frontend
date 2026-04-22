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
  } | null;
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

function buildCompanyParams(companyId?: string) {
  return companyId ? { companyId } : undefined;
}

export async function getUsers(companyId?: string): Promise<UserItem[]> {
  const response = await api.get("/users", {
    params: buildCompanyParams(companyId),
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getUserById(id: string, companyId?: string): Promise<UserItem> {
  const response = await api.get(`/users/${id}`, {
    params: buildCompanyParams(companyId),
  });

  return response.data as UserItem;
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const response = await api.post("/users", payload);
  return response.data as UserItem;
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
  companyId?: string,
): Promise<UserItem> {
  const response = await api.patch(`/users/${id}`, payload, {
    params: buildCompanyParams(companyId ?? payload.companyId),
  });

  return response.data as UserItem;
}

export async function deactivateUser(id: string, companyId?: string): Promise<UserItem> {
  const response = await api.patch(
    `/users/${id}/deactivate`,
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as UserItem;
}

export async function activateUser(id: string, companyId?: string): Promise<UserItem> {
  const response = await api.patch(
    `/users/${id}/activate`,
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as UserItem;
}

export async function hardDeleteUser(id: string, companyId?: string): Promise<void> {
  await api.delete(`/users/${id}`, {
    params: buildCompanyParams(companyId),
  });
}