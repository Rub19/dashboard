"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { scoreColor } from "@/lib/discord/security-scan";

/**
 * Anneau de score (0–100) : l'arc se remplit avec un ressort et le chiffre compte jusqu'à la valeur.
 * Le texte est centré dans le cercle intérieur, il ne touche jamais le trait.
 */
export default function ScoreRing({ score, size = 96, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const reduced = useReducedMotion();
  const value = Math.max(0, Math.min(100, Math.round(score)));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useMotionValue(reduced ? value : 0);
  const dashOffset = useTransform(progress, (v) => circumference * (1 - v / 100));
  const label = useTransform(progress, (v) => String(Math.round(v)));
  const color = scoreColor(value);

  useEffect(() => {
    if (reduced) {
      progress.set(value);
      return;
    }
    const controls = animate(progress, value, { type: "spring", bounce: 0, duration: 1.1 });
    return () => controls.stop();
  }, [progress, reduced, value]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Score ${value} sur 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-border)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: dashOffset, filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 45%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="font-bold leading-none tracking-tight text-[var(--text-primary)] tabular-nums" style={{ fontSize: size * 0.3 }}>
          {label}
        </motion.span>
        <span className="mt-0.5 font-medium leading-none text-[var(--text-muted)]" style={{ fontSize: Math.max(10, size * 0.11) }}>
          /100
        </span>
      </div>
    </div>
  );
}
