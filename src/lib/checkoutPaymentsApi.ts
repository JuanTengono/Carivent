import { apiFetch, ApiRequestError } from "./api";
import type { PaymentDetailResponse, StripeCheckoutPrepareResponse, StripeConfirmResponse } from "../types/api";

export async function createTicketPaymentIntent(
  body: {
    eventId: number;
    quantity: number;
    promotionCode?: string;
    currency?: string;
  },
  token: string
): Promise<StripeCheckoutPrepareResponse> {
  return apiFetch<StripeCheckoutPrepareResponse>("/payments/create-payment-intent", {
    method: "POST",
    body,
    token,
  });
}

export async function confirmStripePaymentSync(paymentIntentId: string, token: string): Promise<StripeConfirmResponse> {
  return apiFetch<StripeConfirmResponse>("/payments/confirm-payment", {
    method: "POST",
    body: { paymentIntentId },
    token,
  });
}

export async function fetchPaymentDetail(paymentId: number, token: string): Promise<PaymentDetailResponse> {
  return apiFetch<PaymentDetailResponse>(`/payments/get-payment/${paymentId}`, { token });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function pollPaymentUntilTerminal(
  paymentId: number,
  token: string,
  options: { maxAttempts?: number; delayMs?: number } = {}
): Promise<PaymentDetailResponse> {
  const maxAttempts = options.maxAttempts ?? 20;
  const delayMs = options.delayMs ?? 500;
  let last: PaymentDetailResponse | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      last = await fetchPaymentDetail(paymentId, token);
    } catch (e) {
      if (e instanceof ApiRequestError && e.status >= 500 && attempt < maxAttempts - 1) {
        await sleep(delayMs * 2);
        continue;
      }
      throw e;
    }

    if (last.status === "PAID") {
      return last;
    }
    if (last.status === "FAILED") {
      throw new Error("El pago no se completó. Puedes intentar de nuevo con otra tarjeta.");
    }
    await sleep(delayMs);
  }

  throw new Error(
    "No se pudo confirmar el pago a tiempo. Si Stripe cobró, el webhook actualizará tu orden en breve; revisa tus boletos o contacta soporte."
  );
}

export function stripeErrorToMessage(error: { code?: string; message?: string; decline_code?: string } | null): string {
  if (!error?.message) {
    return "No se pudo procesar el pago.";
  }
  const code = error.code || error.decline_code;
  if (code === "card_declined") {
    return "La tarjeta fue rechazada. Prueba con otra tarjeta o con 4000 0000 0000 0002 (rechazo de prueba).";
  }
  if (code === "insufficient_funds") {
    return "Fondos insuficientes.";
  }
  if (code === "expired_card") {
    return "La tarjeta está vencida.";
  }
  if (code === "incorrect_cvc") {
    return "El CVC no es válido.";
  }
  if (code === "processing_error") {
    return "Error de procesamiento. Reintenta en unos segundos.";
  }
  return error.message;
}
