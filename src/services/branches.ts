import { api } from "./api";

export type Branch = {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
  companyId?: string;
  company?: {
    id: string;
    name: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

type BranchPayload = {
  name: string;
  code?: string;
  active?: boolean;
  companyId?: string;
};

function buildCompanyParams(companyId?: string) {
  return companyId ? { companyId } : undefined;
}

export async function getBranches(companyId?: string): Promise<Branch[]> {
  const response = await api.get("/branches", {
    params: buildCompanyParams(companyId),
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createBranch(payload: BranchPayload): Promise<Branch> {
  const response = await api.post("/branches", payload);
  return response.data as Branch;
}

export async function updateBranch(
  id: string,
  payload: Partial<BranchPayload>,
  companyId?: string,
): Promise<Branch> {
  const response = await api.patch(`/branches/${id}`, payload, {
    params: buildCompanyParams(companyId),
  });

  return response.data as Branch;
}

export async function activateBranch(
  id: string,
  companyId?: string,
): Promise<Branch> {
  const response = await api.patch(
    `/branches/${id}/activate`,
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as Branch;
}

export async function deactivateBranch(
  id: string,
  companyId?: string,
): Promise<Branch> {
  const response = await api.patch(
    `/branches/${id}/deactivate`,
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as Branch;
}

export async function hardDeleteBranch(
  id: string,
  companyId?: string,
): Promise<void> {
  await api.delete(`/branches/${id}`, {
    params: buildCompanyParams(companyId),
  });
}