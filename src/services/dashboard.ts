import { api } from "./api";

export type DashboardFilters = {
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
};

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

export type BranchDashboardItem = {
  id: string;
  name: string;
  companyId?: string;
  company?: {
    id: string;
    name: string;
  } | null;
  totalFeedbacks: number;
  averageRating: number;
};

export async function getDashboardSummary(
  filters?: DashboardFilters,
): Promise<DashboardSummary> {
  const response = await api.get("/dashboard/summary", {
    params: filters,
  });

  const data = response.data ?? {};

  return {
    total: data.total ?? 0,
    averageRating: data.averageRating ?? 0,
    ratings: Array.isArray(data.ratings) ? data.ratings : [],
    topTags: Array.isArray(data.topTags) ? data.topTags : [],
  };
}

export async function getDashboardByBranch(
  filters?: DashboardFilters,
): Promise<BranchDashboardItem[]> {
  const response = await api.get("/dashboard/by-branch", {
    params: filters,
  });

  return Array.isArray(response.data) ? response.data : [];
}