"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STEP_KEYS = ["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown", "Home", "End", "PageUp", "PageDown"];

export type SliderProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  showValue?: boolean;
  className?: string;
  "aria-label"?: string;
};

export default function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  showValue = true,
  className = "",
  "aria-label": ariaLabel,
}: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const clamped = useMemo(() => Math.min(max, Math.max(min, value)), [value, min, max]);
  const percentage = useMemo(() => {
    if (max === min) return 0;
    return ((clamped - min) / (max - min)) * 100;
  }, [clamped, min, max]);

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    const next = Math.round(raw / step) * step;
    onChange(Math.min(max, Math.max(min, next)));
  }, [min, max, step, onChange]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const handleUp = () => setDragging(false);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, updateFromClientX]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!STEP_KEYS.includes(e.key)) return;
    e.preventDefault();

    let next = clamped;
    if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "PageUp") {
      next = clamped + step;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "PageDown") {
      next = clamped - step;
    } else if (e.key === "Home") {
      next = min;
    } else if (e.key === "End") {
      next = max;
    }
    onChange(Math.min(max, Math.max(min, next)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLDivElement).setPointerCapture?.(e.pointerId);
    setDragging(true);
    updateFromClientX(e.clientX);
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        ref={trackRef}
        role="slider"
        aria-label={ariaLabel}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        className={`relative h-3 w-full cursor-pointer rounded-full bg-[var(--surface-raised)] outline-none transition hover:bg-[var(--surface)] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
          dragging ? "cursor-grabbing" : "cursor-pointer"
        }`}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-[var(--accent)] bg-white shadow-lg"
          style={{ left: `calc(${percentage}% - 10px)` }}
        />
      </div>
      {showValue && (
        <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-[var(--foreground)]">
          {clamped}
          {unit}
        </span>
      )}
    </div>
  );
}
