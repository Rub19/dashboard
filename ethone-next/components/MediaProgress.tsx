"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export interface MediaProgressProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  "data-testid"?: string;
}

export default function MediaProgress({
  value,
  max,
  onChange,
  className,
  disabled = false,
  "data-testid": testId,
}: MediaProgressProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragValue, setDragValue] = useState(value);

  useEffect(() => {
    if (!dragging) setDragValue(value);
  }, [value, dragging]);

  const percentage = max > 0 ? Math.min(100, Math.max(0, ((dragging ? dragValue : value) / max) * 100)) : 0;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const next = Math.round(pct * max / 1000) * 1000;
      setDragValue(Math.min(max, Math.max(0, next)));
    },
    [max],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled || !max) return;
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
      setDragging(true);
      updateFromClientX(e.clientX);
    },
    [disabled, max, updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      updateFromClientX(e.clientX);
    },
    [dragging, updateFromClientX],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      setDragging(false);
      onChange(dragValue);
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    },
    [dragging, dragValue, onChange],
  );

  return (
    <div className={cn("space-y-1.5", className)} data-testid={testId}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "group relative h-1.5 w-full cursor-pointer rounded-full transition-[height] duration-200",
          disabled ? "cursor-not-allowed opacity-40" : "hover:h-2",
        )}
        aria-label="Progression"
      >
        <div className="absolute inset-0 rounded-full bg-white/[0.04] backdrop-blur-sm" />
        <div
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full transition-[width] duration-75 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: "color-mix(in srgb, var(--accent-color, var(--accent, #10b981)) 85%, transparent)",
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent-color, var(--accent, #10b981)) 30%, transparent)",
          }}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.12] bg-white/[0.08] shadow-md transition-transform duration-150",
            dragging || hovered ? "scale-125" : "scale-100",
          )}
          style={{
            left: `${percentage}%`,
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent-color, var(--accent, #10b981)) 35%, transparent)",
          }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[10px] tabular-nums text-zinc-500">
        <span>{formatMs(dragging ? dragValue : value)}</span>
        <span>-{formatMs(Math.max(0, max - (dragging ? dragValue : value)))}</span>
      </div>
    </div>
  );
}
