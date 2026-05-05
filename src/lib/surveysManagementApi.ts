import { apiFetch } from "./api";
import type { PagedData } from "./dashboardApi";

export type SurveyRow = {
  id: number;
  titleSurvey: string;
  eventId: number;
  userId?: number;
  event?: { id: number; name: string; status: string } | null;
  user?: { id: number; name: string } | null;
  _count?: { responses: number };
};

export type SurveyResponseRow = {
  id: number;
  surveyId: number;
  stars: number;
  comment?: string | null;
  userId?: number;
  survey?: {
    id: number;
    titleSurvey: string;
    event?: { id: number; name: string } | null;
  } | null;
  user?: { id: number; name: string; email: string } | null;
};

export async function fetchSurveys(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; eventId?: number }
) {
  return apiFetch<PagedData<SurveyRow>>("/surveys/get-surveys", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      all: params.all ?? false,
      eventId: params.eventId,
    },
  });
}

export async function createSurveyApi(token: string, body: { titleSurvey: string; eventId: number }) {
  return apiFetch<SurveyRow>("/surveys/create-survey", { method: "POST", body, token });
}

export async function createSurveyResponseApi(
  token: string,
  body: { surveyId: number; stars: number; comment?: string | null }
) {
  return apiFetch<unknown>("/surveys/create-survey-response", { method: "POST", body, token });
}

export async function fetchSurveyResponses(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; surveyId?: number }
) {
  return apiFetch<PagedData<SurveyResponseRow>>("/surveys/get-survey-responses", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      all: params.all ?? false,
      surveyId: params.surveyId,
    },
  });
}
