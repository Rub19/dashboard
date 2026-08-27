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
  minHeight?: number;
}

export default function AudioVisualizer({
  isPlaying = false,
  bars = 5,
  color,
  className = "",
  barWidth = 2,
  gap = 2,
  minHeight = 0.2,
}: AudioVisualizerProps) {
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const reducedMotion = useReducedMotion() ?? false;

  const current = useRef<Float32Array | null>(null);
  const targets = useRef<Float32Array | null>(null);
  const speeds = useRef<Float32Array | null>(null);
  const phases = useRef<Float32Array | null>(null);
  const multipliers = useRef<Float32Array | null>(null);
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
      current.current = new Float32Array(bars).fill(minHeight);
    }
    targets.current = new Float32Array(bars);
    speeds.current = new Float32Array(bars).map((_, i) => 2.4 + (i % 3) * 0.8 + ((i * 13) % 7) * 0.15);
    phases.current = new Float32Array(bars).map((_, i) => i * 0.65 + 0.2);
    multipliers.current = new Float32Array(bars).map((_, i) => {
      // Shape dynamic wave: mid and high-mid bars have slightly more energy
      const centerDist = Math.abs(i - (bars - 1) / 2) / Math.max(1, (bars - 1) / 2);
      return 0.85 + (1 - centerDist) * 0.35;
    });

    const update = () => {
      if (!running.current || !current.current || !targets.current || !phases.current || !speeds.current || !multipliers.current) return;
      const now = performance.now();
      const t = now / 1000;
      let settled = true;

      for (let i = 0; i < bars; i++) {
        const phase = phases.current[i];
        const spd = speeds.current[i];
        const mult = multipliers.current[i];

        if (isPlayingRef.current) {
          // Apple Music-inspired organic multi-harmonic oscillation
          const waveA = 0.5 + 0.5 * Math.sin(t * spd + phase);
          const waveB = 0.5 + 0.5 * Math.sin(t * (spd * 1.4) + phase * 2.1);
          const waveC = 0.5 + 0.5 * Math.sin(t * (spd * 0.6) + phase * 0.8);
          const waveD = 0.5 + 0.5 * Math.cos(t * 1.8 + phase * 1.5);
          
          const blended = (waveA * 0.45 + waveB * 0.25 + waveC * 0.2 + waveD * 0.1) * mult;
          targets.current[i] = clamp(minHeight + (1 - minHeight) * blended, minHeight, 1);
        } else {
          targets.current[i] = minHeight;
        }

        // Smooth spring-like lerp with organic inertia
        const diff = targets.current[i] - current.current[i];
        const lerpFactor = isPlayingRef.current ? 0.22 : 0.12;
        current.current[i] += diff * lerpFactor;

        if (Math.abs(current.current[i] - minHeight) > 0.008) {
          settled = false;
        }

        const el = barRefs.current[i];
        if (el) {
          const val = clamp(current.current[i], minHeight, 1);
          el.style.transform = `scaleY(${val.toFixed(3)})`;
          el.style.opacity = isPlayingRef.current ? "0.9" : "0.35";
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
  }, [bars, minHeight, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !isPlaying) return;
    if (!running.current && tickRef.current) {
      running.current = true;
      raf.current = requestAnimationFrame(tickRef.current);
    }
  }, [isPlaying, reducedMotion]);

  return (
    <div
      className={`flex h-4 items-end justify-center ${className}`}
      style={{ gap }}
      aria-hidden="true"
      role="presentation"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={`bar-${i}`}
          ref={(el) => {
            barRefs.current[i] = el;
          }}
          className="origin-bottom rounded-full will-change-transform transition-opacity duration-200"
          style={{
            width: barWidth,
            height: "100%",
            backgroundColor: color || "var(--accent-primary)",
            transform: `scaleY(${minHeight})`,
            opacity: reducedMotion ? 0.5 : isPlaying ? 0.9 : 0.35,
          }}
        />
      ))}
    </div>
  );
}
