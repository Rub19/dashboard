"use client";

import type { ReactNode } from "react";
import { useRef, useCallback } from "react";
import type { TargetAndTransition, Transition } from "framer-motion";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { SPRING_MOUSE } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { useSettings } from "@/components/SettingsProvider";
import { cn } from "@/lib/utils";

export interface TiltCardProps {
  children: ReactNode;
  max?: number;
  glare?: boolean;
  className?: string;
  initial?: TargetAndTransition;
  animate?: TargetAndTransition;
  exit?: TargetAndTransition;
  transition?: Transition;
  layout?: boolean | "position" | "size" | "preserve-aspect";
}

export function TiltCard({
  children,
  max = 12,
  glare = false,
  className,
  initial,
  animate,
  exit,
  transition,
  layout,
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const { settings } = useSettings();

  const enabled =
    !reduce &&
    canHover &&
    settings.cardTilt &&
    settings.performanceMode !== "low";

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const srx = useSpring(rx, SPRING_MOUSE);
  const sry = useSpring(ry, SPRING_MOUSE);

  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const apply = useCallback(() => {
    rafRef.current = null;
    const el = ref.current;
    const pointer = pendingRef.current;
    if (!el || !pointer) {
      rx.set(0);
      ry.set(0);
      return;
    }
    const rect = el.getBoundingClientRect();
    const px = (pointer.clientX - rect.left) / rect.width;
    const py = (pointer.clientY - rect.top) / rect.height;
    ry.set((px - 0.5) * max);
    rx.set((0.5 - py) * max);
    gx.set(px * 100);
    gy.set(py * 100);
  }, [max, rx, ry, gx, gy]);

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      pendingRef.current = { clientX: e.clientX, clientY: e.clientY };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(apply);
      }
    },
    [enabled, apply]
  );

  const onLeave = useCallback(() => {
    pendingRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    rx.set(0);
    ry.set(0);
    gx.set(50);
    gy.set(50);
  }, [rx, ry, gx, gy]);

  const transform = useMotionTemplate`perspective(1000px) rotateX(${srx}deg) rotateY(${sry}deg)`;
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, var(--text-primary), transparent 50%)`;

  return (
    <motion.div
      ref={ref}
      layout={layout}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      onMouseMove={enabled ? onMove : undefined}
      onMouseLeave={enabled ? onLeave : undefined}
      data-card-isolated="true"
      style={enabled ? { transform, transformStyle: "preserve-3d" } : undefined}
      className={cn(
        "relative overflow-hidden rounded-2xl backface-hidden",
        enabled ? "will-change-transform" : "",
        className,
      )}
    >
      {children}
      {glare && enabled ? (
        <motion.div
          aria-hidden
          style={{ background: glareBg }}
          className="pointer-events-none absolute inset-0 opacity-15"
        />
      ) : null}
    </motion.div>
  );
}
