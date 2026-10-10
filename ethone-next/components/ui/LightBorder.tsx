"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotionPref } from "@/lib/hooks/useMotionPref";
import { useTouchCapable } from "@/lib/hooks/use-touch-capable";
import { cn } from "@/lib/utils";

interface LightBorderProps {
  children: ReactNode;
  /** CSS color token of the travelling light, e.g. "--accent-primary". */
  light?: string;
  /** Seconds per lap. */
  speed?: number;
  /** Outer radius (inner surface gets the same radius minus the 1px border). */
  radius?: string;
  className?: string;
  innerClassName?: string;
  innerStyle?: CSSProperties;
}

/** ETHONE signature surface: a 1px theme border with a short light that
 * travels around it. Static border when motion is reduced. */
export default function LightBorder({
  children,
  light = "--accent-primary",
  speed = 7,
  radius = "var(--panel-radius)",
  className,
  innerClassName,
  innerStyle,
}: LightBorderProps) {
  const { reduced } = useMotionPref();
  // Immobile sur écran tactile : un calque tournant sous un flou provoque des saccades sur téléphone.
  const still = useTouchCapable() || reduced;

  return (
    <div
      className={cn("relative overflow-hidden p-px", className)}
      style={{ background: "var(--panel-border)", borderRadius: `calc(${radius} + 1px)` }}
    >
      {/* Immobile, la lumière laisserait un trait coloré figé sur un bord : on garde alors la bordure simple. */}
      {!still && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[160%] min-w-[160%] -translate-x-1/2 -translate-y-1/2"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg 290deg, var(${light}) 345deg, transparent 360deg)` }}
          animate={{ rotate: 360 }}
          transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div
        className={cn("relative overflow-hidden", innerClassName)}
        style={{
          borderRadius: radius,
          background: "color-mix(in srgb, var(--bg-card, var(--bg-main)) 94%, transparent)",
          ...innerStyle,
        }}
      >
        {children}
      </div>
    </div>
  );
}
