export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  status: number;
  timestamp: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  data: unknown;
  status: number;
  timestamp: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicSite {
  id: number;
  name: string;
  imageUrl?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string | null;
  capacity?: number | null;
}

export interface PublicEvent {
  id: number;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  type: string;
  status: string;
  ticketPrice: number;
  maxTicketsPerUser: number;
  startTime: string;
  endTime: string;
  siteId: number;
  site: PublicSite | null;
}

export interface PublicAgenda {
  id: number;
  activity: string;
  eventId: number;
  startTime: string;
  endTime: string;
  status: string;
  event?: {
    id: number;
    name: string;
    imageUrl?: string | null;
    status: string;
    startTime: string;
    endTime: string;
    site?: PublicSite | null;
  } | null;
}

export interface LoginUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  emailVerified: boolean;
  emailVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  user: LoginUser;
  token: string;
}

export interface TicketItem {
  id?: number;
  codeQr?: string;
  eventId?: number;
  userId?: number;
  amount?: string | number;
  status?: string;
  validated?: boolean;
  createdAt?: string;
}

export interface PaymentItem {
  id: number;
  status: string;
  totalAmount?: string | number;
  quantity?: number;
  currency?: string;
}

export interface CreateTicketResponse {
  id?: number;
  tickets?: TicketItem[];
  totalTickets?: number;
  payment?: PaymentItem;
  pricing?: Record<string, unknown>;
  promotion?: unknown;
  capacity?: unknown;
  codeQr?: string;
  status?: string;
}

export interface StripeCheckoutPrepareResponse {
  paymentId: number;
  clientSecret: string | null;
  publishableKey: string;
  /** Centavos COP enviados a Stripe (p. ej. 5000 COP → 500000). */
  amountMinor: number;
  /** Pesos COP para UI (igual que pricing.totalAmount). */
  totalAmountCop?: number;
  currency: string;
  pricing: Record<string, unknown>;
  promotion?: unknown;
  capacity?: unknown;
  tickets?: TicketItem[];
}

export interface PaymentDetailResponse {
  id: number;
  status: string;
  totalAmount?: string | number;
  quantity?: number;
  currency?: string;
  stripePaymentIntentId?: string | null;
  tickets?: TicketItem[];
  event?: { id: number; name: string; status?: string };
}

export type StripeConfirmResponse = Record<string, unknown>;
