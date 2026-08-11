"use client";

import { useCallback, useRef } from "react";
import { useSettings } from "@/components/SettingsProvider";

const ACTIVATION_KEYS = new Set(["Enter", " "]);

function canVibrate() {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function useHaptics() {
  const { settings } = useSettings();
  const targetRef = useRef<HTMLElement | null>(null);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabled = settings.haptics && !settings.reducedMotion;

  function setState(el: HTMLElement | null, state: string) {
    if (!el) return;
    if (state) el.setAttribute("data-haptic-state", state);
    else el.removeAttribute("data-haptic-state");
  }

  function release(el?: HTMLElement | null) {
    const target = el || targetRef.current;
    if (!target) return;
    setState(target, "released");
    if (releaseTimer.current) clearTimeout(releaseTimer.current);
    releaseTimer.current = setTimeout(() => {
      if (target.getAttribute("data-haptic-state") === "released") {
        setState(target, "");
      }
    }, 220);
    if (el && targetRef.current === el) targetRef.current = null;
  }

  function press(el: HTMLElement | null) {
    if (!el) return;
    if (releaseTimer.current) {
      clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
    const previous = targetRef.current;
    if (previous && previous !== el) setState(previous, "");
    targetRef.current = el;
    if (enabled) setState(el, "pressed");
  }

  const trigger = useCallback(
    (pattern: number | number[] = 10) => {
      if (!settings.haptics || !canVibrate()) return;
      try {
        navigator.vibrate(Array.isArray(pattern) ? pattern : [pattern]);
      } catch {
        // ignore unsupported vibration
      }
    },
    [settings.haptics]
  );

  const light = useCallback(() => trigger(10), [trigger]);
  const medium = useCallback(() => trigger(20), [trigger]);
  const heavy = useCallback(() => trigger([30, 50, 30]), [trigger]);

  const bind = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      press(e.currentTarget);
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      release(e.currentTarget);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      if (targetRef.current === e.currentTarget) release();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.repeat || (e.nativeEvent as KeyboardEvent).isComposing) return;
      if (ACTIVATION_KEYS.has(e.key)) press(e.currentTarget);
    },
    onKeyUp: (e: React.KeyboardEvent<HTMLElement>) => {
      if (ACTIVATION_KEYS.has(e.key)) release(e.currentTarget);
    },
  };

  return { trigger, light, medium, heavy, bind, press, release };
}
