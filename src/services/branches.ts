import { api } from "./api";

export type Branch = {
  id: string;
  name: string;
};

export async function getBranches(): Promise<Branch[]> {
  const response = await api.get("/branches");
  return Array.isArray(response.data) ? response.data : [];
}

export async function createBranch(payload: { name: string }) {
  const response = await api.post("/branches", payload);
  return response.data;
}

export async function deleteBranch(id: string) {
  const response = await api.delete(`/branches/${id}`);
  return response.data;
}