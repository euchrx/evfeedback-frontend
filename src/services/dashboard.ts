import { api } from "./api";

export type RatingSummaryItem = {
  rating: number;
  count: number;
};

export type TopTagItem = {
  name: string;
  count: number;
};

export type DashboardSummary = {
  total: number;
  averageRating: number;
  ratings: RatingSummaryItem[];
  topTags: TopTagItem[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get("/dashboard/summary");
  const data = response.data ?? {};

  return {
    total: data.total ?? 0,
    averageRating: data.averageRating ?? 0,
    ratings: Array.isArray(data.ratings) ? data.ratings : [],
    topTags: Array.isArray(data.topTags) ? data.topTags : [],
  };
}