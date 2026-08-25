"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  size?: "sm" | "md";
  "data-testid"?: string;
}

export default function VolumeSlider({
  value,
  onChange,
  className,
  size = "sm",
  "data-testid": testId,
}: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const lastNonZeroRef = useRef(value || 50);

  const pct = Math.max(0, Math.min(100, dragging ? dragValue : value));
  const isMuted = value === 0;

  useEffect(() => {
    if (!dragging) setDragValue(value);
    if (value > 0) lastNonZeroRef.current = value;
  }, [value, dragging]);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      setDragValue(Math.round(next));
    },
    [],
  );

  const commit = useCallback(
    (next: number) => {
      onChange(Math.max(0, Math.min(100, Math.round(next))));
    },
    [onChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
      setDragging(true);
      updateFromClientX(e.clientX);
    },
    [updateFromClientX],
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
      setDragging(false);
      commit(dragValue);
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    },
    [commit, dragValue],
  );

  const trackHeight = size === "sm" ? "h-1.5" : "h-2";
  const trackWidth = size === "sm" ? "w-20" : "w-28";
  const thumbSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div className={cn("flex items-center gap-1.5", className)} data-testid={testId}>
      <button
        type="button"
        onClick={() => onChange(isMuted ? lastNonZeroRef.current || 50 : 0)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]"
        aria-label={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? (
          <VolumeX className={cn("h-3.5 w-3.5", size === "md" && "h-4 w-4")} />
        ) : (
          <Volume2 className={cn("h-3.5 w-3.5", size === "md" && "h-4 w-4")} />
        )}
      </button>

      <div
        ref={trackRef}
        aria-label="Volume"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cn(
          "group relative cursor-pointer rounded-full",
          trackHeight,
          trackWidth,
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setHovered(false)}
        onPointerEnter={() => setHovered(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="absolute inset-0 rounded-full bg-white/[0.04] backdrop-blur-sm" />
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-75 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: "color-mix(in srgb, var(--accent-color, var(--accent, #10b981)) 85%, transparent)",
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent-color, var(--accent, #10b981)) 30%, transparent)",
          }}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.12] bg-white/[0.08] shadow-md transition-transform",
            thumbSize,
            dragging || hovered ? "scale-125" : "scale-100",
          )}
          style={{
            left: `${pct}%`,
            boxShadow: "0 0 10px color-mix(in srgb, var(--accent-color, var(--accent, #10b981)) 35%, transparent)",
          }}
        />
      </div>
    </div>
  );
}
