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
        "flex w-full flex-col items-center justify-center gap-3 rounded-[var(--panel-radius)] border border-dashed border-[var(--panel-border)] bg-[var(--panel-bg)]/60 px-6 py-10 text-center",
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] ring-1 ring-inset ring-[var(--accent-primary)]/15">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <div className="max-w-sm space-y-1">
        {title && <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>}
        {description && <p className="text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
