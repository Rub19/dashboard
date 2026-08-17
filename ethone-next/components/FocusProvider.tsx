"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
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

const FocusCtx = createContext<FocusContextValue | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FocusTimerState>(() => focusTimer.getState());
  const isRestored = useRef(false);

  useEffect(() => {
    if (!isRestored.current) {
      isRestored.current = true;
      FocusTimer.loadFromCloud()
        .then((session) => {
          if (session) {
            focusTimer.restore(session, true);
          } else {
            focusTimer.restore();
          }
        })
        .catch(() => focusTimer.restore());
    }
    return focusTimer.subscribe(setState);
  }, []);

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
