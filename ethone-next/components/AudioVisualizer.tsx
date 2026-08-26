"use client";

import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";

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
  barWidth?: number;
  gap?: number;
}

export default function AudioVisualizer({
  seed = "",
  isPlaying = false,
  bars = 18,
  color,
  className = "",
  barWidth = 2,
  gap = 2,
}: AudioVisualizerProps) {
  const barRefs = useRef<HTMLDivElement[]>([]);
  const seedHash = useMemo(() => hashString(seed || "ethone"), [seed]);
  const reducedMotion = useReducedMotion() ?? false;

  const current = useRef<Float32Array | null>(null);
  const targets = useRef<Float32Array | null>(null);
  const phases = useRef<Float32Array | null>(null);
  const raf = useRef(0);
  const running = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (typeof window === "undefined" || reducedMotion) return;

    if (!current.current || current.current.length !== bars) {
      current.current = new Float32Array(bars).fill(0.15);
    }
    targets.current = new Float32Array(bars);
    phases.current = new Float32Array(bars).map((_, i) => i * 0.45 + (seedHash % 1000) / 1000);

    const update = () => {
      if (!running.current || !current.current || !targets.current || !phases.current) return;
      const now = performance.now();
      const t = now / 1000;
      let settled = true;

      for (let i = 0; i < bars; i++) {
        const phase = phases.current[i];
        if (isPlayingRef.current) {
          const a = 0.5 + 0.5 * Math.sin(t * 2.2 + phase);
          const b = 0.5 + 0.5 * Math.sin(t * 1.3 + phase * 1.7);
          const c = 0.5 + 0.5 * Math.sin(t * 3.1 + phase * 2.3);
          targets.current[i] = clamp(0.15 + 0.85 * ((a + b + c) / 3), 0.1, 1);
        } else {
          targets.current[i] = 0.15;
        }
        current.current[i] += (targets.current[i] - current.current[i]) * 0.18;
        if (Math.abs(current.current[i] - 0.15) > 0.01) settled = false;

        const el = barRefs.current[i];
        if (el) {
          el.style.transform = `scaleY(${clamp(current.current[i], 0.05, 1).toFixed(3)})`;
        }
      }

      if (!isPlayingRef.current && settled) {
        running.current = false;
        return;
      }

      raf.current = requestAnimationFrame(update);
    };

    tickRef.current = update;
    running.current = true;
    raf.current = requestAnimationFrame(update);

    return () => {
      running.current = false;
      cancelAnimationFrame(raf.current);
    };
  }, [bars, seedHash, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !isPlaying) return;
    if (!running.current && tickRef.current) {
      running.current = true;
      raf.current = requestAnimationFrame(tickRef.current);
    }
  }, [isPlaying, reducedMotion]);

  const style = { gap };

  return (
    <div
      className={`flex h-5 items-end justify-center ${className}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={`bar-${i}`}
          ref={(el) => {
            if (el) barRefs.current[i] = el;
          }}
          className="origin-bottom rounded-full will-change-transform transition-transform"
          style={{
            width: barWidth,
            height: "100%",
            backgroundColor: color || "var(--accent-primary)",
            transform: "scaleY(0.15)",
            opacity: reducedMotion ? 0.5 : 0.75,
          }}
        />
      ))}
    </div>
  );
}
