import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Subtle stagger reveal for dashboard/public pages; respects reduced motion. */
export function usePageReveal(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const root = ref.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.from(root.querySelectorAll("[data-reveal]"), {
        opacity: 0,
        y: 18,
        duration: 0.42,
        stagger: 0.05,
        ease: "power3.out",
      });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional run when section reloads
  }, deps);

  return ref;
}
