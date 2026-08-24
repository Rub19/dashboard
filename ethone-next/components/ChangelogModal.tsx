"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import ChangelogList from "@/components/ChangelogList";
import type { ChangelogEntry } from "@/data/changelog";

type ChangelogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entries: ChangelogEntry[];
  versionLabel: string;
};

export default function ChangelogModal({
  isOpen,
  onClose,
  entries,
  versionLabel,
}: ChangelogModalProps) {
  const i18n = useI18n();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-black/60 p-4 pb-10 pt-20 backdrop-blur-sm md:p-6 md:pb-14 md:pt-24"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={
              reduce
                ? { duration: 0.15 }
                : { type: "spring", duration: 0.55, bounce: 0.12 }
            }
            onClick={(e) => e.stopPropagation()}
            className="relative flex w-full max-w-2xl sm:max-w-3xl max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[#0C0C0E]/95 shadow-2xl shadow-black/80 backdrop-blur-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-modal-title"
          >
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/10 blur-3xl"
              aria-hidden="true"
            />

            {/* Fixed header */}
            <div className="relative z-10 flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)] shadow-[0_0_14px_rgba(139,92,246,0.18)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3
                    id="changelog-modal-title"
                    className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]"
                  >
                    <span>{i18n("changelogTitle") || "Journal des modifications"}</span>
                    <span className="rounded-lg border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--accent)]">
                      {versionLabel}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {i18n("changelogDescription") || "Historique des mises à jour"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                aria-label={i18n("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="relative z-10 min-h-0 flex-1 overflow-y-auto os-scroll p-6">
              <ChangelogList entries={entries} compact />
            </div>

            {/* Fixed footer */}
            <div className="relative z-10 shrink-0 border-t border-white/[0.06] px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[var(--accent-primary)] py-2.5 text-xs font-bold text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-primary)]/20 transition-all hover:opacity-90 hover:shadow-[var(--accent-primary)]/30 active:scale-[0.98]"
              >
                {i18n("gotIt") || "Compris !"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
