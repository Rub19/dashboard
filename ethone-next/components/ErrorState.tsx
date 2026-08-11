"use client";

import EmptyState from "./EmptyState";

export default function ErrorState({
  title = "Un problème est survenu",
  reason = "ETHONE n'a pas pu charger ce contenu.",
  actionText = "",
  onAction,
  className = "",
}: {
  title?: string;
  reason?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}) {
  const actions =
    actionText && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="v8-button v8-button--secondary inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
      >
        {actionText}
      </button>
    ) : null;

  return (
    <EmptyState
      kind="error"
      title={title}
      description={reason}
      actions={actions}
      role="alert"
      className={className}
    />
  );
}
