"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { FocusTimer, type FocusPhase, type FocusTimerState } from "@/lib/focus-timer";

export type { FocusPhase };

type FocusContextValue = {
  state: FocusTimerState;
  start: (preset: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  skipBreak: () => void;
  format: (seconds?: number) => string;
};

const focusTimer = new FocusTimer();
if (typeof window !== "undefined") {
  focusTimer.restore();
}

const FocusCtx = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore<FocusTimerState>(
    (callback) => focusTimer.subscribe(callback),
    () => focusTimer.getState(),
    () => focusTimer.getState()
  );

  const value = useMemo<FocusContextValue>(
    () => ({
      state,
      start: (preset: string) => focusTimer.start(preset),
      pause: () => focusTimer.pause(),
      resume: () => focusTimer.resume(),
      stop: () => focusTimer.stop(),
      skip: () => focusTimer.skipBreak(),
      skipBreak: () => focusTimer.skipBreak(),
      format: (seconds?: number) => focusTimer.formatRemaining(seconds),
    }),
    [state]
  );

  return <FocusCtx.Provider value={value}>{children}</FocusCtx.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusCtx);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}
