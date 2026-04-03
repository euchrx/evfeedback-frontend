import { api } from "./api";
import { saveAuthToken } from "./authToken";

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  access_token: string;
  user?: {
    id: string;
    email?: string;
    name?: string;
  };
};

export async function login(payload: LoginPayload) {
  const response = await api.post<LoginResponse>("/auth/login", payload);
  const data = response.data;

  if (data?.access_token) {
    saveAuthToken(data.access_token);
  }

  return data;
}