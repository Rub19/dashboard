"use client";

import { useEffect, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, X, CheckCircle2, ShieldCheck } from "@/components/icons/ph";
import { getTrackerI18n, getPatchNotes } from "@/lib/i18n-tracker";
import { SPRING_PANEL } from "@/lib/ease";
import { cn } from "@/lib/utils";

interface TacticalPatchNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
}

export default function TacticalPatchNotesModal({
  isOpen,
  onClose,
  lang,
}: TacticalPatchNotesModalProps) {
  const reducedMotion = useReducedMotion();
  const tr = getTrackerI18n(lang);
  const patchNotes = getPatchNotes(lang);
  const isEn = (lang || "").toLowerCase().startsWith("en");
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.96, y: 12 }}
            transition={SPRING_PANEL}
            className="relative flex flex-col max-h-[85vh] w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.12] bg-[#10131B] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-10"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] p-4 sm:p-5 bg-gradient-to-r from-rose-950/40 via-[#131722] to-black/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-inner">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 id={titleId} className="font-mono text-base font-bold text-white truncate">
                      {tr.patchNotesTitle}
                    </h3>
                    <span className="rounded-full bg-rose-500/25 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300">
                      {tr.siteVersion}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-mono mt-0.5 truncate">
                    {tr.patchNotesDesc}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
                aria-label={tr.patchNotesClose}
                title={tr.patchNotesClose}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto os-scroll p-4 sm:p-6 space-y-6">
              {patchNotes.map((release, idx) => {
                const isLatest = idx === 0;
                return (
                  <div
                    key={release.version}
                    className={cn(
                      "rounded-xl border p-4 sm:p-5 transition-all space-y-3",
                      isLatest
                        ? "border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-transparent shadow-md"
                        : "border-white/[0.06] bg-black/30"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          {release.version}
                        </span>
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase",
                            isLatest
                              ? "bg-rose-500 text-white shadow-xs"
                              : "bg-white/[0.06] text-neutral-400 border border-white/10"
                          )}
                        >
                          {release.badge}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-neutral-400">
                        {release.date}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-rose-200">
                      {release.title}
                    </h4>

                    <ul className="space-y-2 text-xs text-neutral-300">
                      {release.items.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/[0.08] p-4 bg-black/40 text-xs">
              <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  {isEn
                    ? "Site version: v2.4.0 · Independent from ETHONE OS"
                    : "Version du site : v2.4.0 · Indépendante d'ETHONE OS"}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-white text-black font-semibold px-4 py-2 text-xs hover:bg-neutral-200 active:scale-95 transition-all cursor-pointer shadow-sm text-center"
              >
                {tr.patchNotesClose}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
