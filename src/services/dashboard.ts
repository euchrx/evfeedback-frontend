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

export async function getDashboardSummary() {
  const { data } = await api.get<DashboardSummary>("/dashboard/summary");
  return data;
}