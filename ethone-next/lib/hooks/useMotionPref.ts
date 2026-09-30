"use client";

import { useReducedMotion } from "framer-motion";

/** Single source of truth for "should this component animate." Wraps
 * framer's useReducedMotion so call sites stop each importing it and writing
 * their own `reduced ? off : on` branch inline. */
export function useMotionPref() {
  const reduced = !!useReducedMotion();
  return {
    reduced,
    /** Returns `off` when reduced-motion is on, else `on`. */
    pick: <T,>(on: T, off: T) => (reduced ? off : on),
  };
}
