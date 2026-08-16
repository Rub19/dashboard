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
  const [hovered, setHovered] = useState(false);
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
    const pageStep = step * 10;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      next = clamped + step;
    } else if (e.key === "PageUp") {
      next = clamped + pageStep;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      next = clamped - step;
    } else if (e.key === "PageDown") {
      next = clamped - pageStep;
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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative h-1.5 w-full cursor-pointer rounded-full bg-[var(--panel-bg)]/[0.08] outline-none transition-colors duration-200 hover:bg-[var(--panel-bg)]/[0.12] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-full rounded-full transition-colors duration-150 duration-75"
          style={{
            width: `${percentage}%`,
            background: "var(--accent)",
            boxShadow: "0 0 10px var(--accent-glow, rgba(168,85,247,0.35))",
          }}
        />
        <div
          className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[var(--accent)] bg-white shadow-md shadow-black/60 transition-transform duration-150 ease-out ${
            dragging || hovered ? "scale-125" : "scale-100"
          } ${dragging ? "cursor-grabbing" : ""}`}
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
      {showValue && (
        <span className="min-w-[42px] shrink-0 rounded-md border border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.06] px-2 py-0.5 text-center text-xs font-mono text-[var(--muted)] backdrop-blur-[var(--panel-blur)]">
          {clamped}
          {unit}
        </span>
      )}
    </div>
  );
}
