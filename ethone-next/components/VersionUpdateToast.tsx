"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, RefreshCw, X } from "lucide-react";
import { useVersionChecker } from "@/lib/hooks/useVersionChecker";

const VERSION_STORAGE_KEY = "ethone:version";

function formatVersion(version: string | null) {
  if (!version) return "";
  if (version.length >= 12 && /^[a-f0-9]+$/i.test(version)) {
    return `v${version.slice(0, 7)}`;
  }
  return `v${version}`;
}

async function applyUpdate(newVersion: string | null) {
  try {
    if (newVersion) {
      try {
        localStorage.setItem(VERSION_STORAGE_KEY, newVersion);
      } catch {
        // ignore storage errors
      }
    }

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.error("[VersionUpdateToast] failed to clear caches", e);
  } finally {
    window.location.reload();
  }
}

export default function VersionUpdateToast() {
  const { hasUpdate, newVersion, dismiss } = useVersionChecker();
  const versionLabel = formatVersion(newVersion);

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-6 right-6 z-[9999] flex w-full max-w-md select-none items-center gap-3.5 rounded-2xl border border-emerald-500/30 bg-zinc-950/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.1)] backdrop-blur-2xl"
          role="status"
          aria-live="polite"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
            <Sparkles className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-white">Nouvelle mise à jour disponible</p>
              {versionLabel && (
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                  {versionLabel}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Une nouvelle version d&apos;ETHONE OS est prête. Rechargez pour appliquer les changements.
            </p>
          </div>

          <button
            type="button"
            onClick={() => applyUpdate(newVersion)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-md transition-all hover:bg-emerald-400 active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Mettre à jour
          </button>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Plus tard"
            className="shrink-0 rounded-lg p-1 text-zinc-400 transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
