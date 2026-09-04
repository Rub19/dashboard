"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserState, setUserState } from "@/lib/user-state";

export const CURRENT_ONBOARDING_VERSION = 2;

const STORAGE_KEYS = {
  COMPLETED: "discord_onboarding_completed",
  VERSION: "discord_onboarding_version",
  COMPLETED_AT: "discord_onboarding_completed_at",
  CURRENT_STEP: "discord_onboarding_last_step",
};

export interface OnboardingState {
  isCompleted: boolean;
  version: number;
  completedAt: string | null;
}

export function useDiscordOnboarding() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Check state on mount
  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        // Query param trigger check: ?onboarding=true
        let forceOpen = false;
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("onboarding") === "true") {
            forceOpen = true;
          }
        }

        // 1. Check local storage first for fast sync
        let localCompleted = false;
        let localVersion = 0;
        if (typeof window !== "undefined") {
          localCompleted = localStorage.getItem(STORAGE_KEYS.COMPLETED) === "true";
          localVersion = Number(localStorage.getItem(STORAGE_KEYS.VERSION) || "0");
        }

        // 2. Check Supabase user state
        let serverCompleted = false;
        let serverVersion = 0;
        try {
          const userState = await getUserState<{
            discord_onboarding_completed?: boolean;
            discord_onboarding_version?: number;
            discord_onboarding_completed_at?: string;
          }>("discord_onboarding", {});

          if (userState && typeof userState.discord_onboarding_completed === "boolean") {
            serverCompleted = userState.discord_onboarding_completed;
            serverVersion = userState.discord_onboarding_version || 0;
          }
        } catch {
          // ignore server fetch error, fallback to localStorage
        }

        const completed = serverCompleted || (localCompleted && localVersion >= CURRENT_ONBOARDING_VERSION);

        if (isMounted) {
          setIsCompleted(completed);
          setIsLoading(false);

          if (forceOpen || !completed) {
            setIsOpen(true);
            setCurrentStep(0);
          }
        }
      } catch (err) {
        if (isMounted) {
          setIsCompleted(false);
          setIsLoading(false);
        }
      }
    }

    checkStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const openOnboarding = useCallback((step: number = 0) => {
    setCurrentStep(Math.max(0, Math.min(step, 7)));
    setIsOpen(true);
  }, []);

  const closeOnboarding = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsCompleted(true);
    setIsOpen(false);
    const now = new Date().toISOString();

    // 1. Update localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEYS.COMPLETED, "true");
        localStorage.setItem(STORAGE_KEYS.VERSION, String(CURRENT_ONBOARDING_VERSION));
        localStorage.setItem(STORAGE_KEYS.COMPLETED_AT, now);
      } catch (e) {}
    }

    // 2. Persist to Supabase
    try {
      await setUserState("discord_onboarding", {
        discord_onboarding_completed: true,
        discord_onboarding_version: CURRENT_ONBOARDING_VERSION,
        discord_onboarding_completed_at: now,
      });
    } catch {}
  }, []);

  const resetOnboarding = useCallback(async () => {
    setIsCompleted(false);
    setCurrentStep(0);
    setIsOpen(true);

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEYS.COMPLETED);
        localStorage.removeItem(STORAGE_KEYS.VERSION);
        localStorage.removeItem(STORAGE_KEYS.COMPLETED_AT);
      } catch {}
    }

    try {
      await setUserState("discord_onboarding", {
        discord_onboarding_completed: false,
        discord_onboarding_version: 0,
        discord_onboarding_completed_at: null,
      });
    } catch {}
  }, []);

  const trackEvent = useCallback((event: string, meta?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Onboarding Analytics] ${event}`, meta);
    }
  }, []);

  return {
    isOpen,
    currentStep,
    setCurrentStep,
    isCompleted,
    isLoading,
    prefersReducedMotion,
    openOnboarding,
    closeOnboarding,
    completeOnboarding,
    resetOnboarding,
    trackEvent,
  };
}
