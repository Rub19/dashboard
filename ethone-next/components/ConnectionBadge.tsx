"use client";

import { cn } from "@/lib/utils";

const VARIANTS = {
  oauth: "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  api: "border-[var(--info)]/20 bg-[var(--info)]/10 text-[var(--info)]",
  api_key: "border-[var(--info)]/20 bg-[var(--info)]/10 text-[var(--info)]",
  webhook: "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]",
  local: "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]",
  feed: "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]",
  restricted: "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]",
  limited: "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]",
  connected: "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]",
  error: "border-[var(--danger)]/20 bg-[var(--danger)]/10 text-[var(--danger)]",
  unconfigured: "border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]",
  syncing: "border-[var(--info)]/20 bg-[var(--info)]/10 text-[var(--info)]",
  premium: "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
  beta: "border-[var(--warning)]/20 bg-[var(--warning)]/10 text-[var(--warning)]",
};

type ConnectionBadgeVariant = keyof typeof VARIANTS;

type ConnectionBadgeProps = {
  children: React.ReactNode;
  variant?: ConnectionBadgeVariant;
  dot?: boolean;
  className?: string;
};

export default function ConnectionBadge({ children, variant = "unconfigured", dot, className }: ConnectionBadgeProps) {
  const styles = VARIANTS[variant] || VARIANTS.unconfigured;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition-colors",
        styles,
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
