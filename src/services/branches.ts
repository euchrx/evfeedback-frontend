import { api } from "./api";

export type BranchCompany = {
  id: string;
  name: string;
};

export type Branch = {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
  companyId?: string;
  company?: BranchCompany;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBranchPayload = {
  name: string;
  code?: string;
  active?: boolean;
  companyId?: string;
};

export type UpdateBranchPayload = {
  name?: string;
  code?: string;
  active?: boolean;
  companyId?: string;
};

export async function getBranches(companyId?: string): Promise<Branch[]> {
  const response = await api.get("/branches", {
    params: companyId ? { companyId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getBranchById(id: string, companyId?: string): Promise<Branch> {
  const response = await api.get(`/branches/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function createBranch(payload: CreateBranchPayload) {
  const response = await api.post("/branches", payload);
  return response.data;
}

export async function updateBranch(id: string, payload: UpdateBranchPayload) {
  const response = await api.patch(`/branches/${id}`, payload, {
    params: payload.companyId ? { companyId: payload.companyId } : undefined,
  });

  return response.data;
}

export async function deactivateBranch(id: string, companyId?: string) {
  const response = await api.patch(
    `/branches/${id}/deactivate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );

  return response.data;
}

export async function activateBranch(id: string, companyId?: string) {
  const response = await api.patch(
    `/branches/${id}/activate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );

  return response.data;
}

export async function hardDeleteBranch(id: string, companyId?: string) {
  const response = await api.delete(`/branches/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}