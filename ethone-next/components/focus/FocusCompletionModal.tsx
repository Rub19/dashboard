"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface FocusCompletionModalProps {
  isOpen: boolean;
  duration: number;
  goal?: string;
  completedPomodoros: number;
  totalFocusSeconds: number;
  onStartAnother: () => void;
  onDismiss: () => void;
  onReview: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export default function FocusCompletionModal({
  isOpen,
  duration,
  goal,
  completedPomodoros,
  totalFocusSeconds,
  onStartAnother,
  onDismiss,
  onReview,
}: FocusCompletionModalProps) {
  useEffect(() => {
    if (isOpen) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5, x: 0.5 },
        colors: ["#7c3aed", "#a855f7", "#06b6d4", "#10b981"],
        startVelocity: 30,
        gravity: 0.8,
        scalar: 0.9,
      });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--z-modal,800)] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="w-full max-w-sm rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-2xl backdrop-blur-xl"
          >
            {/* Icon */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] mb-4">
                <Icon name="check-circle" className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                🎯 Session terminée !
              </h2>
              {goal && (
                <p className="mt-1 text-sm text-[var(--text-muted)] italic">
                  &ldquo;{goal}&rdquo;
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="flex flex-col items-center rounded-xl bg-[var(--surface-raised)]/60 p-3">
                <span className="text-lg font-bold text-[var(--accent-primary)]">
                  {formatDuration(duration)}
                </span>
                <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">Durée</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-[var(--surface-raised)]/60 p-3">
                <span className="text-lg font-bold text-[var(--accent-primary)]">
                  {completedPomodoros}
                </span>
                <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">Cycles</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-[var(--surface-raised)]/60 p-3">
                <span className="text-lg font-bold text-[var(--accent-primary)]">
                  {formatDuration(totalFocusSeconds)}
                </span>
                <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">Total Focus</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onStartAnother}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Icon name="play" className="h-4 w-4" />
                Démarrer une autre session
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onReview}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-all hover:text-[var(--text-primary)]"
                >
                  <Icon name="bar-chart-2" className="h-3.5 w-3.5" />
                  Statistiques
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition-all hover:text-[var(--text-primary)]"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
