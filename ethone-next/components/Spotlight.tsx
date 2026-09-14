"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "./SettingsProvider";

export default function Spotlight() {
  const { settings } = useSettings();
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings.spotlightEnabled) return;
    const el = elRef.current;
    if (!el) return;

    let raf = 0;
    let x = -1000;
    let y = -1000;

    function applyPosition() {
      raf = 0;
      if (!el) return;
      el.style.background = `radial-gradient(450px circle at ${x}px ${y}px, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 70%)`;
    }

    function handleMouseMove(e: MouseEvent) {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(applyPosition);
      if (el) el.style.opacity = "1";
    }
    function handleMouseLeave() {
      if (el) el.style.opacity = "0";
    }
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [settings.spotlightEnabled]);

  if (!settings.spotlightEnabled) return null;

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="v8-spotlight pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
      style={{
        opacity: 0,
        background:
          "radial-gradient(450px circle at -1000px -1000px, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 70%)",
      }}
    />
  );
}
