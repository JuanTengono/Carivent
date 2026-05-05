import { apiFetch } from "./api";
import type { Pagination, PublicAgenda, PublicEvent } from "../types/api";

function toEventKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const EVENT_IMAGE_URLS: Record<string, string> = {
  [toEventKey("Torneo Interfacultades de Fútbol")]: "/images/events/torneo-interfacultades-futbol.jpg",
  [toEventKey("Feria de Innovación Tecnológica 2026")]: "/images/events/feria-innovacion-tecnologica-2026.jpg",
  [toEventKey("Conferencia: Inteligencia Artificial y el Futuro")]:
    "/images/events/conferencia-inteligencia-artificial-futuro.jpg",
  [toEventKey("Taller: Desarrollo de Apps Móviles con Flutter")]:
    "/images/events/taller-desarrollo-apps-moviles-flutter.jpg",
  [toEventKey("Festival de Arte y Cultura")]: "/images/events/festival-arte-cultura.jpg",
  [toEventKey("Gala de Graduación Promoción 2026")]: "/images/events/gala-graduacion-promocion-2026.jpg",
};

function withLocalEventImage(event: PublicEvent): PublicEvent {
  const localImageUrl = EVENT_IMAGE_URLS[toEventKey(event.name)];

  if (!localImageUrl) {
    return event;
  }

  return {
    ...event,
    imageUrl: localImageUrl,
  };
}

export type PublicListResponse<T> = {
  items: T[];
  pagination: Pagination;
};

export async function fetchPublicEvents(params: {
  page?: number;
  limit?: number;
  all?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
}) {
  const response = await apiFetch<PublicListResponse<PublicEvent>>("/public/events", {
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      all: params.all ?? false,
      search: params.search,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      type: params.type,
    },
  });

  return {
    ...response,
    items: response.items.map(withLocalEventImage),
  };
}

export async function fetchPublicEventById(id: number) {
  const { items } = await fetchPublicEvents({ all: true });
  return items.find((e) => e.id === id) ?? null;
}

export async function fetchPublicAgendas(eventId: number) {
  return apiFetch<PublicListResponse<PublicAgenda>>("/public/agendas", {
    query: { eventId, all: true },
  });
}

export type CapacitySnapshot = {
  event: {
    id: number;
    name: string;
    status: string;
    startTime: string;
    endTime: string;
    site: { id: number | null; name: string | null; imageUrl: string | null; capacity: number };
  };
  counters: {
    totalCapacity: number;
    available: number;
    reserved: number;
    sold: number;
    used: number;
    cancelled: number;
    expired: number;
    soldPercentage: number;
  };
};

export async function fetchPublicCapacity(eventId: number) {
  return apiFetch<CapacitySnapshot>(`/public/events/${eventId}/capacity`);
}
