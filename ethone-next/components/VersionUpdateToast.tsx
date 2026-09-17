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

  // Positioned to match this app's one established toast convention
  // (bottom-right on desktop, bottom-center on mobile — see
  // context/ToastContext.tsx's Toaster) instead of a bespoke bottom-center
  // banner, and sized close to RichToast's own footprint (max-w-[23rem],
  // p-3.5) so it reads as part of the same system rather than a one-off.
  return (
    <>
      <AnimatePresence>
        {hasUpdate && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[var(--z-critical)] mx-auto max-w-[23rem] select-none sm:inset-x-auto sm:left-auto sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:mx-0 md:bottom-[calc(4.5rem+3rem+env(safe-area-inset-bottom))]"
            role="status"
            aria-live="polite"
          >
            <div className="v8-panel relative overflow-hidden p-3.5 shadow-2xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-[var(--accent-primary)]/50 before:to-transparent">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--inset-radius)] border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                  <ArrowUpCircle className="h-4.5 w-4.5" />
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-xs font-semibold text-[var(--text-primary)]">
                      {i18n("updateAvailable", "Nouvelle mise à jour disponible")}
                    </h4>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      aria-label={i18n("later", "Plus tard")}
                      title={i18n("later", "Plus tard")}
                      className="shrink-0 rounded p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/6 hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {i18n("updateDescription", "Une nouvelle version d'ETHONE OS est prête.")}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    {versionLabel ? (
                      <button
                        type="button"
                        onClick={handleOpenChangelog}
                        title="Voir le journal des modifications"
                        className="flex items-center gap-1 rounded-md border border-[var(--panel-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent-primary)] cursor-pointer"
                      >
                        <span>{versionLabel}</span>
                        <Sparkles className="h-2.5 w-2.5" />
                      </button>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={isUpdating}
                      className="flex shrink-0 items-center gap-1.5 rounded-[var(--inset-radius)] bg-[var(--accent-primary)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent-contrast)] transition-[filter] hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={cn("h-3 w-3", isUpdating && "animate-spin")} />
                      <span>{isUpdating ? "Mise à jour..." : i18n("update", "Mettre à jour")}</span>
                    </button>
                  </div>
                </div>
              </div>
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
