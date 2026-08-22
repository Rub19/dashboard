"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { FocusTimer, type FocusPhase, type FocusTimerState } from "@/lib/focus-timer";
import { areActivitiesSupported, startFocusActivity, updateFocusActivity, endFocusActivity } from "@/lib/live-activity";

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

  const activityRef = useRef<string | null>(null);
  const canLiveActivity = useRef(false);

  useEffect(() => {
    areActivitiesSupported().then((supported) => {
      canLiveActivity.current = supported;
    });
  }, []);

  useEffect(() => {
    if (!canLiveActivity.current) return;

    if (state.phase !== "idle" && state.total > 0) {
      const title = state.phase === "focus" ? "Focus" : state.phase === "shortBreak" ? "Pause" : "Long break";
      if (!activityRef.current) {
        startFocusActivity("ethone-focus", title, state.total, "classic").then((res) => {
          if (res.activityId) activityRef.current = "ethone-focus";
        });
      } else {
        const progress = state.total ? String(Math.round((1 - state.remaining / state.total) * 100)) : "0";
        updateFocusActivity("ethone-focus", {
          focusTitle: title,
          timeRemaining: focusTimer.formatRemaining(state.remaining),
          progress,
        });
      }
    } else if (activityRef.current) {
      endFocusActivity("ethone-focus");
      activityRef.current = null;
    }
  }, [state]);

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
