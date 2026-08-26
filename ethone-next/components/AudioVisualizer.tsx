"use client";

import { useEffect, useMemo, useRef } from "react";

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export interface AudioVisualizerProps {
  seed?: string;
  isPlaying?: boolean;
  bars?: number;
  color?: string;
  className?: string;
}

export default function AudioVisualizer({
  seed = "",
  isPlaying = false,
  bars = 14,
  color,
  className = "",
}: AudioVisualizerProps) {
  const barRefs = useRef<HTMLDivElement[]>([]);
  const seedHash = useMemo(() => hashString(seed || "ethone"), [seed]);
  const seedRef = useRef(seedHash);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    seedRef.current = seedHash;
  }, [seedHash]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = media.matches;
    const onChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let raf = 0;
    let running = true;
    const start = performance.now();
    const targets = new Float32Array(bars);
    const current = new Float32Array(bars).fill(0.15);
    const phases = new Float32Array(bars).map((_, i) => i * 0.45 + (seedRef.current % 1000) / 1000);

    const update = () => {
      const now = performance.now();
      const t = (now - start) / 1000;

      for (let i = 0; i < bars; i++) {
        const phase = phases[i];
        if (prefersReducedMotion.current) {
          targets[i] = 0.15;
        } else if (isPlaying) {
          const a = 0.5 + 0.5 * Math.sin(t * 2.2 + phase);
          const b = 0.5 + 0.5 * Math.sin(t * 1.3 + phase * 1.7);
          const c = 0.5 + 0.5 * Math.sin(t * 3.1 + phase * 2.3);
          targets[i] = clamp(0.15 + 0.85 * ((a + b + c) / 3), 0.1, 1);
        } else {
          targets[i] = 0.12 + 0.08 * Math.sin(t * 0.8 + phase);
        }
        current[i] += (targets[i] - current[i]) * 0.18;
      }

      for (let i = 0; i < bars; i++) {
        const el = barRefs.current[i];
        if (el) el.style.transform = `scaleY(${clamp(current[i], 0.05, 1).toFixed(3)})`;
      }

      if (running) raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [bars, isPlaying]);

  return (
    <div
      className={`flex h-5 items-end justify-center gap-[3px] ${className}`}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={`bar-${i}`}
          ref={(el) => {
            if (el) barRefs.current[i] = el;
          }}
          className="w-[3px] origin-bottom rounded-full will-change-transform"
          style={{
            height: "100%",
            backgroundColor: color || "var(--accent-primary)",
            transform: "scaleY(0.15)",
          }}
        />
      ))}
    </div>
  );
}
