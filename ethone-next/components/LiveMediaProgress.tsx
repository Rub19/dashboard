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

function formatMs(ms: number): string {
  if (!ms || isNaN(ms) || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
  const [currentProgress, setCurrentProgress] = useState(progressMs);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const updateVisuals = useCallback(
    (value: number) => {
      const clamped = Math.min(durationMs, Math.max(0, value));
      setCurrentProgress(clamped);
      const pct = durationMs > 0 ? (clamped / durationMs) * 100 : 0;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
    },
    [durationMs]
  );

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
      return Math.round((pct * durationMs) / 1000) * 1000;
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
    <div className={cn("space-y-1.5 w-full select-none", className)} data-testid={testId}>
      {/* Progress Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "group relative h-1.5 w-full cursor-pointer rounded-full transition-[height] duration-200 py-1 -my-1",
          dragging || hovered ? "h-2" : "h-1.5"
        )}
        aria-label="Progression de lecture"
      >
        <div className="absolute inset-0 rounded-full bg-white/[0.08] backdrop-blur-sm" />
        <div
          ref={fillRef}
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-[width] duration-75 ease-out will-change-[width]"
          style={{ width: "0%" }}
        />
        <div
          ref={thumbRef}
          className={cn(
            "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-white shadow-md shadow-emerald-500/40 transition-transform duration-150 will-change-[left]",
            dragging || hovered ? "scale-125" : "scale-100"
          )}
          style={{ left: "0%" }}
        />
      </div>

      {/* Timestamps */}
      <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)] px-0.5">
        <span className="font-semibold">{formatMs(currentProgress)}</span>
        <span>{formatMs(durationMs)}</span>
      </div>
    </div>
  );
}
