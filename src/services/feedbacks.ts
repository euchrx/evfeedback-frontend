import { api } from "./api";

export type FeedbackItem = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  kiosk?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
};

export async function getFeedbacks(): Promise<FeedbackItem[]> {
  const response = await api.get("/feedbacks");
  return Array.isArray(response.data) ? response.data : [];
}