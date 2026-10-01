import type { Variants } from "framer-motion";
import { EASE_OUT, EASE_SNAP, DURATION_BASE, DURATION_FAST, DURATION_SLOW, SPRING_PANEL } from "@/lib/ease";

/** A form/panel appearing in place — auth cards, modals, settings sections.
 * Replaces the hand-rolled `initial={{opacity:0,y:16,scale:0.98}}` objects
 * previously duplicated across the login/verify/recovery/reset pages. */
export const cardEnter: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION_SLOW, ease: EASE_SNAP } },
  exit: { opacity: 0, transition: { duration: DURATION_BASE, ease: EASE_OUT } },
};

/** A single field/step swapping inside a form shell — auth mode tabs, OTP
 * steps. Smaller motion than cardEnter since it's nested content, not the
 * whole surface. */
export const stepEnter: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION_FAST, ease: EASE_SNAP } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION_FAST, ease: EASE_SNAP } },
};

/** Parent wrapper for a grid/list of cards entering with a staggered cascade
 * — Dashboard bento grid, Marketplace listings, Connections cards. Pair with
 * `staggerItem` on each child. */
export const pageStagger: Variants = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

/** Child of `pageStagger` — one card/tile in a staggered grid. */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION_BASE, ease: EASE_OUT } },
};

/** Hero-scale reveal: rises out of a soft blur into focus. For headlines and
 * focal elements in an entrance choreography — heavier than staggerItem. */
export const revealUp: Variants = {
  initial: { opacity: 0, y: 14, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: DURATION_SLOW + 0.15, ease: EASE_SNAP } },
  exit: { opacity: 0, y: -8, filter: "blur(6px)", transition: { duration: DURATION_FAST, ease: EASE_OUT } },
};

/** Parent for a staged entrance: children with `revealUp`/`staggerItem`
 * enter one after another, in document order. */
export const choreography: Variants = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

/** Spring-driven overlay entrance — modals, sheets, anything that should
 * feel physically summoned rather than eased in on a timer. */
export const panelSpring: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: SPRING_PANEL },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION_FAST } },
};
