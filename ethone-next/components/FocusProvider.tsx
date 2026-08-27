"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { FocusTimer, type FocusPhase, type FocusTimerState } from "@/lib/focus-timer";
import { areActivitiesSupported, startActivity, setFocusActivity, endActivity } from "@/lib/live-activity";
import { setNativeFocusState } from "@/lib/apple";
import { schedulePomodoroEndNotification, cancelReminder } from "@/lib/local-notifications";

export type { FocusPhase };

type FocusContextValue = {
  state: FocusTimerState;
  start: (preset: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  skipBreak: () => void;
  adjustTime: (deltaSeconds: number) => void;
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
  const pomodoroNotificationId = useRef<number | null>(null);

  useEffect(() => {
    areActivitiesSupported().then((supported) => {
      canLiveActivity.current = supported;
    });
  }, []);

  useEffect(() => {
    setNativeFocusState(state.phase !== "idle", state.total / 60).catch(() => {});
  }, [state.phase, state.total]);

  useEffect(() => {
    async function syncNotification() {
      if (state.phase === "focus" && !state.paused && state.remaining > 0) {
        const endAt = new Date(Date.now() + state.remaining * 1000);
        const sessionName = state.activePreset ? `Focus · ${state.activePreset}` : "Session Focus";
        const res = await schedulePomodoroEndNotification(sessionName, endAt);
        if (res.ok) {
          pomodoroNotificationId.current = res.id;
        }
      } else if (pomodoroNotificationId.current !== null) {
        await cancelReminder(pomodoroNotificationId.current);
        pomodoroNotificationId.current = null;
      }
    }
    void syncNotification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.paused]);

  useEffect(() => {
    if (!canLiveActivity.current) return;

    if (state.phase !== "idle" && state.total > 0) {
      const title = state.phase === "focus" ? "Focus" : state.phase === "shortBreak" ? "Pause" : "Long break";
      if (!activityRef.current) {
        startActivity("ethone-focus", { mode: "focus", title, subtitle: focusTimer.formatRemaining(state.remaining), progress: "0" }).then((res) => {
          if (res.activityId) activityRef.current = "ethone-focus";
        });
      } else {
        setFocusActivity("ethone-focus", title, state.remaining, state.total);
      }
    } else if (activityRef.current) {
      endActivity("ethone-focus");
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
      adjustTime: (deltaSeconds: number) => focusTimer.adjustTime(deltaSeconds),
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
