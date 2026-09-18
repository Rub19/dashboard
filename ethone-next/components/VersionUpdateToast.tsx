"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpCircle, RefreshCw, X, Sparkles } from "lucide-react";
import { useVersionChecker } from "@/lib/hooks/useVersionChecker";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { forceAppReload } from "@/lib/force-reload";
import { formatVersion } from "@/lib/version";
import { hapticSuccessPattern, hapticLightImpact } from "@/lib/haptics";
import type { ChangelogEntry } from "@/data/changelog";
import { cn } from "@/lib/utils";

// This component is mounted unconditionally on every page (app/layout.tsx),
// including pre-auth ones like /login — but the changelog itself (data/changelog.ts,
// the full ETHONE version history, ~1.5MB) and the modal that displays it are
// only ever needed on the rare click on "Voir le journal des modifications".
// Both were static imports here, so every page paid that cost just for this
// toast to exist, whether or not an update was even available. Loaded lazily
// instead, on demand.
const ChangelogModal = dynamic(() => import("@/components/ChangelogModal"));

export default function VersionUpdateToast() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { hasUpdate, newVersion, newData, dismiss } = useVersionChecker();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  const versionLabel = formatVersion(newVersion);

  function handleUpdate() {
    hapticSuccessPattern();
    setIsUpdating(true);
    setTimeout(() => {
      forceAppReload(newVersion, newData);
    }, 250);
  }

  function handleDismiss() {
    hapticLightImpact();
    dismiss();
  }

  async function handleOpenChangelog() {
    hapticLightImpact();
    const { CHANGELOG, CHANGELOG_BY_LANG } = await import("@/data/changelog");
    setChangelog(CHANGELOG_BY_LANG[settings.language] || CHANGELOG);
    setShowChangelog(true);
  }

  // Moved off the bottom-right corner and condensed to one row (2026-09-19):
  // the old bottom-right card collided with the Dock toggle and the status
  // bar on desktop, and with the sign-in card's "OU CONTINUER AVEC" row on
  // /login. A full-height card anchored top-right also clipped the /login
  // title (that card's heading starts ~136px down on a 768px-tall viewport).
  // A single slim row fits the gap below the top bar on every page instead
  // of needing one.
  return (
    <>
      <AnimatePresence>
        {hasUpdate && (
          <motion.aside
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[var(--z-critical)] mx-auto w-fit max-w-[calc(100vw-2rem)] select-none sm:inset-x-auto sm:left-auto sm:right-6 sm:mx-0"
            role="status"
            aria-live="polite"
          >
            <div className="v8-panel relative flex items-center gap-2.5 overflow-hidden py-2 pl-2.5 pr-2 shadow-2xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--accent-primary)]/50 before:to-transparent">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                <ArrowUpCircle className="h-3.5 w-3.5" />
              </div>

              <button
                type="button"
                onClick={handleOpenChangelog}
                title="Voir le journal des modifications"
                className="min-w-0 cursor-pointer text-left"
              >
                <span className="block truncate text-[11px] font-semibold leading-tight text-[var(--text-primary)]">
                  {i18n("updateAvailable", "Mise à jour disponible")}
                </span>
                {versionLabel ? (
                  <span className="flex items-center gap-1 text-[10px] leading-tight text-[var(--text-muted)]">
                    {versionLabel}
                    <Sparkles className="h-2.5 w-2.5" />
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                onClick={handleUpdate}
                disabled={isUpdating}
                className="ml-1 flex shrink-0 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={cn("h-3 w-3", isUpdating && "animate-spin")} />
                <span className="hidden sm:inline">{isUpdating ? "Mise à jour..." : i18n("update", "Mettre à jour")}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                aria-label={i18n("later", "Plus tard")}
                title={i18n("later", "Plus tard")}
                className="shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/6 hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <ChangelogModal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        entries={changelog}
        versionLabel={versionLabel || "v1.10.38"}
      />
    </>
  );
}
