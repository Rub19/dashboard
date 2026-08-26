"use client";

import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "online"
  | "offline"
  | "new"
  | "synced"
  | "connected"
  | "beta"
  | "pro"
  | "brain";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
  size?: "sm" | "md";
};

const VARIANTS: Record<BadgeVariant, string> = {
  default: "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)]",
  primary: "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  secondary: "border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]",
  info: "border-[var(--info)]/20 bg-[var(--info)]/10 text-[var(--info)]",
  success: "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]",
  warning: "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]",
  danger: "border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]",
  muted: "border-transparent bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]",
  online: "border-transparent bg-[var(--success)]/15 text-[var(--success)]",
  offline: "border-transparent bg-[var(--text-muted)]/10 text-[var(--text-muted)]",
  new: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]",
  synced: "border-[var(--info)]/25 bg-[var(--info)]/12 text-[var(--info)]",
  connected: "border-[var(--success)]/25 bg-[var(--success)]/12 text-[var(--success)]",
  beta: "border-[var(--warning)]/25 bg-[var(--warning)]/12 text-[var(--warning)]",
  pro: "border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]",
  brain: "border-[var(--info)]/25 bg-[var(--info)]/12 text-[var(--info)]",
};

const SIZES = {
  sm: "h-4 min-w-[1.25rem] px-1 text-[10px]",
  md: "h-5 px-2 text-[10px]",
};

export default function Badge({ children, variant = "default", dot, className, size = "md" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-lg border font-semibold transition-colors",
        SIZES[size],
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
