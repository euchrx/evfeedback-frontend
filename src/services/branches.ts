import { api } from "./api";

export type BranchCompany = {
  id: string;
  name: string;
};

export type Branch = {
  id: string;
  name: string;
  active?: boolean;
  companyId?: string;
  company?: BranchCompany;
  createdAt?: string;
  updatedAt?: string;
};

export type GetBranchesParams = {
  companyId?: string;
};

export type CreateBranchPayload = {
  name: string;
  companyId?: string;
};

export type UpdateBranchPayload = {
  name?: string;
  companyId?: string;
};

export async function getBranches(params?: GetBranchesParams): Promise<Branch[]> {
  const response = await api.get("/branches", { params });
  return Array.isArray(response.data) ? response.data : [];
}

export async function createBranch(payload: CreateBranchPayload) {
  const response = await api.post("/branches", payload);
  return response.data;
}

export async function updateBranch(id: string, payload: UpdateBranchPayload) {
  const response = await api.patch(`/branches/${id}`, payload);
  return response.data;
}

/**
 * Backend atual:
 * DELETE /branches/:id => desativação lógica (active = false)
 */
export async function deactivateBranch(id: string, companyId?: string) {
  const response = await api.delete(`/branches/${id}`, {
    params: companyId ? { companyId } : undefined,
  });
  return response.data;
}