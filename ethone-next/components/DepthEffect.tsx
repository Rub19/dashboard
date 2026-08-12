"use client";

import { useEffect } from "react";
import { useSettings } from "@/components/SettingsProvider";

const TILT_MAX = 12;
const LIFT_MAX = 8;

// Subtle target selector that works on any element declaring itself as a depth target
// or on live widgets. The effect is intentionally disabled on the generic Card3D
// component because Card3D already manages its own tilt through Framer Motion.
const DEPTH_TARGET_SELECTOR = [
  "[data-depth-target]",
  "[data-live-widget]",
].join(", ");

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function setDepth(element: HTMLElement, event: MouseEvent) {
  const rect = element.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  const tiltY = (x - 0.5) * TILT_MAX;
  const tiltX = (0.5 - y) * TILT_MAX;
  const lift = -Math.round(y * LIFT_MAX);

  const target = (element.querySelector(".v8-live-card-inner") as HTMLElement | null) || element;

  target.style.setProperty("--v8-tilt-x", `${tiltX.toFixed(2)}deg`);
  target.style.setProperty("--v8-tilt-y", `${tiltY.toFixed(2)}deg`);
  target.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(${lift}px)`;

  element.style.setProperty("--v8-spotlight-x", `${(x * 100).toFixed(1)}%`);
  element.style.setProperty("--v8-spotlight-y", `${(y * 100).toFixed(1)}%`);
  element.classList.add("v8-depth-active");
}

function resetDepth(element: HTMLElement) {
  const target = (element.querySelector(".v8-live-card-inner") as HTMLElement | null) || element;
  target.style.transform = "";
  target.style.setProperty("--v8-tilt-x", "0deg");
  target.style.setProperty("--v8-tilt-y", "0deg");
  element.style.setProperty("--v8-spotlight-x", "50%");
  element.style.setProperty("--v8-spotlight-y", "50%");
  element.classList.remove("v8-depth-active");
}

export function useDepthEffect() {
  const { settings } = useSettings();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!settings.cardTilt) return;
    if (settings.reducedMotion) return;
    if (settings.performanceMode === "low") return;

    const isTouch = window.matchMedia?.("(pointer: coarse)").matches === true;
    if (isTouch) return;

    const onMove = (event: MouseEvent) => {
      const card = (event.target as HTMLElement | null)?.closest?.(DEPTH_TARGET_SELECTOR) as HTMLElement | null;
      if (!card) return;
      setDepth(card, event);
    };

    const onLeave = (event: MouseEvent) => {
      const card = (event.target as HTMLElement | null)?.closest?.(DEPTH_TARGET_SELECTOR) as HTMLElement | null;
      if (!card) return;
      resetDepth(card);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseout", onLeave, { passive: true });

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onLeave);
      document.querySelectorAll<HTMLElement>(DEPTH_TARGET_SELECTOR).forEach(resetDepth);
    };
  }, [settings.cardTilt, settings.reducedMotion, settings.performanceMode]);
}

export default function DepthEffect() {
  useDepthEffect();
  return null;
}
