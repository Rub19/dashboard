"use client";

import { useState } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { ActionExecution } from "@/lib/hooks/useBrain";

interface BrainActionCardProps {
  action: ActionExecution;
  onOpenNote?: (id?: string) => void;
  onOpenTask?: (id?: string) => void;
}

export default function BrainActionCard({
  action,
  onOpenNote,
  onOpenTask,
}: BrainActionCardProps) {
  const [saved, setSaved] = useState(false);

  return (
    <div className="my-2.5 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/70 p-3.5 shadow-md backdrop-blur-md">
      {/* Execution Timeline Header */}
      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-lg text-xs",
              action.step === "done"
                ? "bg-[var(--success)]/20 text-[var(--success)]"
                : action.step === "error"
                ? "bg-[var(--danger)]/20 text-[var(--danger)]"
                : "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] animate-pulse"
            )}
          >
            <Icon
              name={
                action.step === "done"
                  ? "check"
                  : action.step === "error"
                  ? "x"
                  : "arrows-clockwise"
              }
              className={cn("h-3.5 w-3.5", action.step === "analyzing" && "animate-spin")}
            />
          </span>
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {action.title}
          </span>
        </div>

        {/* 3-step pills */}
        <div className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              action.step === "analyzing"
                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                : "text-[var(--text-muted)]"
            )}
          >
            1. Analyse
          </span>
          <span>→</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              action.step === "executing"
                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                : "text-[var(--text-muted)]"
            )}
          >
            2. Action
          </span>
          <span>→</span>
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              action.step === "done"
                ? "bg-[var(--success)]/20 text-[var(--success)]"
                : "text-[var(--text-muted)]"
            )}
          >
            3. Terminé
          </span>
        </div>
      </div>

      {/* Action Content Preview */}
      {action.detail && (
        <p className="text-xs text-[var(--text-muted)] mb-3">
          {action.detail}
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {action.type === "note" && (
          <>
            <button
              type="button"
              onClick={() => onOpenNote?.()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:scale-105 transition-all active:scale-95 shadow-sm"
            >
              <Icon name="arrow-square-out" className="h-3.5 w-3.5" />
              Ouvrir dans Notes
            </button>
            <button
              type="button"
              onClick={() => setSaved(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50 transition-all"
            >
              <Icon name={saved ? "check" : "floppy-disk"} className="h-3.5 w-3.5 text-[var(--success)]" />
              {saved ? "Synchronisé Supabase" : "Enregistrer"}
            </button>
          </>
        )}

        {action.type === "task" && (
          <button
            type="button"
            onClick={() => onOpenTask?.()}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:scale-105 transition-all active:scale-95 shadow-sm"
          >
            <Icon name="check-circle" className="h-3.5 w-3.5" />
            Voir dans Tâches
          </button>
        )}
      </div>
    </div>
  );
}
