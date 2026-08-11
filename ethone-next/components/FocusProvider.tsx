"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export type FocusPhase = "idle" | "focus" | "shortBreak" | "longBreak";

type FocusState = {
  phase: FocusPhase;
  remaining: number;
  total: number;
  paused: boolean;
  format: (seconds: number) => string;
};

type FocusContext = {
  state: FocusState & { format: (seconds: number) => string };
  start: (preset: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skip: () => void;
  format: (seconds: number) => string;
};

const PRESETS: Record<string, { phase: FocusPhase; minutes: number }> = {
  pomodoro: { phase: "focus", minutes: 25 },
  deep: { phase: "focus", minutes: 50 },
  quick: { phase: "focus", minutes: 15 },
  shortBreak: { phase: "shortBreak", minutes: 5 },
  longBreak: { phase: "longBreak", minutes: 15 },
};

const FocusCtx = createContext<FocusContext | null>(null);

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<FocusPhase>("idle");
  const [remaining, setRemaining] = useState(25 * 60);
  const [total, setTotal] = useState(25 * 60);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((preset: string) => {
    const config = PRESETS[preset];
    if (!config) return;
    clear();
    const seconds = config.minutes * 60;
    setPhase(config.phase);
    setRemaining(seconds);
    setTotal(seconds);
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clear();
          setPhase("idle");
          setPaused(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clear]);

  const pause = useCallback(() => {
    clear();
    setPaused(true);
  }, [clear]);

  const resume = useCallback(() => {
    if (phase === "idle" || remaining <= 0) return;
    setPaused(false);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clear();
          setPhase("idle");
          setPaused(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clear, phase, remaining]);

  const stop = useCallback(() => {
    clear();
    setPhase("idle");
    setPaused(false);
    setRemaining(25 * 60);
    setTotal(25 * 60);
  }, [clear]);

  const skip = useCallback(() => {
    clear();
    setPhase("idle");
    setPaused(false);
    setRemaining(0);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return (
    <FocusCtx.Provider
      value={{
        state: { phase, remaining, total, paused, format: formatTime },
        start,
        pause,
        resume,
        stop,
        skip,
        format: formatTime,
      }}
    >
      {children}
    </FocusCtx.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusCtx);
  if (!ctx) throw new Error("useFocus must be used within FocusProvider");
  return ctx;
}
