import { api } from "./api";

export type EnvironmentType = "POSTO" | "CONVENIENCIA" | "RESTAURANTE";

export type TagCompany = {
  id: string;
  name: string;
};

export type Tag = {
  id: string;
  name: string;
  color?: string | null;
  environmentType: EnvironmentType;
  active?: boolean;
  companyId?: string;
  company?: TagCompany;
  createdAt?: string;
  updatedAt?: string;
};

export type GetTagsParams = {
  companyId?: string;
  active?: boolean;
};

export type CreateTagPayload = {
  name: string;
  color?: string | null;
  environmentType?: EnvironmentType;
  active?: boolean;
  companyId?: string;
};

export type UpdateTagPayload = {
  name?: string;
  color?: string | null;
  environmentType?: EnvironmentType;
  active?: boolean;
  companyId?: string;
};

export type ImportTagsBySegmentPayload = {
  segment: "RESTAURANTE" | "CONVENIENCIA" | "POSTO";
  companyId?: string;
};

export async function getTags(params?: GetTagsParams): Promise<Tag[]> {
  const response = await api.get("/tags", { params });
  return Array.isArray(response.data) ? response.data : [];
}

export async function getTagById(id: string, companyId?: string): Promise<Tag> {
  const response = await api.get(`/tags/${id}`, {
    params: companyId ? { companyId } : undefined,
  });
  return response.data;
}

export async function createTag(payload: CreateTagPayload) {
  const response = await api.post("/tags", payload);
  return response.data;
}

export async function importTagsBySegment(payload: ImportTagsBySegmentPayload): Promise<{
  segment: string;
  createdCount: number;
  skippedCount: number;
  tags: Tag[];
}> {
  const response = await api.post("/tags/import-by-segment", payload);
  return response.data;
}

export async function updateTag(id: string, payload: UpdateTagPayload) {
  const response = await api.patch(`/tags/${id}`, payload, {
    params: payload.companyId ? { companyId: payload.companyId } : undefined,
  });
  return response.data;
}

export async function deactivateTag(id: string, companyId?: string) {
  const response = await api.patch(
    `/tags/${id}/deactivate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );
  return response.data;
}

export async function activateTag(id: string, companyId?: string) {
  const response = await api.patch(
    `/tags/${id}/activate`,
    {},
    {
      params: companyId ? { companyId } : undefined,
    }
  );
  return response.data;
}

export async function hardDeleteTag(id: string, companyId?: string) {
  const response = await api.delete(`/tags/${id}`, {
    params: companyId ? { companyId } : undefined,
  });
  return response.data;
}