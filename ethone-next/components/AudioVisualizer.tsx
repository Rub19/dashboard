"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

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
  isPlaying = false,
  bars = 18,
  color,
  className = "",
  barWidth = 2,
  gap = 2,
}: AudioVisualizerProps) {
  const barRefs = useRef<HTMLDivElement[]>([]);
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
    phases.current = new Float32Array(bars).map((_, i) => i * 0.47 + 0.13);

    const update = () => {
      if (!running.current || !current.current || !targets.current || !phases.current) return;
      const now = performance.now();
      const t = now / 1000;
      let settled = true;

      for (let i = 0; i < bars; i++) {
        const phase = phases.current[i];
        if (isPlayingRef.current) {
          const a = 0.5 + 0.5 * Math.sin(t * 2.1 + phase);
          const b = 0.5 + 0.5 * Math.sin(t * 1.5 + phase * 1.9);
          const c = 0.5 + 0.5 * Math.sin(t * 3.3 + phase * 2.4);
          const d = 0.5 + 0.5 * Math.sin(t * 0.7 + phase * 0.5);
          targets.current[i] = clamp(0.15 + 0.85 * ((a + b + c + d) / 4), 0.1, 1);
        } else {
          targets.current[i] = 0.15;
        }
        current.current[i] += (targets.current[i] - current.current[i]) * 0.16;
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
  }, [bars, reducedMotion]);

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
