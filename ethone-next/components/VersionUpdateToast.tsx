"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useVersionChecker } from "@/lib/hooks/useVersionChecker";
import { useI18n } from "@/lib/hooks/useI18n";
import { forceAppReload } from "@/lib/force-reload";
import { formatVersion } from "@/lib/version";
import EthoneGlyph from "@/components/icons/EthoneGlyph";

export default function VersionUpdateToast() {
  const i18n = useI18n();
  const { hasUpdate, newVersion, newData, dismiss } = useVersionChecker();
  const versionLabel = formatVersion(newVersion);

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 z-[var(--z-critical)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 select-none rounded-2xl border border-[var(--panel-border)] bg-[var(--background)]/95 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.7),0_0_24px_var(--glow-color)] backdrop-blur-2xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] shadow-[0_0_16px_var(--glow-color)]">
              <EthoneGlyph name="update" className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {i18n("updateAvailable", "Nouvelle mise à jour disponible")}
                </p>
                {versionLabel && (
                  <span className="rounded-md border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-primary)]">
                    {versionLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {i18n("updateDescription", "Une nouvelle version d'ETHONE OS est prête. Forcez la mise à jour pour utiliser les derniers changements.")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => forceAppReload(newVersion, newData)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/15 px-3.5 py-2 text-xs font-bold text-[var(--accent-primary)] shadow-md shadow-[var(--accent-primary)]/20 transition-all hover:bg-[var(--accent-primary)]/25 hover:shadow-lg active:scale-95"
              >
                <EthoneGlyph name="refresh" className="h-3.5 w-3.5" />
                {i18n("updateNow", "Mettre à jour")}
              </button>

              <button
                type="button"
                onClick={dismiss}
                aria-label={i18n("later", "Plus tard")}
                className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                <EthoneGlyph name="close" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
