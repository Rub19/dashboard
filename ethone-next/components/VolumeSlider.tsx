"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function VolumeSlider({ value, onChange, className, size = "sm" }: VolumeSliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);

  const pct = useMemo(() => Math.max(0, Math.min(100, value)), [value]);
  const isMuted = pct === 0;

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      const next = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      onChange(Math.round(next));
    },
    [onChange],
  );

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onChange(isMuted ? 50 : 0)}
        className="rounded p-1 text-zinc-400 transition-colors hover:text-white"
        aria-label={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? (
          <VolumeX className={cn("h-3.5 w-3.5", size === "md" && "h-4 w-4")} />
        ) : (
          <Volume2 className={cn("h-3.5 w-3.5", size === "md" && "h-4 w-4")} />
        )}
      </button>

      <div
        ref={ref}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-full bg-white/[0.08] transition-all",
          size === "sm" ? "h-1.5 w-20" : "h-2 w-28",
        )}
        onPointerDown={(e) => {
          (e.target as HTMLDivElement).setPointerCapture?.(e.pointerId);
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          updateFromClientX(e.clientX);
        }}
        onPointerUp={(e) => {
          setDragging(false);
          try {
            (e.target as HTMLDivElement).releasePointerCapture?.(e.pointerId);
          } catch {
            // ignore
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="pointer-events-none h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className={cn(
            "pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-emerald-400 bg-zinc-950 shadow-md transition-transform",
            dragging || hovered ? "scale-125" : "scale-100",
          )}
          style={{ left: `calc(${pct}% - 5px)` }}
        />
      </div>
    </div>
  );
}
