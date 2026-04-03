import { api } from "./api";

export type Tag = {
  id: string;
  name: string;
};

export async function getTags(): Promise<Tag[]> {
  const response = await api.get("/tags");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createTag(payload: { name: string }) {
  const response = await api.post("/tags", payload);
  return response.data;
}

export async function deleteTag(id: string) {
  const response = await api.delete(`/tags/${id}`);
  return response.data;
}