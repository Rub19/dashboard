"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";

type SwitchSize = "sm" | "md" | "lg";

type SwitchLabels = { on?: string; off?: string } | boolean | undefined;

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void | Promise<void>;
  onToggle?: (checked: boolean) => void | Promise<void>;
  label?: React.ReactNode;
  labels?: SwitchLabels;
  disabled?: boolean;
  size?: SwitchSize;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

const SIZES: Record<
  SwitchSize,
  { rail: string; knob: string; travel: number }
> = {
  sm: { rail: "h-5 w-9", knob: "h-3.5 w-3.5", travel: 14 },
  md: { rail: "h-6 w-11", knob: "h-4 w-4", travel: 18 },
  lg: { rail: "h-7 w-14", knob: "h-5 w-5", travel: 24 },
};

export default function Switch({
  checked,
  defaultChecked = false,
  onChange,
  onToggle,
  label,
  labels = false,
  disabled = false,
  size = "md",
  id,
  name,
  className = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id || generatedId;
  const isControlled = checked !== undefined;
  const [optimistic, setOptimistic] = useState(isControlled ? checked : defaultChecked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checked !== undefined && !isLoading && checked !== optimistic) {
      setOptimistic(checked);
      setError(null);
    }
  }, [checked, isLoading, optimistic]);

  const labelPair =
    typeof labels === "boolean"
      ? labels
        ? { on: "ON", off: "OFF" }
        : null
      : labels
        ? { on: labels.on ?? "ON", off: labels.off ?? "OFF" }
        : null;

  const handleToggle = useCallback(async () => {
    if (disabled || isLoading) return;
    const next = !optimistic;
    setError(null);
    setOptimistic(next);

    const callback = onChange ?? onToggle;
    if (!callback) return;

    const result = callback(next);
    if (result && typeof (result as Promise<void>).then === "function") {
      setIsLoading(true);
      try {
        await result;
      } catch {
        setOptimistic(!next);
        setError("Impossible d'enregistrer, réessayez");
      } finally {
        setIsLoading(false);
      }
    }
  }, [optimistic, disabled, isLoading, onChange, onToggle]);

  const sizeConfig = SIZES[size];
  const current = optimistic;
  const labelId = `${switchId}-label`;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {label && (
        <label
          htmlFor={switchId}
          id={labelId}
          className={`cursor-pointer select-none text-sm font-medium text-[var(--foreground)] ${disabled || isLoading ? "opacity-50" : ""}`}
        >
          {label}
        </label>
      )}

      <button
        id={switchId}
        name={name}
        type="button"
        role="switch"
        aria-checked={current}
        aria-busy={isLoading}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
        disabled={disabled || isLoading}
        onClick={handleToggle}
        className={`group relative inline-flex items-center rounded-full border-2 p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50 ${sizeConfig.rail} ${
          current
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
        } backdrop-blur-[var(--panel-blur)]`}
      >
        <span
          aria-hidden="true"
          className={`relative z-10 flex items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${sizeConfig.knob}`}
          style={{ transform: `translateX(${current ? sizeConfig.travel : 0}px)` }}
        >
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-[var(--accent)]" />}
        </span>
      </button>

      {labelPair && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {current ? labelPair.on : labelPair.off}
        </span>
      )}

      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
