"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type PullToRefreshProps = {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
  threshold?: number;
};

export default function PullToRefresh({
  children,
  onRefresh,
  className = "",
  threshold = 80,
}: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [delta, setDelta] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setDelta(0);
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const el = containerRef.current;
      if (!el || el.scrollTop > 0 || !pulling) return;
      const next = Math.max(0, e.touches[0].clientY - startY.current);
      setDelta(next);
      setReady(next > threshold);
    },
    [pulling, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    setPulling(false);
    if (!ready) {
      setReady(false);
      return;
    }
    setRefreshing(true);
    setReady(false);
    hapticMedium();
    try {
      await onRefresh();
      hapticSuccess();
    } finally {
      setRefreshing(false);
      setDelta(0);
    }
  }, [ready, onRefresh]);

  const translateY = pulling ? Math.min(delta, threshold * 1.5) * 0.5 : 0;

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-y-auto os-scroll", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ overscrollBehaviorY: "contain", WebkitOverflowScrolling: "touch" }}
    >
      <motion.div
        className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex h-16 items-end justify-center pb-2"
        initial={false}
        animate={{
          y: pulling || refreshing ? translateY : -64,
          opacity: pulling || refreshing ? 1 : 0,
        }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 24 }}
      >
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[var(--panel-bg)]/80 backdrop-blur-md shadow-lg transition-colors",
            ready ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"
          )}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Loader2
              className={cn(
                "h-4 w-4 transition-transform",
                ready ? "rotate-180" : ""
              )}
            />
          )}
        </div>
      </motion.div>
      {children}
    </div>
  );
}
