"use client";

import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const STATE_PRESETS = {
  empty: { icon: "inbox", eyebrow: "Espace disponible", title: "Rien ici pour le moment", description: "Commencez par l'action principale pour alimenter cet espace." },
  "no-results": { icon: "search-x", eyebrow: "Recherche terminée", title: "Aucun résultat", description: "Modifiez les termes ou effacez les filtres pour élargir la recherche." },
  loading: { icon: "loader-circle", eyebrow: "Chargement", title: "Préparation de votre espace", description: "ETHONE récupère uniquement les données nécessaires." },
  error: { icon: "triangle-alert", eyebrow: "Un problème est survenu", title: "Impossible d'afficher ce contenu", description: "Vos données restent intactes. Réessayez ou revenez à l'espace précédent." },
  offline: { icon: "wifi-off", eyebrow: "Mode hors ligne", title: "Connexion indisponible", description: "Les changements sont conservés en attente et seront synchronisés au retour du réseau." },
  denied: { icon: "shield-x", eyebrow: "Accès protégé", title: "Accès non autorisé", description: "Ce contenu nécessite une permission ou un autre compte." },
  expired: { icon: "key-round", eyebrow: "Session expirée", title: "Reconnectez-vous pour continuer", description: "La session a été fermée afin de protéger vos données." },
  integration: { icon: "unplug", eyebrow: "Intégration", title: "Service non configuré", description: "Connectez un service pour activer ses données et ses actions." },
  "coming-soon": { icon: "construction", eyebrow: "Bientôt disponible", title: "Cette surface est en préparation", description: "La fonctionnalité reste désactivée proprement pendant sa reconstruction." },
  syncing: { icon: "refresh-cw", eyebrow: "Synchronisation", title: "Enregistrement en cours", description: "Vous pouvez continuer à travailler pendant la synchronisation avec Supabase." },
} as const;

export type EmptyStateKind = keyof typeof STATE_PRESETS;

type EmptyStateProps = {
  kind?: EmptyStateKind;
  icon?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
  inline?: boolean;
  busy?: boolean;
  role?: "status" | "alert";
  className?: string;
};

export default function EmptyState({
  kind = "empty",
  icon,
  eyebrow,
  title,
  description,
  actions,
  compact = false,
  inline = false,
  busy = false,
  role,
  className = "",
}: EmptyStateProps) {
  const preset = STATE_PRESETS[kind] || STATE_PRESETS.empty;
  const resolvedIcon = icon || preset.icon;
  const resolvedEyebrow = eyebrow ?? preset.eyebrow;
  const resolvedTitle = title || preset.title;
  const resolvedDescription = description || preset.description;
  const isUrgent = ["error", "denied", "expired"].includes(kind);
  const isBusy = busy || ["loading", "syncing"].includes(kind);
  const resolvedRole = role || (isUrgent ? "alert" : "status");

  return (
    <section
      role={resolvedRole}
      aria-live={isUrgent ? "assertive" : "polite"}
      aria-busy={isBusy ? "true" : undefined}
      aria-label={resolvedTitle}
      data-state-kind={kind}
      className={`v8-empty-state flex flex-col items-center justify-center text-center ${compact ? "v8-empty-state--compact gap-2 p-4" : "gap-4 p-6"} ${inline ? "v8-empty-state--inline" : ""} ${className}`}
    >
      <div className="v8-empty-state__visual relative" aria-hidden="true">
        <span className="v8-empty-state__frame v8-empty-state__frame--back absolute inset-0 rounded-[var(--panel-radius)] bg-[var(--panel-bg)] opacity-60" />
        <span className="v8-empty-state__frame v8-empty-state__frame--front relative z-10 flex items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-sm backdrop-blur-[var(--panel-blur)]">
          <Icon name={resolvedIcon} className={cn("v8-empty-state__glyph h-8 w-8 text-[var(--accent-primary)]", isBusy && "animate-spin")} />
        </span>
      </div>
      <div className="v8-empty-state__copy max-w-md space-y-1">
        {resolvedEyebrow && !compact && (
          <span className="v8-empty-state__eyebrow text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {resolvedEyebrow}
          </span>
        )}
        <h2 className={`font-semibold text-[var(--text-primary)] ${compact ? "text-sm" : "text-lg"}`}>{resolvedTitle}</h2>
        <p className={`text-[var(--text-muted)] ${compact ? "text-xs" : "text-sm"}`}>{resolvedDescription}</p>
      </div>
      {actions && <div className="v8-empty-state__actions flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </section>
  );
}
