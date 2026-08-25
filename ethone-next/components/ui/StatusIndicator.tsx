"use client";

import { cn } from "@/lib/utils";

export type StatusIndicatorState = "idle" | "connected" | "success" | "warning" | "error" | "syncing";

type StatusIndicatorProps = {
  state: StatusIndicatorState;
  label?: string;
  pulse?: boolean;
  className?: string;
};

const STATE_STYLES: Record<StatusIndicatorState, string> = {
  idle: "bg-[var(--text-primary)]/[0.15]",
  connected: "bg-[var(--success)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  error: "bg-[var(--danger)]",
  syncing: "bg-[var(--info)]",
};

export default function StatusIndicator({ state, label, pulse, className }: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative flex h-2 w-2">
        <span className={cn("h-2 w-2 rounded-full", STATE_STYLES[state])} />
        {pulse && (state === "syncing" || state === "connected") && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              STATE_STYLES[state]
            )}
          />
        )}
      </span>
      {label && <span className="text-[11px] font-medium text-[var(--text-muted)]">{label}</span>}
    </span>
  );
}
