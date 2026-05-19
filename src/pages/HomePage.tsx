import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EventCard } from "../components/EventCard";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useToast } from "../context/ToastContext";
import { ApiRequestError } from "../lib/api";
import { fetchPublicEvents } from "../lib/eventsApi";
import type { PublicEvent } from "../types/api";

gsap.registerPlugin(ScrollTrigger);

const HERO_IMAGES = {
  main: "/images/events/feria-innovacion-tecnologica-2026.jpg",
  accentTop: "/images/events/conferencia-inteligencia-artificial-futuro.jpg",
  accentBottom: "/images/events/gala-graduacion-promocion-2026.jpg",
};

export function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { push } = useToast();
  const [items, setItems] = useState<PublicEvent[]>([]);
  const [item, setItem] = useState<PublicEvent | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [type, setType] = useState("");

  const load = useCallback(
    async (pageOverride?: number) => {
      const effectivePage = pageOverride ?? page;
      setLoading(true);
      try {
        const data = await fetchPublicEvents({
          page: effectivePage,
          limit: 12,
          search: search.trim() || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          type: type || undefined,
        });
        setItems(data.items);
        setTotalPages(data.pagination.totalPages || 1);
        const randomIndex = Math.floor(Math.random() * data.items.length);
        setItem(data.items[randomIndex]);
      } catch (e) {
        const msg = e instanceof ApiRequestError ? e.message : "No se pudieron cargar los eventos";
        push(msg, "error");
      } finally {
        setLoading(false);
      }
    },
    [page, search, dateFrom, dateTo, type, push]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

      heroTimeline
        .from("[data-hero-badge]", {
          opacity: 0,
          y: 24,
          duration: 0.45,
        })
        .from(
          "[data-hero-title-line]",
          {
            yPercent: 120,
            opacity: 0,
            duration: 0.9,
            stagger: 0.12,
          },
          "-=0.1"
        )
        .from(
          "[data-hero-copy]",
          {
            opacity: 0,
            y: 28,
            duration: 0.6,
          },
          "-=0.45"
        )
        .from(
          "[data-hero-actions] > *",
          {
            opacity: 0,
            y: 24,
            duration: 0.5,
            stagger: 0.1,
          },
          "-=0.35"
        )
        .from(
          "[data-hero-stat]",
          {
            opacity: 0,
            y: 30,
            duration: 0.5,
            stagger: 0.1,
          },
          "-=0.25"
        )
        .from(
          "[data-hero-visual]",
          {
            opacity: 0,
            scale: 0.92,
            rotate: -3,
            duration: 0.9,
          },
          "-=0.8"
        )
        .from(
          "[data-hero-floating]",
          {
            opacity: 0,
            y: 36,
            duration: 0.6,
            stagger: 0.12,
          },
          "-=0.45"
        );

      gsap.utils.toArray<HTMLElement>("[data-reveal-section]").forEach((section) => {
        gsap.from(section, {
          opacity: 0,
          y: 48,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal-title]").forEach((title) => {
        gsap.from(title, {
          yPercent: 120,
          opacity: 0,
          duration: 0.8,
          ease: "power4.out",
          scrollTrigger: {
            trigger: title,
            start: "top 88%",
            once: true,
          },
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((element) => {
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
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (loading || items.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-event-card]");

      if (!cards.length) {
        return;
      }

      gsap.from(cards, {
        opacity: 0,
        y: 56,
        scale: 0.96,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
        clearProps: "all",
        scrollTrigger: {
          trigger: "[data-events-grid]",
          start: "top 82%",
          once: true,
        },
      });

      ScrollTrigger.refresh();
    }, rootRef);

    return () => ctx.revert();
  }, [items.length, loading]);

  const applyFilters = () => {
    setPage(1);
    void load(1);
  };

  const activeFilterCount = [search, dateFrom, dateTo, type].filter(Boolean).length;
  const heroStats = [
    { label: "Eventos visibles", value: loading ? "--" : String(items.length).padStart(2, "0") },
    { label: "Filtros activos", value: String(activeFilterCount).padStart(2, "0") },
    { label: "Compra segura", value: "24/7" },
  ];

  return (
    <div ref={rootRef} className="space-y-10 pb-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-surface/80 px-6 py-8 shadow-card backdrop-blur md:px-8 lg:px-10 lg:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(131,12,196,0.25),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(131,12,196,0.12),transparent_35%)]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-7">
            <div
              data-hero-badge
              className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand"
            >
              Carivent Live Picks
            </div>

            <div className="space-y-3">
              <div className="overflow-hidden">
                <h1
                  data-hero-title-line
                  className="text-4xl font-semibold leading-tight text-white md:text-5xl xl:text-6xl"
                >
                  Descubre eventos que merecen memoria.
                </h1>
              </div>
              <div className="overflow-hidden">
                <p
                  data-hero-title-line
                  className="text-2xl font-medium leading-tight text-zinc-300 md:text-3xl xl:text-4xl"
                >
                  Compra entradas y explora experiencias con movimiento propio.
                </p>
              </div>
            </div>

            <p data-hero-copy className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              Carivent reúne deportes, tecnología, cultura y ceremonias en una sola cartelera.
              Filtra rápido, compara y entra directo al evento que te interesa.
            </p>

            <div data-hero-actions className="flex flex-wrap gap-3">
              <a
                href="#eventos-lista"
                className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark"
              >
                Ver cartelera
              </a>
              <Link
                to="/registro"
                className="inline-flex items-center justify-center rounded-xl border-2 border-brand px-5 py-3 text-sm font-semibold text-brand transition-colors duration-200 hover:bg-brand-muted"
              >
                Crear cuenta
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  data-hero-stat
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur"
                >
                  <p className="text-2xl font-semibold text-white md:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div data-hero-visual className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-0 rounded-[2rem] bg-brand/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 shadow-card">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <img
                src={item?.imageUrl || HERO_IMAGES.main}
                alt={item?.name || "Feria de Innovación Tecnológica 2026"}
                className="h-[420px] w-full object-cover md:h-[520px]"
                data-parallax
              />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8" style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}>
                <p className="text-xs uppercase tracking-[0.3em] text-brand/80">Evento destacado</p>
                <h2 className="mt-2 max-w-sm text-2xl font-semibold text-white md:text-3xl">
                  { item?.name || "Feria de Innovación Tecnológica 2026"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-300">
                  { item?.description || "Un escaparate visual para lanzamientos, networking y charlas con enfoque en futuro."}
                </p>
              </div>
            </div>

            {/*<div
              data-hero-floating
              className="absolute -left-4 top-6 hidden max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated shadow-card md:block"
            >
              <img
                src={HERO_IMAGES.accentTop}
                alt="Conferencia sobre inteligencia artificial"
                className="h-28 w-full object-cover"
                data-parallax
              />
              <div className="p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-brand/80">Conferencia</p>
                <p className="mt-2 text-sm font-medium text-white">
                  Inteligencia Artificial y el Futuro
                </p>
              </div>
            </div>

            <div
              data-hero-floating
              className="absolute -bottom-5 right-5 hidden max-w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-surface-elevated shadow-card lg:block"
            >
              <img
                src={HERO_IMAGES.accentBottom}
                alt="Gala de graduación"
                className="h-24 w-full object-cover"
                data-parallax
              />
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-brand/80">Cierre de ciclo</p>
                  <p className="mt-2 text-sm font-medium text-white">Gala Promoción 2026</p>
                </div>
                <div className="rounded-xl bg-brand/15 px-3 py-2 text-right text-xs font-semibold text-brand">
                  Live
                </div>
              </div>
            </div>*/}
          </div>
        </div>
      </section>

      <section
        data-reveal-section
        className="rounded-2xl border border-white/10 bg-surface/80 p-4 backdrop-blur md:p-6"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand/80">Búsqueda</p>
            <div className="overflow-hidden">
              <h2 data-reveal-title className="block text-2xl font-semibold text-white md:text-3xl">
                Ajusta la cartelera a tu ritmo.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
              Combina fechas, tipo de evento y texto libre para encontrar resultados más rápido.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            {activeFilterCount > 0
              ? `${activeFilterCount} filtro${activeFilterCount === 1 ? "" : "s"} activo${
                  activeFilterCount === 1 ? "" : "s"
                }`
              : "Sin filtros activos"}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFiltersOpen((value) => !value)}
          className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-left text-sm font-semibold text-white"
        >
          Filtros
          <span className="text-zinc-500">{filtersOpen ? "▴" : "▾"}</span>
        </button>
        {filtersOpen ? (
          <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Buscar por nombre o ciudad"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Búsqueda"
            />
            <Input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Desde"
            />
            <Input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Hasta"
            />
            <select
              className="rounded-xl border border-white/10 bg-surface px-4 py-3 text-sm text-white outline-none focus:border-brand"
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Tipo de evento"
            >
              <option value="">Todos los tipos</option>
              <option value="PUBLIC">Público</option>
              <option value="PRIVATE">Privado</option>
            </select>
            <div className="flex flex-wrap gap-2 md:col-span-2 lg:col-span-4">
              <Button type="button" onClick={applyFilters}>
                Aplicar filtros
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setDateFrom("");
                  setDateTo("");
                  setType("");
                  setPage(1);
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section id="eventos-lista" data-reveal-section className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-brand/80">Cartelera</p>
            <div className="overflow-hidden">
              <h2 data-reveal-title className="block text-2xl font-semibold text-white md:text-3xl">
                Eventos listos para reservar.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400 md:text-base">
              Cada tarjeta conserva su imagen local y ahora entra a escena con animación escalonada.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-2xl border border-white/10 bg-surface/70 px-4 py-3 text-center shadow-card">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Resultados</p>
              <p className="mt-2 text-2xl font-semibold text-white">{loading ? "--" : items.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-surface/70 px-4 py-3 text-center shadow-card">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Páginas</p>
              <p className="mt-2 text-2xl font-semibold text-white">{totalPages}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-2xl bg-zinc-900/80" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">No hay eventos con estos criterios.</p>
        ) : (
          <>
            <div data-events-grid className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                >
                  Anterior
                </Button>
                <span className="flex items-center px-2 text-sm text-zinc-400">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
