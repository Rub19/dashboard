"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Sparkles,
  Zap,
  Layers,
  Music,
  Clock,
  CheckCircle2,
  HelpCircle,
  X,
  ShieldCheck,
} from "lucide-react";
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
        "relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/30 px-4 py-2.5 backdrop-blur-md transition-all select-none",
        className
      )}
    >
      {/* Left: Status & AI Model Info */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)] shadow-sm">
          <Brain className={cn("h-4 w-4", loading ? "animate-pulse" : "")} />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-surface)]",
              loading ? "bg-amber-400 animate-ping" : "bg-emerald-500"
            )}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {loading ? "Brain analyse..." : "Brain is ready"}
            </span>
            <span className="rounded-md border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/60 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-[var(--accent-primary)]">
              {model}
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1.5">
            <span>Provider : {provider}</span>
            <span>•</span>
            <span className="text-emerald-400">Latence optimisée</span>
          </p>
        </div>
      </div>

      {/* Right: Live Context Badges & Explainability */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {context?.route && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)]/40 bg-[var(--surface-raised)]/40 px-2 py-0.8 text-[10px] font-medium text-[var(--text-secondary)]">
            <Layers className="h-3 w-3 text-[var(--accent-primary)]" />
            <span className="capitalize">{context.route.replace("/", "") || "Home"}</span>
          </span>
        )}

        {context?.focusActive && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.8 text-[10px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            <span>Focus actif</span>
          </span>
        )}

        {context?.nowPlaying?.title && (
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.8 text-[10px] font-medium text-emerald-400 truncate max-w-[130px]">
            <Music className="h-3 w-3 shrink-0" />
            <span className="truncate">{context.nowPlaying.title}</span>
          </span>
        )}

        {/* Explainability Trigger Button */}
        <button
          type="button"
          onClick={() => setShowExplanation(true)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/50 px-2 py-0.8 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-all"
          title="Pourquoi Brain a utilisé ce contexte ?"
        >
          <HelpCircle className="h-3 w-3 text-[var(--accent-primary)]" />
          <span className="hidden sm:inline">Transparence</span>
        </button>
      </div>

      {/* Explainability Modal */}
      <AnimatePresence>
        {showExplanation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-overlay)] backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-[var(--panel-border)] bg-[var(--bg-surface)] p-6 shadow-2xl space-y-4"
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
