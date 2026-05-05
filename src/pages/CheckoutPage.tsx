import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CheckoutStripePayment } from "../components/checkout/CheckoutStripePayment";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import { createTicketPaymentIntent } from "../lib/checkoutPaymentsApi";
import { clearCheckoutDraft, readCheckoutDraft, writeCheckoutDraft } from "../lib/checkoutDraft";
import {
  fetchPublicCapacity,
  fetchPublicEventById,
  type CapacitySnapshot,
} from "../lib/eventsApi";
import { formatCop } from "../lib/format";
import type { PaymentDetailResponse, PublicEvent, StripeCheckoutPrepareResponse, TicketItem } from "../types/api";

gsap.registerPlugin(ScrollTrigger);

const MAX_STEP = 5;

function sessionDraftKey(eventId: number, quantity: number, promotionCode: string) {
  return `${eventId}|${quantity}|${promotionCode.trim().toUpperCase()}`;
}

export function CheckoutPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { eventId: rawId } = useParams();
  const eventId = Number(rawId);
  const [searchParams, setSearchParams] = useSearchParams();
  const step = Math.min(MAX_STEP, Math.max(1, Number(searchParams.get("step") || "1") || 1));
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const { push } = useToast();

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [capacity, setCapacity] = useState<CapacitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [promotionCode, setPromotionCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<StripeCheckoutPrepareResponse | null>(null);
  const [checkoutDraftKey, setCheckoutDraftKey] = useState<string | null>(null);
  const [paidSummary, setPaidSummary] = useState<PaymentDetailResponse | null>(null);

  useEffect(() => {
    if (!Number.isInteger(eventId) || eventId < 1) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ev, cap] = await Promise.all([fetchPublicEventById(eventId), fetchPublicCapacity(eventId)]);
        if (cancelled) return;
        setEvent(ev);
        setCapacity(cap);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiRequestError ? e.message : "Error al cargar";
          push(msg, "error");
          setEvent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, push]);

  useEffect(() => {
    const draft = readCheckoutDraft();
    if (draft?.eventId === eventId) {
      setQuantity(draft.quantity);
      if (draft.promotionCode) setPromotionCode(draft.promotionCode);
    }
  }, [eventId]);

  useEffect(() => {
    if (step >= 2 && !isAuthenticated) {
      const returnUrl = `/comprar/${eventId}?step=2`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [step, isAuthenticated, navigate, eventId]);

  useEffect(() => {
    if (step === MAX_STEP && !paidSummary) {
      navigate(`/comprar/${eventId}?step=1`, { replace: true });
    }
  }, [step, paidSummary, navigate, eventId]);

  const draftKey = useMemo(
    () => sessionDraftKey(eventId, quantity, promotionCode),
    [eventId, quantity, promotionCode]
  );

  useEffect(() => {
    if (checkoutSession && checkoutDraftKey && checkoutDraftKey !== draftKey) {
      setCheckoutSession(null);
      setCheckoutDraftKey(null);
    }
  }, [draftKey, checkoutSession, checkoutDraftKey]);

  const maxQty = useMemo(() => {
    if (!event) return 1;
    const avail = capacity?.counters.available ?? 999;
    const perUser = event.maxTicketsPerUser || 1;
    return Math.max(1, Math.min(20, avail, perUser));
  }, [event, capacity]);

  useEffect(() => {
    setQuantity((q) => Math.min(Math.max(1, q), maxQty));
  }, [maxQty]);

  useEffect(() => {
    if (!event || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const introTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      introTimeline
        .from("[data-checkout-step]", {
          opacity: 0,
          y: 32,
          duration: 0.6,
          stagger: 0.1,
        })
        .from(
          "[data-checkout-content]",
          {
            opacity: 0,
            y: 28,
            duration: 0.55,
            stagger: 0.08,
          },
          "-=0.35"
        );

      gsap.utils.toArray<HTMLElement>("[data-checkout-reveal]").forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 40,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            once: true,
          },
        });
      });

      ScrollTrigger.refresh();
    }, rootRef);

    return () => ctx.revert();
  }, [event, step, paidSummary]);

  const stripePromise = useMemo((): Promise<Stripe | null> | null => {
    if (!checkoutSession?.publishableKey) {
      return null;
    }
    return loadStripe(checkoutSession.publishableKey);
  }, [checkoutSession?.publishableKey]);

  if (!Number.isInteger(eventId) || eventId < 1) {
    return <p className="text-center text-zinc-500">Compra no válida.</p>;
  }

  if (loading || !event) {
    return <div className="mx-auto max-w-lg h-64 animate-pulse rounded-2xl bg-zinc-900/80" />;
  }

  const unitPrice = Number(event.ticketPrice || 0);
  const subtotal = unitPrice * quantity;

  const goStep = (n: number) => {
    setSearchParams({ step: String(n) });
  };

  const onStep1Next = () => {
    writeCheckoutDraft({ eventId, quantity });
    if (!isAuthenticated) {
      navigate(`/login?returnUrl=${encodeURIComponent(`/comprar/${eventId}?step=2`)}`);
      return;
    }
    goStep(2);
  };

  const onContinueToPayment = async () => {
    if (!token) {
      push("Debes iniciar sesión", "warning");
      return;
    }
    if (checkoutSession && checkoutDraftKey === draftKey && checkoutSession.clientSecret) {
      goStep(4);
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        eventId,
        quantity,
        currency: "COP",
      };
      const code = promotionCode.trim();
      if (code.length >= 3) body.promotionCode = code;

      const data = await createTicketPaymentIntent(
        {
          eventId,
          quantity,
          promotionCode: code.length >= 3 ? code : undefined,
          currency: "COP",
        },
        token
      );
      if (!data.clientSecret) {
        push("Stripe no devolvió client_secret", "error");
        return;
      }
      setCheckoutSession(data);
      setCheckoutDraftKey(draftKey);
      goStep(4);
    } catch (e) {
      const msg = e instanceof ApiRequestError ? e.message : "No se pudo iniciar el pago";
      push(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onPaymentSuccess = (detail: PaymentDetailResponse) => {
    setPaidSummary(detail);
    clearCheckoutDraft();
    setCheckoutSession(null);
    setCheckoutDraftKey(null);
    goStep(MAX_STEP);
    push("Pago confirmado", "success");
  };

  const tickets: TicketItem[] =
    paidSummary?.tickets?.length && paidSummary.status === "PAID"
      ? paidSummary.tickets
      : [];

  return (
    <div ref={rootRef} className="mx-auto max-w-lg space-y-8">
      <div data-checkout-step className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-500">
        <span className={step >= 1 ? "text-brand font-semibold" : ""}>1 · Cantidad</span>
        <span>→</span>
        <span className={step >= 2 ? "text-brand font-semibold" : ""}>2 · Promoción</span>
        <span>→</span>
        <span className={step >= 3 ? "text-brand font-semibold" : ""}>3 · Resumen</span>
        <span>→</span>
        <span className={step >= 4 ? "text-brand font-semibold" : ""}>4 · Pago</span>
        <span>→</span>
        <span className={step >= MAX_STEP ? "text-brand font-semibold" : ""}>5 · Confirmación</span>
      </div>

      {step === 1 ? (
        <div data-checkout-content className="rounded-2xl border border-white/10 bg-surface p-6 space-y-6 shadow-card">
          <h1 className="text-xl font-bold text-white">Seleccionar cantidad</h1>
          <p className="text-sm text-zinc-400 line-clamp-2">{event.name}</p>
          <p className="text-sm text-zinc-500">
            Cupos disponibles: {capacity?.counters.available ?? "—"} · Máx. por usuario: {event.maxTicketsPerUser}
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="secondary" type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              −
            </Button>
            <span className="min-w-[3ch] text-center text-2xl font-bold text-white">{quantity}</span>
            <Button
              variant="secondary"
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            >
              +
            </Button>
          </div>
          <div className="flex justify-between text-sm text-zinc-400">
            <span>Precio unitario</span>
            <span>{formatCop(unitPrice)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold text-white">
            <span>Subtotal</span>
            <span className="text-brand">{formatCop(subtotal)}</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to={`/eventos/${eventId}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button className="flex-1" type="button" onClick={onStep1Next}>
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div data-checkout-content className="rounded-2xl border border-white/10 bg-surface p-6 space-y-6 shadow-card">
          <h1 className="text-xl font-bold text-white">Promoción (opcional)</h1>
          <p className="text-sm text-zinc-400">
            Subtotal: <span className="font-semibold text-white">{formatCop(subtotal)}</span> · {quantity} entrada(s)
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Código promocional"
              value={promotionCode}
              onChange={(e) => setPromotionCode(e.target.value)}
              aria-label="Código promocional"
            />
          </div>
          <p className="text-xs text-zinc-500">
            El descuento lo valida el servidor al crear la orden. El cobro se realiza con Stripe (modo prueba).
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" type="button" onClick={() => goStep(1)}>
              Volver
            </Button>
            <Button className="flex-1" type="button" onClick={() => goStep(3)}>
              Siguiente: resumen
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div data-checkout-content className="rounded-2xl border border-white/10 bg-surface p-6 space-y-6 shadow-card">
          <h1 className="text-xl font-bold text-white">Resumen de compra</h1>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex justify-between">
              <span>Evento</span>
              <span className="max-w-[60%] text-right text-white">{event.name}</span>
            </li>
            <li className="flex justify-between">
              <span>Entradas</span>
              <span className="text-white">{quantity}</span>
            </li>
            <li className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCop(subtotal)}</span>
            </li>
            {promotionCode.trim().length >= 3 ? (
              <li className="flex justify-between text-zinc-500">
                <span>Promoción</span>
                <span className="font-mono text-xs">{promotionCode.trim().toUpperCase()}</span>
              </li>
            ) : null}
          </ul>
          <p className="text-xs text-zinc-500">
            El total exacto (con descuento si aplica) lo fija el servidor al iniciar el pago con Stripe.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="flex-1" type="button" onClick={() => goStep(2)}>
              Volver
            </Button>
            <Button className="flex-1" type="button" disabled={submitting} onClick={() => void onContinueToPayment()}>
              {submitting ? "Preparando pago…" : "Continuar al pago"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 4 && checkoutSession?.clientSecret && stripePromise ? (
        <div data-checkout-content className="rounded-2xl border border-white/10 bg-surface p-6 space-y-6 shadow-card">
          <h1 className="text-xl font-bold text-white">Pago seguro</h1>
          <p className="text-sm text-zinc-400">
            Orden #{checkoutSession.paymentId} · Monto cobrado en COP según el total validado por el servidor.
          </p>
          <Elements
            key={checkoutSession.clientSecret}
            stripe={stripePromise}
            options={{
              clientSecret: checkoutSession.clientSecret,
              appearance: { theme: "night", variables: { colorPrimary: "#22d3ee" } },
            }}
          >
            {token ? (
              <CheckoutStripePayment
                paymentId={checkoutSession.paymentId}
                token={token}
                onPaid={onPaymentSuccess}
                onBack={() => goStep(3)}
              />
            ) : null}
          </Elements>
        </div>
      ) : null}

      {step === MAX_STEP && paidSummary ? (
        <div
          data-checkout-content
          data-checkout-reveal
          className="rounded-2xl border border-white/10 bg-surface p-6 space-y-6 text-center shadow-card"
        >
          <div className="text-4xl">✅</div>
          <h1 className="text-2xl font-bold text-white">¡Pago completado!</h1>
          <p className="text-sm text-zinc-400">
            Estado del pago:{" "}
            <span className="font-semibold text-brand">{paidSummary.status}</span>
            {paidSummary.totalAmount != null ? (
              <>
                {" "}
                · Total <span className="font-semibold text-white">{formatCop(Number(paidSummary.totalAmount))}</span>
              </>
            ) : null}
          </p>
          {tickets.length > 0 ? (
            <div className="space-y-4 text-left">
              <p className="text-xs text-zinc-500">
                Tus boletas quedaron en estado <strong className="text-zinc-300">PURCHASED</strong> tras la
                confirmación de Stripe.
              </p>
              {tickets.map((t, idx) => (
                <div
                  key={t.id ?? t.codeQr ?? idx}
                  className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300"
                >
                  <p>
                    <span className="text-zinc-500">Código QR:</span>{" "}
                    <span className="break-all font-mono text-xs text-white">{t.codeQr}</span>
                  </p>
                  {t.status ? (
                    <p>
                      <span className="text-zinc-500">Estado ticket:</span> {t.status}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <Link to="/">
              <Button variant="outline" className="w-full">
                Volver a eventos
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
