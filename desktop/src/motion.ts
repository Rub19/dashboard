import type { Variants } from "framer-motion";

export const EASE_SNAP = [0.16, 1, 0.3, 1] as const;
export const EASE_OUT = [0.25, 1, 0.5, 1] as const;

export const SPRING_PRESS = { type: "spring", stiffness: 360, damping: 27, mass: 0.5 } as const;
export const SPRING_SWAP = { type: "spring", stiffness: 300, damping: 28, mass: 0.5 } as const;
export const SPRING_PILL = { type: "spring", stiffness: 450, damping: 43 } as const;
export const SPRING_MOUSE = { type: "spring", stiffness: 180, damping: 18, mass: 0.3 } as const;
export const SPRING_GLIDE = { type: "spring", stiffness: 420, damping: 38, mass: 0.5 } as const;

export const stepEnter: Variants = {
  initial: { opacity: 0, transform: "translateY(6px)" },
  animate: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.15, ease: EASE_SNAP } },
  exit: { opacity: 0, transform: "translateY(-4px)", transition: { duration: 0.1, ease: EASE_OUT } },
};

export const pageEnter: Variants = {
  initial: { opacity: 0, transform: "translateY(10px)" },
  animate: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.22, ease: EASE_SNAP } },
  exit: { opacity: 0, transition: { duration: 0.08, ease: EASE_OUT } },
};

export const listStagger: Variants = {
  animate: { transition: { staggerChildren: 0.035 } },
};

export const listItem: Variants = {
  initial: { opacity: 0, transform: "translateY(8px)" },
  animate: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.24, ease: EASE_SNAP } },
};

export const popover: Variants = {
  initial: { opacity: 0, transform: "scale(0.96)" },
  animate: { opacity: 1, transform: "scale(1)", transition: { duration: 0.15, ease: EASE_SNAP } },
  exit: { opacity: 0, transform: "scale(0.98)", transition: { duration: 0.1, ease: EASE_OUT } },
};
