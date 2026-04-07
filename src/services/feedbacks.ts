import { api } from "./api";

export type FeedbackTagItem = {
  id: string;
  feedbackId: string;
  tagId: string;
  tag?: {
    id: string;
    name: string;
  } | null;
};

export type FeedbackItem = {
  id: string;
  rating: number;
  comment?: string | null;
  active?: boolean;
  createdAt: string;
  companyId?: string;
  branchId?: string;
  kioskId?: string;
  company?: {
    id: string;
    name: string;
  } | null;
  kiosk?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  tags?: FeedbackTagItem[];
};

export type FeedbackFilters = {
  companyId?: string;
  branchId?: string;
  kioskId?: string;
  rating?: string;
  startDate?: string;
  endDate?: string;
  active?: string;
};

export async function getFeedbacks(
  filters?: FeedbackFilters
): Promise<FeedbackItem[]> {
  const response = await api.get("/feedbacks", {
    params: filters,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function getFeedbackById(
  id: string,
  companyId?: string
): Promise<FeedbackItem> {
  const response = await api.get(`/feedbacks/${id}`, {
    params: companyId ? { companyId } : undefined,
  });

  return response.data;
}