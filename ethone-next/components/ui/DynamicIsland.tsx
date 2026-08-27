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

// Shell physics: ultra smooth spring with subtle inertia and organic damping
const SHELL_SPRING = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
} as const;

// Content spring: synchronized with shell
const CONTENT_SPRING = {
  type: "spring",
  stiffness: 440,
  damping: 34,
  mass: 0.7,
} as const;

const RADIUS = 32;
const PILL_WIDTH = 130;
const PILL_HEIGHT = 40;

/** Tracks the natural size of the content so the shell can spring to it. */
function useContentSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

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
          ? { opacity: 0 }
          : { opacity: 0, scale: 0.94, y: -6, filter: "blur(4px)" }
      }
      animate={
        reduce
          ? { opacity: 1 }
          : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
      }
      exit={
        reduce
          ? { opacity: 0, transition: { duration: 0.1 } }
          : {
              opacity: 0,
              scale: 0.94,
              y: -4,
              filter: "blur(3px)",
              transition: { duration: 0.1, ease: EASE_OUT },
            }
      }
      transition={reduce ? { duration: 0.15 } : CONTENT_SPRING}
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
  progressPercent?: number;
}

export function DynamicIsland({
  view,
  compact,
  children,
  className,
  progressPercent,
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
        initial={false}
        animate={
          size
            ? { width: size.width, height: size.height }
            : { width: PILL_WIDTH, height: PILL_HEIGHT }
        }
        whileHover={
          reduce
            ? undefined
            : {
                scale: expanded ? 1 : 1.02,
                boxShadow: "0 12px 36px -4px rgba(0,0,0,0.6), 0 0 28px -4px var(--glow-color)",
              }
        }
        whileTap={reduce ? undefined : { scale: 0.98 }}
        transition={reduce ? { duration: 0 } : SHELL_SPRING}
        style={{ borderRadius: RADIUS }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={cn(
          "relative inline-flex items-start justify-center overflow-hidden",
          "border border-[var(--panel-border)]/[0.22] bg-[var(--bg-main)]/90 text-[var(--text-primary)]",
          "shadow-[0_8px_32px_-4px_rgba(0,0,0,0.55),0_0_20px_-6px_var(--glow-color)] backdrop-blur-3xl",
          "cursor-pointer pointer-events-auto select-none transition-colors duration-200",
          "before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit]",
          "before:bg-gradient-to-b before:from-[var(--text-primary)]/[0.06] before:to-transparent",
          className,
        )}
        {...rest}
      >
        <div ref={sizerRef} className="w-max">
          <AnimatePresence mode="popLayout" initial={false}>
            {!expanded && compact ? (
              <Slot
                keyId="compact"
                className="h-10 min-w-[130px] gap-2.5 px-3.5 py-0 text-xs font-medium"
              >
                {compact}
              </Slot>
            ) : null}
          </AnimatePresence>
          {children}
        </div>

        {/* Micro progress line at the very bottom of the capsule */}
        {!expanded && typeof progressPercent === "number" && progressPercent > 0 && (
          <div className="pointer-events-none absolute inset-x-3.5 bottom-0.5 h-[1.5px] overflow-hidden rounded-full bg-[var(--text-primary)]/[0.08]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-primary)]/80 to-[var(--accent-primary)]"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        )}
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
        <Slot keyId={id} data-testid={testId} className={cn("px-5 py-4", className)}>
          {children}
        </Slot>
      ) : null}
    </AnimatePresence>
  );
}
