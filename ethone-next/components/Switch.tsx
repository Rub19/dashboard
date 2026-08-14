"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

type SwitchSize = "sm" | "md" | "lg";

type SwitchLabels =
  | { on?: string; off?: string }
  | boolean
  | undefined;

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
  {
    rail: string;
    knob: string;
    icon: string;
    travel: number;
    labelClass: string;
  }
> = {
  sm: {
    rail: "w-9 h-6",
    knob: "h-3 w-3",
    icon: "h-2.5 w-2.5",
    travel: 12,
    labelClass: "text-[0.4rem]",
  },
  md: {
    rail: "w-11 h-7",
    knob: "h-4 w-4",
    icon: "h-3 w-3",
    travel: 16,
    labelClass: "text-[0.5rem]",
  },
  lg: {
    rail: "w-14 h-8",
    knob: "h-5 w-5",
    icon: "h-3.5 w-3.5",
    travel: 24,
    labelClass: "text-[0.6rem]",
  },
};

const MOTION_TRANSITION = {
  type: "tween" as const,
  duration: 0.25,
  ease: "easeOut" as const,
};

export default function Switch({
  checked,
  defaultChecked = false,
  onChange,
  onToggle,
  label,
  labels = true,
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

  const [optimistic, setOptimistic] = useState(
    isControlled ? checked : defaultChecked
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = optimistic;
  const sizeConfig = SIZES[size];

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
        ? {
            on: labels.on ?? "ON",
            off: labels.off ?? "OFF",
          }
        : null;

  const handleToggle = useCallback(async () => {
    if (disabled || isLoading) return;

    const next = !current;
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
  }, [current, disabled, isLoading, onChange, onToggle]);

  const railColor = current ? "var(--accent)" : "var(--surface-raised)";
  const railBorder = current ? "var(--accent)" : "var(--border)";

  const knobShadow = current
    ? `0 0 12px 2px var(--accent), 0 2px 4px rgba(0, 0, 0, 0.3)`
    : `0 2px 4px rgba(0, 0, 0, 0.3)`;

  const labelId = `${switchId}-label`;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className="inline-flex items-center gap-3">
        {label && (
          <label
            htmlFor={switchId}
            id={labelId}
            className={`cursor-pointer select-none text-sm font-medium text-[var(--foreground)] ${disabled || isLoading ? "opacity-50" : ""}`}
          >
            {label}
          </label>
        )}

        <motion.button
          id={switchId}
          name={name}
          type="button"
          role="switch"
          aria-checked={current}
          aria-busy={isLoading}
          aria-label={ariaLabel}
          aria-labelledby={
            ariaLabelledBy ?? (label ? labelId : undefined)
          }
          disabled={disabled || isLoading}
          onClick={handleToggle}
          whileTap={disabled || isLoading ? {} : { scale: 0.96 }}
          animate={{
            backgroundColor: railColor,
            borderColor: railBorder,
            boxShadow: current
              ? `0 0 18px 0 var(--accent)`
              : `0 0 0 0 rgba(0, 0, 0, 0)`,
          }}
          transition={MOTION_TRANSITION}
          className={`relative flex items-center rounded-full border-2 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${sizeConfig.rail}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            {labelPair && !current && (
              <motion.span
                key="off-label"
                initial={{ opacity: 0, x: 4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4 }}
                transition={MOTION_TRANSITION}
                className={`pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-bold uppercase tracking-tight text-[var(--muted)] ${sizeConfig.labelClass}`}
              >
                {labelPair.off}
              </motion.span>
            )}
            {labelPair && current && (
              <motion.span
                key="on-label"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                transition={MOTION_TRANSITION}
                className={`pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 font-bold uppercase tracking-tight text-white/90 ${sizeConfig.labelClass}`}
              >
                {labelPair.on}
              </motion.span>
            )}
          </AnimatePresence>

          <motion.span
            aria-hidden="true"
            className={`relative z-10 flex items-center justify-center rounded-full bg-white ${sizeConfig.knob}`}
            animate={{
              x: current ? sizeConfig.travel : 0,
              boxShadow: knobShadow,
            }}
            transition={MOTION_TRANSITION}
          >
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.span
                  key="spinner"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2
                    className={`${sizeConfig.icon} animate-spin text-[var(--accent)]`}
                    aria-hidden="true"
                  />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.span
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
