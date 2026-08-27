"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/lib/icons";
import { useFocus } from "@/components/FocusProvider";
import { useBrainActivityStore } from "@/lib/stores/brain-activity";
import { useActivityJournal } from "@/lib/hooks/useActivityJournal";
import { cn } from "@/lib/utils";

export default function HeaderContextPill() {
  const router = useRouter();
  const focus = useFocus();
  const isThinking = useBrainActivityStore((s) => s.isThinking);
  const { syncing, pendingCount, sync } = useActivityJournal();

  const isFocusActive = focus.state.phase !== "idle";

  if (isFocusActive) {
    const isBreak = focus.state.phase === "shortBreak" || focus.state.phase === "longBreak";
    return (
      <button
        type="button"
        onClick={() => router.push("/focus")}
        className={cn(
          "hidden sm:inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer",
          isBreak
            ? "border-[var(--info)]/30 bg-[var(--info)]/10 text-[var(--info)]"
            : "border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
        )}
        title="Ouvrir Focus OS"
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            focus.state.paused
              ? "bg-amber-400"
              : isBreak
              ? "bg-[var(--info)] animate-pulse"
              : "bg-[var(--accent-primary)] animate-pulse"
          )}
        />
        <Icon name={isBreak ? "coffee" : "timer"} className="h-3.5 w-3.5" />
        <span className="font-mono tabular-nums">
          {focus.state.format(focus.state.remaining)}
        </span>
      </button>
    );
  }

  if (isThinking) {
    return (
      <button
        type="button"
        onClick={() => router.push("/brain")}
        className="hidden sm:inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-primary)] shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer animate-pulse"
        title="Ouvrir Brain Assistant"
      >
        <Icon name="brain" className="h-3.5 w-3.5" />
        <span>Brain · Analyse...</span>
      </button>
    );
  }

  if (syncing || pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => sync()}
        className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        title="Synchronisation Supabase"
      >
        <Icon
          name="arrows-clockwise"
          className={cn("h-3 w-3 text-[var(--info)]", syncing && "animate-spin")}
        />
        <span>{syncing ? "Synchro..." : `${pendingCount} en attente`}</span>
      </button>
    );
  }

  return null;
}
