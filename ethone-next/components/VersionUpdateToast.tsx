"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpCircle, RefreshCw, X, Sparkles, ExternalLink } from "lucide-react";
import { useVersionChecker } from "@/lib/hooks/useVersionChecker";
import { useI18n } from "@/lib/hooks/useI18n";
import { useSettings } from "@/components/SettingsProvider";
import { forceAppReload } from "@/lib/force-reload";
import { formatVersion } from "@/lib/version";
import { hapticSuccessPattern, hapticLightImpact } from "@/lib/haptics";
import ChangelogModal from "@/components/ChangelogModal";
import { CHANGELOG, CHANGELOG_BY_LANG, type ChangelogEntry } from "@/data/changelog";
import { cn } from "@/lib/utils";

export default function VersionUpdateToast() {
  const i18n = useI18n();
  const { settings } = useSettings();
  const { hasUpdate, newVersion, newData, dismiss } = useVersionChecker();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const versionLabel = formatVersion(newVersion);

  const changelog = useMemo<ChangelogEntry[]>(() => {
    return CHANGELOG_BY_LANG[settings.language] || CHANGELOG;
  }, [settings.language]);

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

  function handleOpenChangelog() {
    hapticLightImpact();
    setShowChangelog(true);
  }

  return (
    <>
      <AnimatePresence>
        {hasUpdate && (
          <motion.aside
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-critical)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 select-none"
            role="status"
            aria-live="polite"
          >
            <div className="relative overflow-hidden rounded-3xl border border-[var(--accent-primary)]/35 bg-[#0a0b0e] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(20,241,149,0.15)] backdrop-blur-3xl">
              {/* Ambient Top Glow Line */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[var(--accent-primary)]/80 to-transparent" />

              <div className="flex items-center gap-3.5 sm:gap-4">
                {/* Left Icon Badge with Pulse Aura */}
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-[0_0_20px_var(--glow-color)]">
                  <ArrowUpCircle className="h-5 w-5 animate-pulse" />
                  <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-primary)] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--accent-primary)]" />
                  </span>
                </div>

                {/* Text Description & Version Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                      {i18n("updateAvailable", "Nouvelle mise à jour disponible")}
                    </h4>
                    {versionLabel && (
                      <button
                        type="button"
                        onClick={handleOpenChangelog}
                        title="Voir le journal des modifications"
                        className="flex items-center gap-1 rounded-md border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--accent-primary)] transition-all hover:bg-[var(--accent-primary)]/25 hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                      >
                        <span>{versionLabel}</span>
                        <Sparkles className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-snug mt-0.5">
                    {i18n(
                      "updateDescription",
                      "Une nouvelle version d'ETHONE OS est prête. Mettez à jour pour appliquer les derniers changements."
                    )}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isUpdating}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-bold text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-primary)]/25 transition-all hover:opacity-95 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn("h-3.5 w-3.5", isUpdating && "animate-spin")}
                    />
                    <span>{isUpdating ? "Mise à jour..." : i18n("updateNow", "Mettre à jour")}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label={i18n("later", "Plus tard")}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-transparent text-[var(--text-muted)] hover:border-[var(--panel-border)] hover:bg-[var(--surface-raised)] hover:text-white transition-all active:scale-95 cursor-pointer"
                    title={i18n("later", "Plus tard")}
                  >
                    <X className="h-4 w-4" />
                  </button>
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
