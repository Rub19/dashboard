"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";

export type EmptyStateProps = {
  title?: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({ title, description, icon = "inbox", action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      {title && <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>}
      {description && <p className="max-w-sm text-xs text-[var(--text-muted)]">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
