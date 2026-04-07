import { api } from "./api";

export type Tag = {
  id: string;
  name: string;
  color?: string | null;
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

export type CreateTagPayload = {
  name: string;
  color?: string;
  companyId?: string;
  active?: boolean;
};

export type UpdateTagPayload = Partial<{
  name: string;
  color: string | null;
  active: boolean;
  companyId: string;
}>;

export async function getTags(companyId?: string): Promise<Tag[]> {
  const response = await api.get("/tags", {
    params: companyId ? { companyId } : undefined,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getTagById(
  id: string,
  companyId?: string,
): Promise<Tag> {
  const response = await api.get(`/tags/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}

export async function createTag(payload: CreateTagPayload) {
  const response = await api.post("/tags", payload);
  return response.data;
}

export async function updateTag(id: string, payload: UpdateTagPayload) {
  const response = await api.patch(`/tags/${id}`, payload);
  return response.data;
}

export async function deactivateTag(id: string, companyId?: string) {
  const response = await api.patch(
    `/tags/${id}/deactivate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function activateTag(id: string, companyId?: string) {
  const response = await api.patch(
    `/tags/${id}/activate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    },
  );

  return response.data;
}

export async function hardDeleteTag(id: string, companyId?: string) {
  const response = await api.delete(`/tags/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}