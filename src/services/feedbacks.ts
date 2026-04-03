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
  tags?: Array<{
    id: string;
    feedbackId: string;
    tagId: string;
    tag?: {
      id: string;
      name: string;
    } | null;
  }>;
};

export type FeedbackFilters = {
  rating?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getFeedbacks(
  filters?: FeedbackFilters
): Promise<FeedbackItem[]> {
  const response = await api.get("/feedbacks", {
    params: filters,
  });

  return Array.isArray(response.data) ? response.data : [];
}