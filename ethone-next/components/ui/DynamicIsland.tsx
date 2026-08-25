"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

type IslandContextValue = {
  view: string | null;
};

const IslandContext = createContext<IslandContextValue | null>(null);

// Shell physics in Apple's duration/bounce form one long perceptual glide with
// barely-there bounce, identical in both directions. The shell animates real
// width/height (not transforms), so slots are never scale-distorted.
const SHELL_SPRING = {
  type: "spring",
  duration: 0.8,
  bounce: 0.2,
} as const;

// Content gets a touch more life than the shell.
const CONTENT_SPRING = {
  type: "spring",
  duration: 0.8,
  bounce: 0.35,
} as const;

// Constant radius — never animated. The browser clamps it to half the shell
// height, so the pill-to-rounded-rect morph falls out of the resize for free
// with zero chance of corner glitches.
const RADIUS = 32;

// iPhone pill dimensions. Also the shell's pre-measure animate target: if the
// first commit already has a view active (e.g. a click replayed after
// hydration), the shell blooms from the pill instead of rendering expanded
// with no animation. Lives in `animate`, not `initial`, so server and client
// markup agree.
const PILL_WIDTH = 126;
const PILL_HEIGHT = 37;

/** Tracks the natural size of the content so the shell can spring to it. */
function useContentSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );

  // Synchronous mount measure: the shell must own explicit dimensions before
  // the first interaction. ResizeObserver fires async after mount — a quick
  // first press could beat it, leaving the shell auto-sized so the view
  // snapped open instead of springing.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

function Slot({
  keyId,
  children,
  className,
  "data-testid": testId,
}: {
  keyId: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={keyId}
      data-testid={testId}
      initial={
        reduce
          ? { opacity: 0, filter: "blur(0px)" }
          : { opacity: 0, scale: 0.9, y: -8, filter: "blur(5px)" }
      }
      animate={
        reduce
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
      }
      // Exit gets sucked up into the pill — fast, blur-free, before the
      // shrinking shell can clip it.
      exit={
        reduce
          ? { opacity: 0, filter: "blur(0px)", transition: { duration: 0.1 } }
          : {
              opacity: 0,
              scale: 0.9,
              y: -6,
              filter: "blur(0px)",
              transition: { duration: 0.08, ease: EASE_OUT },
            }
      }
      // One spring drives transform, opacity and blur together — no per
      // property tweens, no delays. Content travels with the shell.
      transition={reduce ? { duration: 0.15 } : CONTENT_SPRING}
      // Anchored to the pill line: content unfurls downward out of it and is
      // sucked back up into it.
      style={{ transformOrigin: "top center" }}
      className={cn("flex items-center justify-center", className)}
    >
      {children}
    </motion.div>
  );
}

export interface DynamicIslandProps extends Omit<HTMLMotionProps<"div">, "onDrag"> {
  /** Active view id. `null` shows the compact pill. */
  view: string | null;
  /** Compact pill content, shown when no view is active. */
  compact?: ReactNode;
  /** DynamicIslandView elements. */
  children?: ReactNode;
  className?: string;
}

export function DynamicIsland({
  view,
  compact,
  children,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: DynamicIslandProps) {
  const reduce = useReducedMotion();
  const expanded = view !== null;
  const [sizerRef, size] = useContentSize();
  const contextValue = useMemo(() => ({ view }), [view]);

  return (
    <IslandContext.Provider value={contextValue}>
      <motion.div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-roledescription="Dynamic Island"
        initial={false}
        animate={
          size
            ? { width: size.width, height: size.height }
            : { width: PILL_WIDTH, height: PILL_HEIGHT }
        }
        transition={reduce ? { duration: 0 } : SHELL_SPRING}
        style={{ borderRadius: RADIUS }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        // items-start pins content to the top edge while the shell springs, so
        // expansion reads as unfurling downward out of the pill.
        className={cn(
          "relative inline-flex items-start justify-center overflow-hidden",
          "bg-[var(--bg-surface)]/85 border border-[var(--border-subtle)] text-[var(--text-primary)]",
          "shadow-[0_16px_40px_-12px_var(--bg-overlay)] backdrop-blur-2xl",
          "cursor-pointer pointer-events-auto select-none",
          className,
        )}
        {...rest}
      >
        {/* w-max keeps this at the natural size of the active content; the
            shell springs toward it. */}
        <div ref={sizerRef} className="w-max">
          <AnimatePresence mode="popLayout" initial={false}>
            {!expanded && compact ? (
              <Slot
                keyId="compact"
                // iPhone pill proportions: ~126 x 37.
                className="min-h-[37px] min-w-[126px] gap-2 px-4 py-1.5 text-xs font-medium"
              >
                {compact}
              </Slot>
            ) : null}
          </AnimatePresence>
          {children}
        </div>
      </motion.div>
    </IslandContext.Provider>
  );
}

export interface DynamicIslandViewProps {
  /** Matches the parent `view` prop when active. */
  id: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function DynamicIslandView({
  id,
  children,
  className,
  "data-testid": testId,
}: DynamicIslandViewProps) {
  const ctx = useContext(IslandContext);
  if (!ctx)
    throw new Error("DynamicIslandView must be used inside <DynamicIsland>");
  const active = ctx.view === id;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      {active ? (
        <Slot keyId={id} data-testid={testId} className={cn("px-6 py-4", className)}>
          {children}
        </Slot>
      ) : null}
    </AnimatePresence>
  );
}
