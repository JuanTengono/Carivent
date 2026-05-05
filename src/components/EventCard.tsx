import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import type { PublicEvent } from "../types/api";
import { formatCop, formatDateTime } from "../lib/format";
import { Button } from "./ui/Button";

type Props = { event: PublicEvent };

export function EventCard({ event }: Props) {
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const img = event.imageUrl || "/placeholder-event.svg";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const frame = imageFrameRef.current;
    const image = imageRef.current;

    if (!frame || !image) {
      return;
    }

    gsap.set(image, { scale: 1.02 });

    const onMouseEnter = () => {
      gsap.to(image, {
        scale: 1.1,
        duration: 0.75,
        ease: "power3.out",
      });
    };

    const onMouseLeave = () => {
      gsap.to(image, {
        scale: 1.02,
        duration: 0.8,
        ease: "power3.out",
      });
    };

    frame.addEventListener("mouseenter", onMouseEnter);
    frame.addEventListener("mouseleave", onMouseLeave);

    return () => {
      frame.removeEventListener("mouseenter", onMouseEnter);
      frame.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <article
      data-event-card
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-card transition hover:border-brand/40"
    >
      <div ref={imageFrameRef} className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
        <img
          ref={imageRef}
          src={img}
          alt={event.name}
          loading="lazy"
          className="h-full w-full object-cover will-change-transform"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect fill="%23222" width="100%" height="100%"/><text x="50%" y="50%" fill="%23666" text-anchor="middle" font-family="sans-serif" font-size="16">Sin imagen</text></svg>`
              );
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 rounded-lg bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur">
          {event.type === "PUBLIC" ? "Público" : "Privado"}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h2 className="line-clamp-2 text-lg font-semibold text-white">{event.name}</h2>
        <p className="text-sm text-zinc-400">
          {formatDateTime(event.startTime)}
          {event.site?.city ? ` · ${event.site.city}` : ""}
        </p>
        <p className="font-bold text-brand">{formatCop(event.ticketPrice)}</p>
        <div className="mt-auto flex gap-2">
          <Link to={`/eventos/${event.id}`} className="flex-1">
            <Button variant="outline" className="w-full !py-2">
              Ver detalles
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
