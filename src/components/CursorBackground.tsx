import { useEffect, useRef, useCallback } from "react";
import gsap from "gsap";

export function CursorBackground() {
  const pos = useRef({ x: 50, y: 20 });

  const onMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    gsap.to(pos.current, {
      x,
      y,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        document.body.style.setProperty(
          "--cursor-x",
          `${pos.current.x.toFixed(1)}%`
        );
        document.body.style.setProperty(
          "--cursor-y",
          `${pos.current.y.toFixed(1)}%`
        );
      },
    });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [onMove]);

  return null;
}
