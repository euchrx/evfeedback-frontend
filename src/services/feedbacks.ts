import { api } from "./api";

export type FeedbackFilters = {
  companyId?: string;
  branchId?: string;
  kioskId?: string;
  rating?: string;
  startDate?: string;
  endDate?: string;
  active?: string;
};

export type FeedbackTagItem = {
  id: string;
  tagId?: string;
  tag?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
};

export type FeedbackItem = {
  id: string;
  rating: number;
  comment?: string | null;
  email?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactMessage?: string | null;
  contactConsent?: boolean;
  companyId: string;
  branchId: string;
  kioskId: string;
  createdAt: string;
  company?: {
    id: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    name: string;
  } | null;
  kiosk?: {
    id: string;
    name: string;
    active?: boolean;
  } | null;
  tags?: FeedbackTagItem[];
};

export async function getFeedbacks(
  filters?: FeedbackFilters,
): Promise<FeedbackItem[]> {
  const response = await api.get("/feedbacks", {
    params: filters,
  });

  return Array.isArray(response.data) ? response.data : [];
}

export async function deleteFeedback(
  id: string,
  companyId?: string,
): Promise<void> {
  await api.delete(`/feedbacks/${id}`, {
    params: companyId ? { companyId } : undefined,
  });
}