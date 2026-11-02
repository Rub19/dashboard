import type { Variants } from "framer-motion";

export const EASE_SNAP = [0.16, 1, 0.3, 1] as const;
export const EASE_OUT = [0.25, 1, 0.5, 1] as const;

export const SPRING_PRESS = { type: "spring", stiffness: 360, damping: 27, mass: 0.5 } as const;
export const SPRING_SWAP = { type: "spring", stiffness: 300, damping: 28, mass: 0.5 } as const;
export const SPRING_PANEL = { type: "spring", stiffness: 280, damping: 30, mass: 0.6 } as const;
export const SPRING_PILL = { type: "spring", stiffness: 450, damping: 43 } as const;
export const SPRING_MOUSE = { type: "spring", stiffness: 180, damping: 18, mass: 0.3 } as const;
export const SPRING_GLIDE = { type: "spring", stiffness: 420, damping: 38, mass: 0.5 } as const;

export const revealUp: Variants = {
  initial: { opacity: 0, y: 14, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: EASE_SNAP } },
  exit: { opacity: 0, y: -8, filter: "blur(6px)", transition: { duration: 0.15, ease: EASE_OUT } },
};

export const choreography: Variants = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const stepEnter: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: EASE_SNAP } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: EASE_SNAP } },
};

export const pageStagger: Variants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
};

export const panelSpring: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: SPRING_PANEL },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
};
