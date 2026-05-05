import { apiFetch } from "./api";
import type { PagedData } from "./dashboardApi";

export type ManagedSiteEvent = {
  id: number;
  name: string;
  type: string;
  status: string;
  description?: string | null;
  ticketPrice?: number | string;
  maxTicketsPerUser?: number;
  startTime: string;
  endTime: string;
  agendas?: Array<{
    id: number;
    activity: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
};

export type ManagedSite = {
  id: number;
  name: string;
  description?: string | null;
  ubication: string;
  direction: string;
  phone: string;
  email: string;
  capacity: number;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  status?: string;
  events?: ManagedSiteEvent[];
};

export type CreateSiteBody = {
  name: string;
  ubication: string;
  direction: string;
  phone: string;
  email: string;
  capacity: number;
  description?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type UpdateSiteBody = {
  name: string;
  ubication: string;
  direction: string;
  phone: string;
  email: string;
  capacity: number;
  status: "ACTIVE" | "INACTIVE";
  description?: string | null;
  imageUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export async function fetchManagedSites(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; city?: string; search?: string }
) {
  return apiFetch<PagedData<ManagedSite>>("/sites/get-sites", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 24,
      all: params.all ?? false,
      city: params.city,
      search: params.search,
    },
  });
}

export async function createManagedSite(token: string, body: CreateSiteBody) {
  return apiFetch<ManagedSite>("/sites/create-site", { method: "POST", body, token });
}

export async function updateManagedSite(token: string, id: number, body: UpdateSiteBody) {
  return apiFetch<ManagedSite>(`/sites/update-site/${id}`, { method: "PUT", body, token });
}

export async function deleteManagedSite(token: string, id: number) {
  return apiFetch<ManagedSite>(`/sites/delete-site/${id}`, { method: "DELETE", token });
}
