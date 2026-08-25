"use client";

import { Icon } from "@/lib/icons";
import { useI18n } from "@/lib/hooks/useI18n";
import { cn } from "@/lib/utils";

export type WidgetStateType = "loading" | "empty" | "disconnected" | "error" | "offline";

type WidgetStateProps = {
  state: WidgetStateType;
  title?: string;
  icon?: string;
  message?: string;
  compact?: boolean;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
};

export default function WidgetState({
  state,
  title,
  icon,
  message,
  compact,
  onAction,
  actionLabel,
  className,
}: WidgetStateProps) {
  const i18n = useI18n();

  const fallback = {
    loading: i18n("loading", "Chargement"),
    empty: i18n("empty", "Aucune donnée"),
    disconnected: i18n("disconnected", "Non connecté"),
    error: i18n("error", "Erreur"),
    offline: i18n("offline", "Hors ligne"),
  }[state];

  const defaultIcon: Record<WidgetStateType, string> = {
    loading: "spinner",
    empty: "inbox",
    disconnected: "plugs",
    error: "warning",
    offline: "wifi-slash",
  };

  const defaultAction = {
    loading: "",
    empty: i18n("create", "Créer"),
    disconnected: i18n("connect", "Connecter"),
    error: i18n("retry", "Réessayer"),
    offline: i18n("retry", "Réessayer"),
  }[state];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 text-center",
        compact && "p-3",
        className,
      )}
    >
      <Icon
        name={icon ?? defaultIcon[state]}
        pack="phosphor"
        className={cn(
          "h-8 w-8",
          state === "loading" && "animate-spin text-[var(--info)]",
          state === "empty" && "text-[var(--muted)]",
          state === "disconnected" && "text-[var(--warning)]",
          state === "error" && "text-red-400",
          state === "offline" && "text-[var(--text-muted)]",
        )}
      />
      {title && (
        <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      )}
      <p className={cn("text-xs text-[var(--text-muted)]", compact && "text-[10px]")}>
        {message ?? fallback}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-xl bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-medium text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20"
        >
          {actionLabel ?? defaultAction}
        </button>
      )}
    </div>
  );
}
