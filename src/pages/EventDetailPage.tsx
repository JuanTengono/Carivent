import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "../components/ui/Button";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import {
  fetchPublicAgendas,
  fetchPublicCapacity,
  fetchPublicEventById,
  type CapacitySnapshot,
} from "../lib/eventsApi";
import { formatCop, formatDateTime, formatTimeRange } from "../lib/format";
import type { PublicAgenda, PublicEvent } from "../types/api";

gsap.registerPlugin(ScrollTrigger);

export function EventDetailPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { id } = useParams();
  const eventId = Number(id);
  const { push } = useToast();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [agendas, setAgendas] = useState<PublicAgenda[]>([]);
  const [capacity, setCapacity] = useState<CapacitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(eventId) || eventId < 1) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const ev = await fetchPublicEventById(eventId);
        if (cancelled) return;
        setEvent(ev);

        const [ag, cap] = await Promise.allSettled([fetchPublicAgendas(eventId), fetchPublicCapacity(eventId)]);

        if (cancelled) return;
        if (ag.status === "fulfilled") setAgendas(ag.value.items);
        else if (ag.reason instanceof ApiRequestError) push(ag.reason.message, "error");
        if (cap.status === "fulfilled") setCapacity(cap.value);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof ApiRequestError ? e.message : "Error al cargar el evento";
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
    if (!event || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const introTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      introTimeline
        .from("[data-detail-badge]", {
          opacity: 0,
          y: 24,
          duration: 0.45,
        })
        .from(
          "[data-detail-title-line]",
          {
            opacity: 0,
            yPercent: 120,
            duration: 0.85,
            stagger: 0.12,
          },
          "-=0.1"
        )
        .from(
          "[data-detail-copy]",
          {
            opacity: 0,
            y: 28,
            duration: 0.55,
          },
          "-=0.45"
        )
        .from(
          "[data-detail-chip]",
          {
            opacity: 0,
            y: 24,
            duration: 0.45,
            stagger: 0.08,
          },
          "-=0.25"
        )
        .from(
          "[data-detail-visual]",
          {
            opacity: 0,
            scale: 0.94,
            rotate: -2,
            duration: 0.9,
          },
          "-=0.9"
        )
        .from(
          "[data-detail-side-card]",
          {
            opacity: 0,
            x: 28,
            duration: 0.55,
            stagger: 0.12,
          },
          "-=0.45"
        );

      gsap.utils.toArray<HTMLElement>("[data-detail-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 48,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: element,
            start: "top 84%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-detail-title]").forEach((title) => {
        gsap.from(title, {
          opacity: 0,
          yPercent: 120,
          duration: 0.8,
          ease: "power4.out",
          scrollTrigger: {
            trigger: title,
            start: "top 88%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-detail-parallax]").forEach((element) => {
        gsap.to(element, {
          yPercent: -10,
          ease: "none",
          scrollTrigger: {
            trigger: element.parentElement ?? element,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      const agendaItems = gsap.utils.toArray<HTMLElement>("[data-agenda-item]");
      if (agendaItems.length) {
        gsap.from(agendaItems, {
          opacity: 0,
          y: 36,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: "[data-agenda-list]",
            start: "top 85%",
            once: true,
          },
        });
      }

      ScrollTrigger.refresh();
    }, rootRef);

    return () => ctx.revert();
  }, [event, agendas.length]);

  if (!Number.isInteger(eventId) || eventId < 1) {
    return <p className="text-center text-zinc-500">Evento no válido.</p>;
  }

  if (loading) {
    return <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-zinc-900/80" />;
  }

  if (!event) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-zinc-400">No encontramos este evento.</p>
        <Link to="/">
          <Button variant="outline">Volver a eventos</Button>
        </Link>
      </div>
    );
  }

  const img =
    event.imageUrl ||
    "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480"><rect fill="%231a1a1a" width="100%" height="100%"/></svg>`
      );

  const infoChips = [
    {
      label: "Fecha",
      value: `${formatDateTime(event.startTime)} - ${formatDateTime(event.endTime)}`,
    },
    {
      label: "Lugar",
      value: event.site ? `${event.site.name}${event.site.city ? ` · ${event.site.city}` : ""}` : "Por definir",
    },
    {
      label: "Precio desde",
      value: formatCop(event.ticketPrice),
    },
    {
      label: "Cupo disponible",
      value: capacity
        ? `${capacity.counters.available} / ${capacity.counters.totalCapacity}`
        : "Consultando disponibilidad",
    },
  ];

  return (
    <div ref={rootRef} className="space-y-8 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-surface/80 px-6 py-7 shadow-card backdrop-blur md:px-8 lg:px-10 lg:py-9">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(131,12,196,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(131,12,196,0.1),transparent_35%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div
              data-detail-badge
              className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand"
            >
              Event Focus
            </div>

            <div className="space-y-3">
              <div className="overflow-hidden">
                <h1
                  data-detail-title-line
                  className="text-3xl font-semibold leading-tight text-white md:text-5xl"
                >
                  {event.name}
                </h1>
              </div>
              <div className="overflow-hidden">
                <p data-detail-title-line className="text-lg leading-7 text-zinc-300 md:text-xl">
                  {event.type === "PUBLIC"
                    ? "Un evento abierto para descubrir, compartir y reservar sin fricción."
                    : "Una experiencia privada con acceso controlado y detalles claros antes de comprar."}
                </p>
              </div>
            </div>

            <p data-detail-copy className="max-w-2xl whitespace-pre-wrap text-base leading-7 text-zinc-300">
              {event.description ||
                "Consulta la información clave, revisa la agenda disponible y confirma tu entrada desde esta misma página."}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {infoChips.map((chip) => (
                <div
                  key={chip.label}
                  data-detail-chip
                  className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur"
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{chip.label}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-white md:text-base">{chip.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5 lg:pl-4">
            <div data-detail-visual className="overflow-hidden rounded-[2rem] border border-white/10 bg-surface shadow-card">
              <div className="relative overflow-hidden">
                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <img
                  src={img}
                  alt={event.name}
                  className="aspect-[16/10] w-full object-cover"
                  data-detail-parallax
                />
                <div className="absolute inset-x-0 bottom-0 z-20 p-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {event.type === "PUBLIC" ? "Público" : "Privado"}
                    </span>
                    <span className="rounded-lg bg-brand/25 px-3 py-1 text-xs font-medium text-brand">
                      {event.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              data-detail-side-card
              className="rounded-2xl border border-white/10 bg-surface-elevated p-6 shadow-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Reserva</p>
                  <p className="mt-2 text-xl font-semibold text-white">Compra tu ticket ahora</p>
                </div>
                <div className="rounded-2xl bg-brand/15 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.2em] text-brand/80">Desde</p>
                  <p className="mt-1 text-lg font-semibold text-brand">{formatCop(event.ticketPrice)}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                Si aún no tienes cuenta, podrás registrarte durante el proceso de compra sin perder el flujo.
              </p>
              <Link to={`/comprar/${event.id}?step=1`} className="mt-5 block">
                <Button className="w-full !py-4 text-base">Comprar ticket</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section data-detail-reveal className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-surface/75 p-6 shadow-card">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand/80">Información</p>
            <div className="overflow-hidden">
              <h2 data-detail-title className="block text-2xl font-semibold text-white">
                Lo esencial antes de confirmar.
              </h2>
            </div>
          </div>
          <ul className="mt-6 space-y-4 text-sm text-zinc-300 md:text-base">
            <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <span className="text-zinc-500">Fecha:</span> {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
            </li>
            {event.site ? (
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <span className="text-zinc-500">Lugar:</span> {event.site.name}
                {event.site.city ? ` · ${event.site.city}` : ""}
                {event.site.address ? ` · ${event.site.address}` : ""}
              </li>
            ) : null}
            <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
              <span className="text-zinc-500">Precio desde:</span>{" "}
              <span className="font-semibold text-brand">{formatCop(event.ticketPrice)}</span>
            </li>
            {capacity ? (
              <li className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <span className="text-zinc-500">Cupo disponible:</span> {capacity.counters.available} / {capacity.counters.totalCapacity}
              </li>
            ) : null}
          </ul>
        </div>

        <div data-detail-reveal className="rounded-2xl border border-white/10 bg-surface p-6 shadow-card">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand/80">Estado</p>
            <div className="overflow-hidden">
              <h2 data-detail-title className="block text-2xl font-semibold text-white">
                Señales rápidas del evento.
              </h2>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Tipo</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {event.type === "PUBLIC" ? "Público" : "Privado"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Estado</p>
              <p className="mt-2 text-lg font-semibold text-brand">{event.status}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Agenda</p>
              <p className="mt-2 text-lg font-semibold text-white">{agendas.length || 0} actividades</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Acceso</p>
              <p className="mt-2 text-lg font-semibold text-white">Compra online</p>
            </div>
          </div>
        </div>
      </section>

      <section data-detail-reveal className="rounded-2xl border border-white/10 bg-surface p-6 shadow-card">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-brand/80">Agenda</p>
          <div className="overflow-hidden">
            <h2 data-detail-title className="block text-2xl font-semibold text-white">
              Actividades publicadas.
            </h2>
          </div>
          <p className="text-sm leading-6 text-zinc-400 md:text-base">
            Revisa la secuencia del evento para saber qué ocurre y en qué horario.
          </p>
        </div>

        {agendas.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-500">Sin actividades publicadas.</p>
        ) : (
          <ul data-agenda-list className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agendas.map((agenda) => (
              <li
                key={agenda.id}
                data-agenda-item
                className="rounded-2xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Actividad</p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{agenda.activity}</h3>
                  </div>
                  <span className="rounded-lg bg-brand/15 px-3 py-1 text-xs font-medium text-brand">
                    {agenda.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-zinc-400">
                  {formatTimeRange(agenda.startTime, agenda.endTime)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
