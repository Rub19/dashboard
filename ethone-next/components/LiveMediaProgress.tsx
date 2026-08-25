"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export interface LiveMediaProgressProps {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  onSeek: (value: number) => void;
  className?: string;
  "data-testid"?: string;
}

export default function LiveMediaProgress({
  progressMs,
  durationMs,
  isPlaying,
  onSeek,
  className,
  "data-testid": testId,
}: LiveMediaProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<{ progress: number; at: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const updateVisuals = useCallback((value: number) => {
    const pct = durationMs > 0 ? Math.min(100, Math.max(0, (value / durationMs) * 100)) : 0;
    if (fillRef.current) fillRef.current.style.width = `${pct}%`;
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
  }, [durationMs]);

  useEffect(() => {
    updateVisuals(progressMs);

    if (!isPlaying || durationMs <= 0) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      startRef.current = null;
      return;
    }

    startRef.current = { progress: progressMs, at: performance.now() };

    const tick = () => {
      if (!startRef.current) return;
      const elapsed = performance.now() - startRef.current.at;
      const next = Math.min(durationMs, startRef.current.progress + elapsed);
      updateVisuals(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [progressMs, durationMs, isPlaying, updateVisuals]);

  const pointerToValue = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return progressMs;
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(pct * durationMs / 1000) * 1000;
    },
    [durationMs, progressMs]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!durationMs) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(true);
      const next = pointerToValue(e.clientX);
      startRef.current = { progress: next, at: performance.now() };
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      updateVisuals(next);
    },
    [durationMs, pointerToValue, updateVisuals]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const next = pointerToValue(e.clientX);
      startRef.current = { progress: next, at: performance.now() };
      updateVisuals(next);
    },
    [dragging, pointerToValue, updateVisuals]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragging(false);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      const next = pointerToValue(e.clientX);
      onSeek(next);
    },
    [dragging, pointerToValue, onSeek]
  );

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "group relative h-1.5 w-full cursor-pointer rounded-full transition-[height] duration-200",
          dragging || hovered ? "h-2" : "h-1.5",
        )}
        aria-label="Progression"
      >
        <div className="absolute inset-0 rounded-full bg-white/[0.04] backdrop-blur-sm" />
        <div
          ref={fillRef}
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full transition-[width] duration-75 ease-out will-change-[width]"
          style={{
            width: "0%",
            backgroundColor: "color-mix(in srgb, var(--accent-secondary, var(--accent, #8b5cf6)) 85%, transparent)",
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent-secondary, var(--accent, #8b5cf6)) 30%, transparent)",
          }}
        />
        <div
          ref={thumbRef}
          className={cn(
            "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.12] bg-white/[0.08] shadow-md transition-transform duration-150 will-change-[left]",
            dragging || hovered ? "scale-125" : "scale-100",
          )}
          style={{
            left: "0%",
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent-secondary, var(--accent, #8b5cf6)) 35%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
