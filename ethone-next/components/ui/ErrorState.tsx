"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/lib/icons";

export type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export default function ErrorState({
  title = "Une erreur est survenue",
  description = "Impossible de charger les données.",
  onRetry,
  retryLabel = "Réessayer",
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-6 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)]">
        <Icon name="triangle-alert" className="h-5 w-5" />
      </div>
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="max-w-sm text-xs text-[var(--text-muted)]">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-1.5 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/20"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
