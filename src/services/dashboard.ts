import { api } from "./api";

export type DashboardFilters = {
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type DashboardRatingItem = {
  rating: number;
  count: number;
};

export type DashboardTagItem = {
  name: string;
  count: number;
};

export type DashboardEnvironmentType = "POSTO" | "CONVENIENCIA" | "RESTAURANTE";

export type DashboardEnvironmentItem = {
  environmentType: DashboardEnvironmentType;
  total: number;
  averageRating: number;
};

export type DashboardRecentFeedbackItem = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  branchName?: string | null;
  kioskName?: string | null;
  environmentType?: DashboardEnvironmentType | null;
  tags: string[];
};

export type DashboardSummary = {
  total: number;
  averageRating: number;
  ratings: DashboardRatingItem[];
  topTags: DashboardTagItem[];
  byEnvironment: DashboardEnvironmentItem[];
  recentFeedbacks: DashboardRecentFeedbackItem[];
};

export type BranchDashboardItem = {
  id: string;
  name: string;
  totalFeedbacks: number;
  averageRating: number;
};

export async function getDashboardSummary(
  filters?: DashboardFilters
): Promise<DashboardSummary> {
  const response = await api.get("/dashboard/summary", {
    params: filters,
  });

  return response.data;
}

export async function getDashboardByBranch(
  filters?: DashboardFilters
): Promise<BranchDashboardItem[]> {
  const response = await api.get("/dashboard/by-branch", {
    params: filters,
  });

  return Array.isArray(response.data) ? response.data : [];
}