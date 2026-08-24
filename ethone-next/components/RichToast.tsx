"use client";

import { motion } from "framer-motion";

export type RichToastVariant = "success" | "error" | "info" | "warning" | "neutral";

type RichToastProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: RichToastVariant;
  className?: string;
};

const variantIcon: Record<RichToastVariant, string> = {
  success: "text-[var(--accent-primary)]",
  error: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
  neutral: "text-[var(--text-primary)]",
};

const variantTitle: Record<RichToastVariant, string> = {
  success: "text-[var(--accent-primary)]",
  error: "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  info: "text-[var(--info)]",
  neutral: "text-[var(--text-primary)]",
};

const variantDot: Record<RichToastVariant, string> = {
  success: "bg-[var(--accent-primary)]",
  error: "bg-[var(--danger)]",
  warning: "bg-[var(--warning)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--text-muted)]",
};

export default function RichToast({
  icon,
  title,
  description,
  variant = "neutral",
  className,
}: RichToastProps) {
  return (
    <div className={`flex w-full items-start gap-3 ${className || ""}`}>
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
      </div>
    </div>
  );
}
