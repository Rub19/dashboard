"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Layers,
  Music,
  Clock,
  HelpCircle,
  X,
  ShieldCheck,
} from "@/components/icons/ph";
import type { BrainContext } from "@/lib/brain-context";
import { getBrainContextExplanation } from "@/lib/brain-context";
import { cn } from "@/lib/utils";

interface BrainStatusBarProps {
  model?: string;
  provider?: string;
  loading?: boolean;
  context?: BrainContext;
  className?: string;
}

export const BrainStatusBar = memo(function BrainStatusBar({
  model = "Auto (Smart Router)",
  provider = "Cloudflare & OpenRouter",
  loading = false,
  context,
  className = "",
}: BrainStatusBarProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const explanations = getBrainContextExplanation(context);

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center justify-between gap-2 px-1 py-1 select-none",
        className
      )}
    >
      {/* Gauche : l'en-tête de la page affiche déjà le nom, le modèle et l'état de Brain ;
          cette ligne ne garde que ce qui est propre à la conversation : le contexte utilisé. */}
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              loading ? "animate-pulse bg-[var(--warning)]" : "bg-[var(--success)]"
            )}
          />
          {loading ? "Brain analyse…" : "Contexte"}
        </span>

        {context?.route && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
            <Layers className="h-3 w-3 text-[var(--accent-primary)]" />
            <span className="capitalize">{context.route.replace("/", "") || "Home"}</span>
          </span>
        )}

        {context?.focusActive && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--warning)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--warning)]">
            <Clock className="h-3 w-3" />
            <span>Focus actif</span>
          </span>
        )}

        {context?.nowPlaying?.title && (
          <span className="inline-flex max-w-[160px] shrink-0 items-center gap-1 truncate rounded-full bg-[var(--success)]/12 px-2 py-0.5 text-[10px] font-medium text-[var(--success)]">
            <Music className="h-3 w-3 shrink-0" />
            <span className="truncate">{context.nowPlaying.title}</span>
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowExplanation(true)}
        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] cursor-pointer"
        title="Pourquoi Brain a utilisé ce contexte ?"
      >
        <HelpCircle className="h-3 w-3 text-[var(--accent-primary)]" />
        <span className="hidden sm:inline">Pourquoi ce contexte ?</span>
      </button>

      {/* Explainability Modal */}
      <AnimatePresence>
        {showExplanation && (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--panel-border)]/60 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[var(--accent-primary)]" />
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Explicabilité & Signaux Contextuels
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExplanation(false)}
                  className="p-1 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[var(--text-muted)] leading-relaxed">
                  Brain ajuste automatiquement ses réponses et priorités en fonction de vos signaux actifs dans ETHONE :
                </p>
                <div className="space-y-1.5 pt-1">
                  {explanations.map((exp, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-xl bg-[var(--surface-raised)]/60 p-2.5 text-[11px] text-[var(--text-primary)]"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                      <span>{exp}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowExplanation(false)}
                  className="rounded-xl bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] shadow-sm hover:opacity-90 transition-all"
                >
                  Compris
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});
