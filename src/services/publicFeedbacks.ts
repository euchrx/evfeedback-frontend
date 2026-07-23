import axios from "axios";
import type { FeedbackFilters, FeedbackItem } from "./feedbacks";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  console.warn("VITE_API_BASE_URL não está configurada.");
}

const publicApi = axios.create({
  baseURL,
  timeout: 15000,
});

export type SharedFeedbackFilters = Omit<
  FeedbackFilters,
  "companyId" | "active"
>;

type SharedFeedbacksApiResponse =
  | FeedbackItem[]
  | {
      feedbacks?: FeedbackItem[];
      data?: FeedbackItem[];
      items?: FeedbackItem[];
    };

function extractFeedbacks(
  responseData: SharedFeedbacksApiResponse,
): FeedbackItem[] {
  if (Array.isArray(responseData)) {
    return responseData;
  }

  if (Array.isArray(responseData.feedbacks)) {
    return responseData.feedbacks;
  }

  if (Array.isArray(responseData.data)) {
    return responseData.data;
  }

  if (Array.isArray(responseData.items)) {
    return responseData.items;
  }

  return [];
}

export async function getSharedFeedbacks(
  token: string,
  filters?: SharedFeedbackFilters,
): Promise<FeedbackItem[]> {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    throw new Error("Token de compartilhamento não informado.");
  }

  const response = await publicApi.get<SharedFeedbacksApiResponse>(
    "/public/feedbacks",
    {
      params: {
        token: normalizedToken,
        rating: filters?.rating || undefined,
        branchId: filters?.branchId || undefined,
        kioskId: filters?.kioskId || undefined,
        startDate: filters?.startDate || undefined,
        endDate: filters?.endDate || undefined,
      },
    },
  );

  console.log("Resposta completa de /public/feedbacks:", response.data);

  const feedbacks = extractFeedbacks(response.data);

  console.log("Feedbacks extraídos:", feedbacks);

  return feedbacks;
}