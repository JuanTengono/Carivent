import { apiFetch } from "./api";

export type ListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PagedData<T> = { data: T[]; pagination: ListPagination };

export type DashboardSummary = {
  summary?: {
    currency?: string;
    revenue?: number;
    soldTickets?: number;
    activeEvents?: number;
  };
  period?: Record<string, unknown>;
  monthlyRevenue?: Array<{ year: number; month: number; label: string; revenue: number; soldTickets: number }>;
};

export type PaymentRow = {
  id: number;
  status: string;
  totalAmount: string | number;
  subtotal?: string | number;
  discountAmount?: string | number;
  quantity: number;
  currency: string;
  createdAt: string;
  provider?: string | null;
  reference?: string | null;
  user?: { id: number; name: string; email: string };
  event?: { id: number; name: string; status?: string };
  promotion?: { id: number; code: string; title: string } | null;
  _count?: { tickets: number };
  tickets?: unknown[];
};

export type PromotionRow = {
  id: number;
  code: string;
  title: string;
  description?: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: string | number;
  minQuantity: number;
  maxUses?: number | null;
  usedCount?: number;
  validFrom?: string | null;
  validTo?: string | null;
  isActive: boolean;
  eventId?: number | null;
  event?: { id: number; name: string } | null;
  user?: { id: number; name: string };
};

export type NotificationRow = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  user?: { id: number; name: string; email: string };
};

export type EventOption = { id: number; name: string };

export async function fetchDashboardSummary(token: string) {
  return apiFetch<DashboardSummary>("/events/get-dashboard-summary", {
    token,
    query: { months: 6 },
  });
}

export async function fetchEventsList(token: string): Promise<EventOption[]> {
  const res = await apiFetch<{ data: Array<{ id: number; name: string }>; pagination: ListPagination }>(
    "/events/get-events",
    {
      token,
      query: { all: true, limit: 500, page: 1 },
    }
  );
  return res.data.map((e) => ({ id: e.id, name: e.name }));
}

export async function fetchPayments(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; eventId?: number; status?: string }
) {
  return apiFetch<PagedData<PaymentRow>>("/payments/get-payments", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 15,
      all: params.all ?? false,
      eventId: params.eventId,
      status: params.status,
    },
  });
}

export async function fetchPaymentDetail(token: string, id: number) {
  return apiFetch<PaymentRow>(`/payments/get-payment/${id}`, { token });
}

export async function confirmPaymentApi(token: string, id: number) {
  return apiFetch<unknown>(`/payments/confirm-payment/${id}`, { method: "PUT", token });
}

export async function failPaymentApi(token: string, id: number) {
  return apiFetch<unknown>(`/payments/fail-payment/${id}`, { method: "PUT", token });
}

export async function fetchPromotions(
  token: string,
  params: { page?: number; limit?: number; all?: boolean; search?: string; isActive?: boolean }
) {
  return apiFetch<PagedData<PromotionRow>>("/promotions/get-promotions", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      all: params.all ?? false,
      search: params.search,
      isActive: params.isActive,
    },
  });
}

export async function createPromotionApi(token: string, body: Record<string, unknown>) {
  return apiFetch<PromotionRow>("/promotions/create-promotion", { method: "POST", body, token });
}

export async function updatePromotionApi(token: string, id: number, body: Record<string, unknown>) {
  return apiFetch<PromotionRow>(`/promotions/update-promotion/${id}`, { method: "PUT", body, token });
}

export async function deletePromotionApi(token: string, id: number) {
  return apiFetch<unknown>(`/promotions/delete-promotion/${id}`, { method: "DELETE", token });
}

export async function fetchNotifications(
  token: string,
  params: {
    page?: number;
    limit?: number;
    all?: boolean;
    onlyUnread?: boolean;
    type?: string;
    userId?: number;
  }
) {
  return apiFetch<PagedData<NotificationRow>>("/notifications/get-notifications", {
    token,
    query: {
      page: params.page ?? 1,
      limit: params.limit ?? 25,
      all: params.all ?? false,
      onlyUnread: params.onlyUnread,
      type: params.type,
      userId: params.userId,
    },
  });
}

export async function markNotificationRead(token: string, id: number) {
  return apiFetch<unknown>(`/notifications/mark-notification-as-read/${id}`, { method: "PUT", token });
}

export async function broadcastPromotionApi(token: string, body: { title: string; message: string; eventId?: number }) {
  return apiFetch<{ sent: number }>("/notifications/broadcast-promotion", { method: "POST", body, token });
}

export async function broadcastEventApi(
  token: string,
  body: { eventId: number; title: string; message: string; type?: string }
) {
  return apiFetch<{ sent: number }>("/notifications/broadcast-event", { method: "POST", body, token });
}
