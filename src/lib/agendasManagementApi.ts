import { apiFetch } from "./api";
import type { PagedData } from "./dashboardApi";

export type ManagedAgendaEvent = {
  id: number;
  name: string;
  status: string;
  startTime: string;
  endTime: string;
  site?: { id: number; name: string; imageUrl?: string | null } | null;
};

export type ManagedAgenda = {
  id: number;
  activity: string;
  startTime: string;
  endTime: string;
  status: string;
  eventId: number;
  event?: ManagedAgendaEvent | null;
};

export type CreateAgendaBody = {
  activity: string;
  startTime: string;
  endTime: string;
  eventId: number;
};

export type UpdateAgendaBody = {
  activity: string;
  startTime: string;
  endTime: string;
  eventId: number;
  status: string;
};

export async function fetchManagedAgendas(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; eventId?: number; search?: string }
) {
  return apiFetch<PagedData<ManagedAgenda>>("/agendas/get-agendas", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 50,
      all: params.all ?? false,
      eventId: params.eventId,
      search: params.search,
    },
  });
}

export async function createManagedAgenda(token: string, body: CreateAgendaBody) {
  return apiFetch<ManagedAgenda>("/agendas/create-agenda", { method: "POST", body, token });
}

export async function updateManagedAgenda(token: string, id: number, body: UpdateAgendaBody) {
  return apiFetch<ManagedAgenda>(`/agendas/update-agenda/${id}`, { method: "PUT", body, token });
}

export async function deleteManagedAgenda(token: string, id: number) {
  return apiFetch<ManagedAgenda>(`/agendas/delete-agenda/${id}`, { method: "DELETE", token });
}
