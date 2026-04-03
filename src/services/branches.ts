import { api } from "./api";

export type Branch = {
  id: string;
  name: string;
};

export async function getBranches() {
  const { data } = await api.get<Branch[]>("/branches");
  return data;
}

export async function createBranch(payload: { name: string }) {
  const { data } = await api.post<Branch>("/branches", payload);
  return data;
}

export async function deleteBranch(id: string) {
  const { data } = await api.delete(`/branches/${id}`);
  return data;
}