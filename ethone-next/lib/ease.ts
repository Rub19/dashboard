// Shared motion tokens. Easing curves mirror the CSS custom properties in
// globals.css; springs are the canonical physics used across components.
// Strong custom variants — defaults like `ease-in`/`ease-out` feel weak.

export const EASE_OUT = [0.25, 1, 0.5, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const EASE_DRAWER = [0.25, 1, 0.5, 1] as const;

/** CSS string form of EASE_OUT for inline style transitions. */
export const EASE_OUT_CSS = "cubic-bezier(0.25, 1, 0.5, 1)";

/** Mirrors --ease-snap in globals.css. Canonical export for the curve several
 * components (DynamicIsland, the login card) previously hardcoded locally. */
export const EASE_SNAP = [0.16, 1, 0.3, 1] as const;
export const EASE_SNAP_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/** Shared duration scale, in seconds, for framer-motion `transition.duration`.
 * Replaces the ad hoc 0.12/0.18/0.3 literals scattered across call sites. */
export const DURATION_INSTANT = 0.1;
export const DURATION_FAST = 0.15;
export const DURATION_BASE = 0.2;
export const DURATION_SLOW = 0.3;
export const DURATION_DELIBERATE = 0.5;

/** Press feedback on buttons and other tappable surfaces. */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 360,
  damping: 26,
  mass: 0.5,
} as const;

/** Content swaps — label/icon slots trading places inside a control. */
export const SPRING_SWAP = {
  type: "spring",
  stiffness: 300,
  damping: 28,
  mass: 0.5,
} as const;

/** Overlay panel entrances — modals and sheets summoned by pointer. */
export const SPRING_PANEL = {
  type: "spring",
  stiffness: 280,
  damping: 30,
  mass: 0.6,
} as const;

/** Shared-layout glides — pills, indicators and panels morphing between positions. */
export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 260,
  damping: 28,
  mass: 0.6,
} as const;

/** Cursor-follow physics for decorative mouse tracking (magnetic, tilt, dock). */
export const SPRING_MOUSE = {
  type: "spring",
  stiffness: 180,
  damping: 18,
  mass: 0.3,
} as const;

/** Dragged handles and fills (sliders) — critically damped `useSpring` config,
 * so the value follows the pointer butterily and never rebounds off an end. */
export const SPRING_GLIDE = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.5,
} as const;

/** Snappy layoutId glides — active-tab pills and similar small indicators
 * that need a faster response than SPRING_LAYOUT. Matches the spring
 * AnimatedFilterTabs previously defined inline. */
export const SPRING_PILL = {
  type: "spring",
  stiffness: 450,
  damping: 35,
} as const;
