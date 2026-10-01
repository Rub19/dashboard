"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { SPRING_PANEL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
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

/** One semantic colour per variant (a theme token) drives the icon, the
 * label and the countdown ring — so every toast works on all 13 themes. */
const VARIANT_CONFIG: Record<RichToastVariant, { color: string; defaultBadge: string }> = {
  success: { color: "var(--success)", defaultBadge: "Succès" },
  error: { color: "var(--danger)", defaultBadge: "Erreur" },
  warning: { color: "var(--warning)", defaultBadge: "Alerte" },
  info: { color: "var(--info)", defaultBadge: "Info" },
  version: { color: "var(--accent-primary)", defaultBadge: "Système" },
  ai: { color: "var(--accent-primary)", defaultBadge: "Assistant" },
  neutral: { color: "var(--text-muted)", defaultBadge: "Notification" },
};

/** Toast card: the icon sits inside a ring that drains over the toast's
 * lifetime (paused while hovered); a small coloured label sits above the
 * title; ON/OFF toasts show a mini switch instead of a label. */
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
  const { reduced } = useMotionPref();
  const [playState, setPlayState] = useState<"running" | "paused">("running");
  const timed = typeof duration === "number" && duration > 0 && duration !== Infinity;
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.neutral;
  const label = badge || cfg.defaultBadge;
  const toggleState = label === "ON" || label === "Actif" ? true : label === "OFF" || label === "Inactif" ? false : null;
  const color = toggleState === true ? "var(--success)" : toggleState === false ? "var(--text-muted)" : cfg.color;
  const tint = (pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, x: 32, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.97, filter: "blur(4px)", transition: { duration: 0.16 } }}
      transition={SPRING_PANEL}
      className={cn(
        "relative flex w-full max-w-[24rem] items-start gap-3.5 overflow-hidden rounded-[1.1rem] border border-[var(--panel-border)] p-3.5 pr-4 select-none backdrop-blur-2xl",
        "shadow-[0_20px_50px_-20px_rgb(0_0_0/0.6)]",
        className
      )}
      style={{ background: "color-mix(in srgb, var(--bg-card, var(--bg-main)) 94%, transparent)" }}
      onMouseEnter={() => setPlayState("paused")}
      onMouseLeave={() => setPlayState("running")}
    >
      {/* Top edge in the variant colour */}
      <div aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(to right, transparent, ${tint(70)}, transparent)` }} />

      {/* Icon inside its countdown ring */}
      <div className="relative grid h-11 w-11 shrink-0 place-items-center">
        <svg aria-hidden viewBox="0 0 44 44" className="absolute inset-0 -rotate-90">
          <circle cx="22" cy="22" r="20.5" fill={tint(12)} stroke={tint(18)} strokeWidth="1.5" />
          {timed && (
            <circle
              cx="22"
              cy="22"
              r="20.5"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              className="toast-ring"
              style={{ animationDuration: `${duration}ms`, animationPlayState: playState }}
            />
          )}
        </svg>
        <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-full" style={{ color }}>
          {icon}
        </span>
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center justify-between gap-3">
          {toggleState === null ? (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
              {label}
            </span>
          ) : (
            <span aria-label={label} className="relative inline-flex h-4 w-7 items-center rounded-full transition-colors" style={{ background: tint(toggleState ? 85 : 35) }}>
              <motion.span
                className="absolute h-3 w-3 rounded-full bg-[var(--bg-main)]"
                initial={{ x: toggleState ? 2 : 14 }}
                animate={{ x: toggleState ? 14 : 2 }}
                transition={SPRING_PANEL}
              />
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-semibold leading-snug text-[var(--text-primary)]">{title}</p>
        {description ? (
          <p className="mt-0.5 line-clamp-3 text-[13px] leading-relaxed text-[var(--text-muted)]">{description}</p>
        ) : null}

        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2.5 cursor-pointer rounded-lg border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.04] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/40 hover:bg-[var(--text-primary)]/[0.08] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
