"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpCircle, RefreshCw, X, Sparkles, ChevronRight } from "@/components/icons/ph";
import LightBorder from "@/components/ui/LightBorder";
import { SPRING_PANEL } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
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
  const pathname = usePathname();
  const { settings } = useSettings();
  const { hasUpdate, newVersion, newData, dismiss } = useVersionChecker();
  const [isUpdating, setIsUpdating] = useState(false);
  const { reduced } = useMotionPref();
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
  // Page vitrine publique : pas de bandeau d'application par-dessus.
  if (pathname === "/bot" || pathname?.startsWith("/bot/") || pathname === "/leaderboard" || pathname === "/leaderboard/") return null;

  return (
    <>
      <AnimatePresence>
        {hasUpdate && (
          <motion.aside
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -28, scale: 0.92, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.96, filter: "blur(6px)", transition: { duration: 0.18 } }}
            transition={SPRING_PANEL}
            className="fixed inset-x-3 top-[calc(4.5rem+env(safe-area-inset-top))] z-[var(--z-critical)] mx-auto w-auto max-w-[36rem] select-none sm:inset-x-auto sm:left-auto sm:right-6 sm:mx-0 sm:w-[36rem] sm:max-w-[calc(100vw-3rem)]"
            role="status"
            aria-live="polite"
          >
            <LightBorder radius="1.1rem" speed={5} className="shadow-[0_24px_60px_-24px_rgb(0_0_0/0.65)]" innerClassName="backdrop-blur-2xl">
              <div className="flex items-center gap-3.5 p-3">
                {/* Glyph: arrow rising through a turning ring */}
                <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[0.85rem] border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                  <motion.span
                    aria-hidden
                    className="absolute inset-1.5 rounded-full border border-dashed border-[var(--accent-primary)]/40"
                    animate={reduced ? undefined : { rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.span
                    animate={reduced || isUpdating ? undefined : { y: [1.5, -1.5, 1.5] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowUpCircle className="h-6 w-6" />
                  </motion.span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenChangelog}
                  className="group min-w-0 flex-1 cursor-pointer text-left"
                >
                  <span className="block truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-[var(--text-primary)]">
                    {isUpdating ? i18n("updating", "Mise à jour...") : i18n("updateAvailable", "Mise à jour disponible")}
                  </span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    {versionLabel && (
                      <span className="rounded-md border border-[var(--accent-primary)]/25 bg-[var(--accent-primary)]/10 px-1.5 py-px font-mono text-[11px] font-semibold text-[var(--accent-primary)]">
                        {versionLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 truncate transition-colors group-hover:text-[var(--text-primary)]">
                      <Sparkles className="h-3.5 w-3.5" />
                      {i18n("changelog", "Notes de version")}
                      <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isUpdating}
                  aria-label={i18n("update", "Mettre à jour")}
                  className="btn-sheen relative flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-3.5 text-sm font-semibold text-[var(--accent-contrast)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-95 disabled:cursor-default sm:px-4"
                >
                  <RefreshCw className={cn("h-4 w-4", isUpdating && "animate-spin")} />
                  <span className="hidden sm:inline">{i18n("update", "Mettre à jour")}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismiss}
                  disabled={isUpdating}
                  aria-label={i18n("later", "Plus tard")}
                  title={i18n("later", "Plus tard")}
                  className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Reload progress */}
              <AnimatePresence>
                {isUpdating && (
                  <motion.div
                    className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[var(--accent-primary)]"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </LightBorder>
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
