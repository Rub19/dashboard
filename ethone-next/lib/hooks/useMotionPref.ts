"use client";

import { useReducedMotion } from "framer-motion";
import { useSettings } from "@/components/SettingsProvider";

/** Single source of truth for "should this component animate." Combines the
 * OS-level `prefers-reduced-motion` (framer's useReducedMotion) with
 * ETHONE's own `settings.reducedMotion` toggle — an explicit in-app
 * preference already checked ad hoc across ~25 components, independently of
 * the OS setting. Call sites stop each importing both and writing their own
 * `reduced ? off : on` branch inline. */
export function useMotionPref() {
  const osReduced = !!useReducedMotion();
  const { settings } = useSettings();
  const reduced = osReduced || Boolean(settings.reducedMotion) || settings.uiAnimations === "reduced";
  return {
    reduced,
    /** Returns `off` when reduced-motion is on, else `on`. */
    pick: <T,>(on: T, off: T) => (reduced ? off : on),
  };
}
