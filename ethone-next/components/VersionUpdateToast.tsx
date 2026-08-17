"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, ArrowUpCircle } from "lucide-react";
import { useVersionChecker } from "@/lib/hooks/useVersionChecker";
import { useI18n } from "@/lib/hooks/useI18n";
import { forceAppReload } from "@/lib/force-reload";
import { formatVersion } from "@/lib/version";

export default function VersionUpdateToast() {
  const i18n = useI18n();
  const { hasUpdate, newVersion, dismiss } = useVersionChecker();
  const versionLabel = formatVersion(newVersion);

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.96 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-6 left-1/2 z-[9999] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 select-none rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-4 shadow-[0_12px_48px_rgba(0,0,0,0.7),0_0_24px_rgba(16,185,129,0.12)] backdrop-blur-2xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
              <ArrowUpCircle className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">
                  {i18n("updateAvailable", "Nouvelle mise à jour disponible")}
                </p>
                {versionLabel && (
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                    {versionLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                {i18n("updateDescription", "Une nouvelle version d'ETHONE OS est prête. Forcez la mise à jour pour utiliser les derniers changements.")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => forceAppReload(newVersion)}
                className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-lg active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {i18n("updateNow", "Mettre à jour")}
              </button>

              <button
                type="button"
                onClick={dismiss}
                aria-label={i18n("later", "Plus tard")}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
