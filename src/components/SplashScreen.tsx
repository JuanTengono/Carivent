import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

type Props = {
  onComplete: () => void;
  minimumDuration?: number;
};

export function SplashScreen({ onComplete, minimumDuration = 2000 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);
  const hasCompleted = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, minimumDuration);
      return () => clearTimeout(timer);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          if (!hasCompleted.current) {
            hasCompleted.current = true;
            gsap.to(rootRef.current, {
              opacity: 0,
              duration: 0.4,
              ease: "power2.in",
              onComplete: () => {
                setIsVisible(false);
                onComplete();
              },
            });
          }
        },
      });

      tl.from("[data-splash-logo]", {
        scale: 0.3,
        opacity: 0,
        duration: 0.8,
        ease: "back.out(1.7)",
      })
        .from(
          "[data-splash-text]",
          {
            y: 32,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
          },
          "-=0.4"
        )
        .from(
          "[data-splash-tagline]",
          {
            y: 20,
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
          },
          "-=0.25"
        )
        .to(
          "[data-splash-loader]",
          {
            scaleX: 1,
            duration: minimumDuration / 1000 - 0.6,
            ease: "power1.inOut",
          },
          "-=0.15"
        );
    }, rootRef);

    return () => ctx.revert();
  }, [minimumDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(131,12,196,0.15),transparent_70%)]" />

      <div className="relative flex flex-col items-center">
        <div
          data-splash-logo
          className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-4xl font-bold text-white shadow-[0_0_60px_rgba(131,12,196,0.5)]"
        >
          C
        </div>

        <div data-splash-text className="mt-8 flex items-center gap-1">
          <span className="text-3xl font-bold tracking-tight text-white">
            Carivent
          </span>
          <span className="text-3xl font-bold text-brand">.</span>
        </div>

        <p
          data-splash-tagline
          className="mt-3 text-sm font-medium tracking-wide text-zinc-500"
        >
          Descubre eventos incredible
        </p>

        <div className="mt-10 h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
          <div
            data-splash-loader
            className="h-full origin-left scale-x-0 rounded-full bg-brand shadow-[0_0_12px_rgba(131,12,196,0.6)]"
          />
        </div>
      </div>
    </div>
  );
}