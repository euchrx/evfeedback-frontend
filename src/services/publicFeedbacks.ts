import axios from "axios";
import type { FeedbackFilters, FeedbackItem } from "./feedbacks";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const publicApi = axios.create({
  baseURL,
});

export type SharedFeedbackFilters = Omit<FeedbackFilters, "companyId" | "active">;

export async function getSharedFeedbacks(
  token: string,
  filters?: SharedFeedbackFilters,
): Promise<FeedbackItem[]> {
  const response = await publicApi.get("/public/feedbacks", {
    params: {
      token,
      rating: filters?.rating || undefined,
      branchId: filters?.branchId || undefined,
      kioskId: filters?.kioskId || undefined,
      startDate: filters?.startDate || undefined,
      endDate: filters?.endDate || undefined,
    },
  });

  return Array.isArray(response.data) ? response.data : [];
}