import { apiFetch } from "./api";
import type { PagedData } from "./dashboardApi";
import type { CapacitySnapshot } from "./eventsApi";

export type ManagedEventSite = {
  id: number;
  name: string;
  imageUrl?: string | null;
  capacity?: number | null;
  ubication?: string | null;
  direction?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
};

export type ManagedAgendaBrief = {
  id: number;
  activity: string;
  startTime: string;
  endTime: string;
  status: string;
};

export type ManagedEvent = {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  type: string;
  status: string;
  ticketPrice: number | string;
  maxTicketsPerUser: number;
  startTime: string;
  endTime: string;
  siteId: number;
  site: ManagedEventSite | null;
  user?: { id: number; name: string } | null;
  agendas?: ManagedAgendaBrief[];
  _count?: { tickets: number };
};

export type CreateEventBody = {
  name: string;
  type: "PUBLIC" | "PRIVATE";
  status?: string;
  description: string;
  ticketPrice?: number;
  maxTicketsPerUser?: number;
  startTime: string;
  endTime: string;
  siteId: number;
  imageUrl?: string | null;
};

export type UpdateEventBody = {
  name: string;
  status: string;
  type: "PUBLIC" | "PRIVATE";
  description: string;
  ticketPrice?: number;
  maxTicketsPerUser?: number;
  startTime: string;
  endTime: string;
  siteId: number;
  imageUrl?: string | null;
};

export async function fetchManagedEvents(
  token: string,
  params: {
    page?: number;
    limit?: number;
    all?: boolean;
    search?: string;
    status?: string;
    type?: string;
    siteId?: number;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  return apiFetch<PagedData<ManagedEvent>>("/events/get-events", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      all: params.all ?? false,
      search: params.search,
      status: params.status,
      type: params.type,
      siteId: params.siteId,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    },
  });
}

export async function createManagedEvent(token: string, body: CreateEventBody) {
  return apiFetch<ManagedEvent>("/events/create-event", { method: "POST", body, token });
}

export async function updateManagedEvent(token: string, id: number, body: UpdateEventBody) {
  return apiFetch<ManagedEvent>(`/events/update-event/${id}`, { method: "PUT", body, token });
}

export async function deleteManagedEvent(token: string, id: number) {
  return apiFetch<ManagedEvent>(`/events/delete-event/${id}`, { method: "DELETE", token });
}

export async function fetchEventCapacityAdmin(token: string, eventId: number) {
  return apiFetch<CapacitySnapshot>(`/events/get-capacity/${eventId}`, { token });
}

export async function runAutomationJobs(token: string) {
  return apiFetch<unknown>("/events/run-automation-jobs", { method: "POST", body: {}, token });
}
