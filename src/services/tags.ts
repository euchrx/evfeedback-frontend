import { api } from "./api";

export type Tag = {
  id: string;
  name: string;
  color?: string | null;
  active?: boolean;
  companyId: string;
  company?: {
    id: string;
    name: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type GetTagsParams = {
  companyId?: string;
};

export type CreateTagPayload = {
  name: string;
  color?: string | null;
  companyId: string;
  active?: boolean;
};

export type UpdateTagPayload = {
  name?: string;
  color?: string | null;
  companyId?: string;
  active?: boolean;
};

function buildCompanyParams(companyId?: string) {
  return companyId ? { companyId } : undefined;
}

export async function getTags(params?: GetTagsParams): Promise<Tag[]> {
  const response = await api.get("/tags", {
    params,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function createTag(payload: CreateTagPayload): Promise<Tag> {
  const response = await api.post("/tags", payload);
  return response.data as Tag;
}

export async function updateTag(
  id: string,
  payload: UpdateTagPayload,
  companyId?: string,
): Promise<Tag> {
  const response = await api.patch(`/tags/${id}`, payload, {
    params: buildCompanyParams(companyId ?? payload.companyId),
  });

  return response.data as Tag;
}

export async function activateTag(id: string, companyId?: string): Promise<Tag> {
  const response = await api.patch(
    `/tags/${id}/activate`,
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as Tag;
}

export async function deactivateTag(id: string, companyId?: string): Promise<Tag> {
  const response = await api.patch(
    `/tags/${id}/deactivate`,
    {},
    {
      params: buildCompanyParams(companyId),
    },
  );

  return response.data as Tag;
}

export async function hardDeleteTag(id: string, companyId?: string): Promise<void> {
  await api.delete(`/tags/${id}`, {
    params: buildCompanyParams(companyId),
  });
}