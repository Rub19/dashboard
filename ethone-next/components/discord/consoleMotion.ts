"use client";

import { useEffect, useState } from "react";
import type { Variants } from "framer-motion";
import { EASE_OUT, EASE_SNAP } from "@/lib/ease";

let consoleIntroPlayed = false;

export function useConsoleIntro(): boolean {
  const [playIntro] = useState(() => !consoleIntroPlayed);
  useEffect(() => {
    consoleIntroPlayed = true;
  }, []);
  return playIntro;
}

export const consoleSidebar: Variants = {
  initial: { opacity: 0, x: -28 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_SNAP, staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

export const consoleSidebarItem: Variants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_SNAP } },
};

export const consoleBrandMark: Variants = {
  initial: { opacity: 0, scale: 0.6, rotate: -14 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 320, damping: 18, mass: 0.6, delay: 0.1 },
  },
};

export const consoleHeader: Variants = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

export const consoleStage: Variants = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const consoleReveal: Variants = {
  initial: { opacity: 0, y: 18, filter: "blur(10px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE_SNAP } },
};

export const consoleFadeUp: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};

export const consoleList: Variants = {
  animate: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

export const consoleRow: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE_SNAP } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.16, ease: EASE_OUT } },
};

export const consoleCard: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: EASE_SNAP, staggerChildren: 0.09, delayChildren: 0.18 },
  },
};

export const consoleStepRow: Variants = {
  initial: { opacity: 0, x: -14 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_SNAP } },
};
