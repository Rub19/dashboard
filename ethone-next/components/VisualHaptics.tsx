"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "./SettingsProvider";

const CONTROL_SELECTOR = [
  "button:not(:disabled)",
  "a[href]",
  "[role='button']:not([aria-disabled='true'])",
  "[role='tab']:not([aria-disabled='true'])",
  "[role='option']:not([aria-disabled='true'])",
  "[role='switch']:not([aria-disabled='true'])",
  "[role='checkbox']:not([aria-disabled='true'])",
  "[role='radio']:not([aria-disabled='true'])",
  "[data-interactive]:not([aria-disabled='true'])",
  "[data-haptic]:not([aria-disabled='true'])",
].join(",");

const ACTIVATION_KEYS = new Set(["Enter", " "]);
const RELEASE_DURATION = 240;
const HOLD_LIMIT = 1200;

function setHapticState(target: Element | null, state: string) {
  if (!target) return;
  if (state) target.setAttribute("data-haptic-state", state);
  else target.removeAttribute("data-haptic-state");
}

export default function VisualHaptics() {
  const { settings } = useSettings();
  const activeRef = useRef<{ target: Element; source: string; id: string | number } | null>(null);
  const timersRef = useRef<Map<Element, ReturnType<typeof setTimeout>>>(new Map());
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!settings.haptics) return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timers = timersRef.current;

    function findControl(event: Event) {
      const target = (event.target as HTMLElement)?.closest(CONTROL_SELECTOR);
      if (!target) return null;
      if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") return null;
      if (target.closest?.("[inert]") || (target as HTMLElement).inert) return null;
      return target;
    }

    function release(source: string, id: string | number) {
      const active = activeRef.current;
      if (!active || active.source !== source || active.id !== id) return;
      const released = active.target;
      if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; }
      activeRef.current = null;
      const existing = timers.get(released);
      if (existing) clearTimeout(existing);
      setHapticState(released, "released");
      const t = setTimeout(() => {
        if (released.getAttribute("data-haptic-state") === "released") {
          setHapticState(released, "");
        }
        timers.delete(released);
      }, RELEASE_DURATION);
      timers.set(released, t);
    }

    function press(target: Element, source: string, id: string | number) {
      const active = activeRef.current;
      if (active) {
        if (active.target === target) return;
        setHapticState(active.target, "");
      }
      const existing = timers.get(target);
      if (existing) { clearTimeout(existing); timers.delete(target); }
      activeRef.current = { target, source, id };
      setHapticState(target, "pressed");
      holdRef.current = setTimeout(() => release(source, id), HOLD_LIMIT);
    }

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0 || !event.isPrimary) return;
      const control = findControl(event);
      if (control) press(control, "pointer", event.pointerId);
    }

    function onPointerUp(event: PointerEvent) {
      release("pointer", event.pointerId);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (!ACTIVATION_KEYS.has(event.key) || event.repeat || event.isComposing) return;
      const control = findControl(event);
      if (control) press(control, "keyboard", event.key);
    }

    function onKeyUp(event: KeyboardEvent) {
      if (ACTIVATION_KEYS.has(event.key)) release("keyboard", event.key);
    }

    function onBlur() {
      if (activeRef.current && holdRef.current) {
        clearTimeout(holdRef.current);
        holdRef.current = null;
      }
      if (activeRef.current) {
        setHapticState(activeRef.current.target, "");
        activeRef.current = null;
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    root.dataset.v8Haptics = "ready";

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
      delete root.dataset.v8Haptics;
      if (activeRef.current) setHapticState(activeRef.current.target, "");
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (holdRef.current) clearTimeout(holdRef.current);
    };
  }, [settings.haptics]);

  return null;
}
