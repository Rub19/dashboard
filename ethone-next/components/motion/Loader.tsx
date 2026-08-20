"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EASE_IN_OUT } from "@/lib/ease";

export type LoaderVariant = "comet" | "percent";

export interface LoaderProps {
  variant?: LoaderVariant;
  size?: number;
  speed?: number;
  label?: string;
  className?: string;
  progress?: number;
}

const REDUCED = {
  animate: { opacity: [1, 0.4, 1] },
  transition: { duration: 1.4, ease: EASE_IN_OUT, repeat: Infinity },
};

export function Loader({
  variant = "comet",
  size = 32,
  speed = 1,
  label = "Loading",
  className,
  progress,
}: LoaderProps) {
  const reduce = useReducedMotion() ?? false;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center text-foreground",
        className,
      )}
    >
      {variant === "comet" && <Comet size={size} speed={speed} reduce={reduce} />}
      {variant === "percent" && <Percent size={size} speed={speed} reduce={reduce} progress={progress} />}
      <span className="sr-only">{label}</span>
    </span>
  );
}

interface PartProps {
  size: number;
  speed: number;
  reduce: boolean;
}

const COMET_TRAIL = [0, 1, 2, 3, 4, 5];

function Comet({ size, speed, reduce }: PartProps) {
  const head = size * 0.2;
  const r = size / 2 - head / 2;
  return (
    <span className="relative" style={{ width: size, height: size }}>
      <motion.span
        className="absolute inset-0"
        animate={reduce ? REDUCED.animate : { rotate: 360 }}
        transition={
          reduce
            ? REDUCED.transition
            : { duration: speed, ease: "linear", repeat: Infinity }
        }
      >
        {COMET_TRAIL.map((i) => {
          const scale = 1 - i * 0.13;
          const sz = head * scale;
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full bg-current"
              style={{
                width: sz,
                height: sz,
                marginLeft: -sz / 2,
                marginTop: -sz / 2,
                opacity: 1 - i * 0.16,
                transform: `rotate(${-i * 15}deg) translateY(${-r}px)`,
              }}
            />
          );
        })}
      </motion.span>
    </span>
  );
}

function Percent({
  size,
  speed,
  reduce,
  progress,
}: PartProps & { progress?: number }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (typeof progress === "number") return;
    const dur = (reduce ? speed * 2 : speed) * 1000;
    const start = { t: 0 };
    const tickMs = 40;
    const id = setInterval(() => {
      start.t += tickMs;
      const next = Math.min(100, Math.round((start.t / dur) * 100));
      setP(next);
      if (next >= 100) start.t = 0;
    }, tickMs);
    return () => clearInterval(id);
  }, [speed, reduce, progress]);

  const value = typeof progress === "number" ? Math.min(100, Math.max(0, Math.round(progress))) : p;

  return (
    <span
      className="flex flex-col items-center"
      style={{ gap: size * 0.14, width: size * 1.4 }}
    >
      <span
        className="font-mono font-medium tabular-nums"
        style={{ fontSize: size * 0.42, lineHeight: 1 }}
      >
        {value}%
      </span>
      <span
        className="w-full overflow-hidden rounded-full bg-current/15"
        style={{ height: Math.max(3, size * 0.1) }}
      >
        <span
          className="block h-full rounded-full bg-current transition-all duration-100 ease-linear"
          style={{ width: `${value}%` }}
        />
      </span>
    </span>
  );
}
