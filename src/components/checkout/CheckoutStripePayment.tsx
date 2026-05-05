import { FormEvent, useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Button } from "../ui/Button";
import {
  confirmStripePaymentSync,
  pollPaymentUntilTerminal,
  stripeErrorToMessage,
} from "../../lib/checkoutPaymentsApi";
import type { PaymentDetailResponse } from "../../types/api";

type Props = {
  paymentId: number;
  token: string;
  onPaid: (detail: PaymentDetailResponse) => void;
  onBack: () => void;
};

export function CheckoutStripePayment({ paymentId, token, onPaid, onBack }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const submitResult = await elements.submit();
      if (submitResult.error) {
        setMessage(stripeErrorToMessage(submitResult.error));
        setBusy(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        setMessage(stripeErrorToMessage(error));
        setBusy(false);
        return;
      }

      const piId = paymentIntent?.id;
      if (!piId) {
        setMessage("No se recibió el identificador del cobro desde Stripe.");
        setBusy(false);
        return;
      }

      await confirmStripePaymentSync(piId, token);
      const detail = await pollPaymentUntilTerminal(paymentId, token);
      onPaid(detail);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error de red. Reintenta en unos segundos.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <PaymentElement options={{ layout: "tabs" }} />
      </div>
      {message ? <p className="text-sm text-red-400">{message}</p> : null}
      <p className="text-xs text-zinc-500">
        Tarjeta de prueba exitosa: 4242 4242 4242 4242 · Cualquier CVC y fecha futura. Rechazo de prueba: 4000 0000
        0000 0002.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" className="flex-1" disabled={busy} onClick={onBack}>
          Volver al resumen
        </Button>
        <Button type="submit" className="flex-1" disabled={busy || !stripe}>
          {busy ? "Procesando pago…" : "Pagar con tarjeta"}
        </Button>
      </div>
    </form>
  );
}
