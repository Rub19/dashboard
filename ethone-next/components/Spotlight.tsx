"use client";

import { useEffect, useState } from "react";
import { useSettings } from "./SettingsProvider";

export default function Spotlight() {
  const { settings } = useSettings();
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!settings.spotlightEnabled) return;
    function handleMouseMove(e: MouseEvent) {
      setPos({ x: e.clientX, y: e.clientY });
      setActive(true);
    }
    function handleMouseLeave() {
      setActive(false);
    }
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [settings.spotlightEnabled]);

  if (!settings.spotlightEnabled) return null;

  return (
    <div
      aria-hidden="true"
      className="v8-spotlight pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
      style={{
        opacity: active ? 1 : 0,
        background: `radial-gradient(450px circle at ${pos.x}px ${pos.y}px, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent 70%)`,
      }}
    />
  );
}
