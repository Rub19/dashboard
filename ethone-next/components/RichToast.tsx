"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type RichToastVariant = "success" | "error" | "info" | "warning" | "neutral" | "version" | "ai";

type RichToastAction = {
  label: string;
  onClick: () => void;
};

type RichToastProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: RichToastVariant;
  action?: RichToastAction;
  duration?: number;
  className?: string;
  badge?: string;
};

/**
 * One flat treatment for every toast. Each variant contributes a single
 * semantic colour (a CSS var), used for the icon, the status dot and the
 * progress bar — no per-variant glow shadows, laser gradients, or
 * hardcoded emerald/cyan/purple that broke on light themes.
 */
const VARIANT_CONFIG: Record<RichToastVariant, { color: string; defaultBadge: string }> = {
  success: { color: "var(--success)", defaultBadge: "Succès" },
  error: { color: "var(--danger)", defaultBadge: "Erreur" },
  warning: { color: "var(--warning)", defaultBadge: "Alerte" },
  info: { color: "var(--info)", defaultBadge: "Info" },
  version: { color: "var(--accent-primary)", defaultBadge: "Système" },
  ai: { color: "var(--accent-primary)", defaultBadge: "Assistant" },
  neutral: { color: "var(--text-muted)", defaultBadge: "Notification" },
};

export default function RichToast({
  icon,
  title,
  description,
  variant = "neutral",
  action,
  duration,
  className,
  badge,
}: RichToastProps) {
  const [playState, setPlayState] = useState<"running" | "paused">("running");
  const showProgress = typeof duration === "number" && duration > 0 && duration !== Infinity;
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.neutral;
  const displayBadge = badge || cfg.defaultBadge;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.97 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "v8-panel relative flex w-full flex-col overflow-hidden p-3.5 select-none shadow-lg",
        className
      )}
      onMouseEnter={() => setPlayState("paused")}
      onMouseLeave={() => setPlayState("running")}
    >
      <div className="flex w-full items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            color: cfg.color,
            borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
            backgroundColor: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
          }}
        >
          {icon}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              <p className="truncate text-xs font-semibold leading-tight text-[var(--text-primary)]">{title}</p>
            </div>

            {displayBadge && (
              <span className="shrink-0 rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                {displayBadge}
              </span>
            )}
          </div>

          {description ? (
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--text-muted)]">{description}</p>
          ) : null}

          {action ? (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={action.onClick}
                className="cursor-pointer rounded-lg border border-[var(--panel-border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)] active:scale-95 focus:outline-none"
              >
                {action.label}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="relative mt-3 h-[2px] w-full overflow-hidden rounded-full bg-[var(--panel-border)]">
          <div
            className="toast-progress h-full w-full origin-left rounded-full"
            style={{
              backgroundColor: cfg.color,
              animationDuration: `${duration}ms`,
              animationPlayState: playState,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
