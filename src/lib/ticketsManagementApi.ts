import { apiFetch } from "./api";
import type { CapacitySnapshot } from "./eventsApi";
import type { ListPagination, PagedData } from "./dashboardApi";

export type TicketRow = {
  id: number;
  codeQr: string;
  eventId: number;
  userId?: number;
  status: string;
  validated?: boolean;
  validatedAt?: string | null;
  createdAt?: string;
  amount?: string | number | null;
  event?: {
    id: number;
    name: string;
    status: string;
    startTime: string;
    endTime: string;
    site?: { id: number; name: string; imageUrl?: string | null } | null;
  } | null;
  user?: { id: number; name: string; email: string } | null;
  payment?: {
    id: number;
    status: string;
    totalAmount?: string | number;
    currency?: string;
    provider?: string | null;
    reference?: string | null;
    paidAt?: string | null;
  } | null;
};

export async function fetchTickets(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; eventId?: number; status?: string }
) {
  return apiFetch<PagedData<TicketRow>>("/tickets/get-tickets", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      all: params.all ?? false,
      eventId: params.eventId,
      status: params.status,
    },
  });
}

export async function validateTicketByCode(token: string, codeQr: string) {
  return apiFetch<TicketRow>(`/tickets/validate-ticket/${encodeURIComponent(codeQr)}`, {
    method: "PUT",
    token,
  });
}

export async function cancelTicketApi(token: string, ticketId: number) {
  return apiFetch<TicketRow>(`/tickets/cancel-ticket/${ticketId}`, { method: "PUT", token });
}

export type AttendeeRow = {
  id: number;
  codeQr: string;
  validated: boolean;
  validatedAt?: string | null;
  status: string;
  user?: { id: number; name: string; email: string } | null;
  payment?: { id: number; status: string } | null;
};

export async function fetchAttendeesByEvent(
  token: string,
  eventId: number,
  params: { page?: number; limit?: number; all?: boolean; search?: string }
) {
  return apiFetch<{
    event: { id: number; name: string; userId: number };
    items: AttendeeRow[];
    pagination: ListPagination;
  }>(`/tickets/get-attendees/${eventId}`, {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      all: params.all ?? false,
      search: params.search,
    },
  });
}

export async function fetchTicketCapacitySummary(token: string, eventId: number) {
  return apiFetch<CapacitySnapshot>(`/tickets/get-capacity/${eventId}`, { token });
}
