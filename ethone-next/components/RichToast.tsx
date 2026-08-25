"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export type RichToastVariant = "success" | "error" | "info" | "warning" | "neutral";

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
};

const variantIcon: Record<RichToastVariant, string> = {
  success: "text-[var(--success)] border-[var(--success)]/30 bg-[var(--success)]/10",
  error: "text-[var(--danger)] border-[var(--danger)]/30 bg-[var(--danger)]/10",
  warning: "text-[var(--warning)] border-[var(--warning)]/30 bg-[var(--warning)]/10",
  info: "text-[var(--info)] border-[var(--info)]/30 bg-[var(--info)]/10",
  neutral: "text-[var(--text-primary)] border-[var(--border-subtle)] bg-[var(--surface)]",
};

const variantTitle: Record<RichToastVariant, string> = {
  success: "text-[var(--success)]",
  error: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
  neutral: "text-[var(--text-primary)]",
};

const variantDot: Record<RichToastVariant, string> = {
  success: "bg-[var(--success)] shadow-[0_0_6px_var(--success)]",
  error: "bg-[var(--danger)] shadow-[0_0_6px_var(--danger)]",
  warning: "bg-[var(--warning)] shadow-[0_0_6px_var(--warning)]",
  info: "bg-[var(--info)] shadow-[0_0_6px_var(--info)]",
  neutral: "bg-[var(--text-muted)]",
};

const variantProgress: Record<RichToastVariant, string> = {
  success: "bg-[var(--success)]",
  error: "bg-[var(--danger)]",
  warning: "bg-[var(--warning)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--accent-primary)]",
};

export default function RichToast({
  icon,
  title,
  description,
  variant = "neutral",
  action,
  duration,
  className,
}: RichToastProps) {
  const [playState, setPlayState] = useState<"running" | "paused">("running");
  const showProgress = typeof duration === "number" && duration > 0 && duration !== Infinity;

  return (
    <div
      className={`flex w-full flex-col ${className || ""}`}
      onMouseEnter={() => setPlayState("paused")}
      onMouseLeave={() => setPlayState("running")}
    >
      <div className="flex w-full items-start gap-3">
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] ${variantIcon[variant]}`}
        >
          {icon}
        </motion.span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${variantDot[variant]}`} />
            <p className={`text-sm font-semibold leading-tight ${variantTitle[variant]}`}>{title}</p>
          </div>
          {description ? (
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
          ) : null}
          {action ? (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={action.onClick}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
              >
                {action.label}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {showProgress && (
        <div
          className={`toast-progress mt-3 h-0.5 w-full origin-left rounded-full ${variantProgress[variant] || "bg-[var(--accent-primary)]"}`}
          style={{
            animationDuration: `${duration}ms`,
            animationPlayState: playState,
          }}
        />
      )}
    </div>
  );
}
