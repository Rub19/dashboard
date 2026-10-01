"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SPRING_MOUSE } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

const tint = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

/** Full-bleed auth backdrop: two accent auroras drifting with a slight cursor
 * parallax, a slow rotating light halo behind the focal column, and a grid
 * that fades out toward the edges. Every color comes from the active theme. */
export default function AuthBackdrop() {
  const { reduced } = useMotionPref();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_MOUSE);
  const sy = useSpring(py, SPRING_MOUSE);
  const nearX = useTransform(sx, (v) => v * 70);
  const nearY = useTransform(sy, (v) => v * 50);
  const farX = useTransform(sx, (v) => v * -40);
  const farY = useTransform(sy, (v) => v * -30);
  const gridX = useTransform(sx, (v) => v * -12);
  const gridY = useTransform(sy, (v) => v * -12);

  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, px, py]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
      initial={{ opacity: reduced ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {/* Grid, masked to fade out toward the edges */}
      <motion.div
        className="absolute -inset-10"
        style={{
          x: gridX,
          y: gridY,
          backgroundImage: `linear-gradient(${tint("--text-primary", 5)} 1px, transparent 1px), linear-gradient(90deg, ${tint("--text-primary", 5)} 1px, transparent 1px)`,
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 75%)",
        }}
      />

      {/* Near aurora (accent) */}
      <motion.div className="absolute left-[8%] top-[-18%] h-[46rem] w-[46rem]" style={{ x: nearX, y: nearY }}>
        <motion.div
          className="h-full w-full rounded-full blur-[130px]"
          style={{ background: tint("--accent-primary", 22) }}
          animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Far aurora (secondary accent) */}
      <motion.div className="absolute bottom-[-25%] right-[2%] h-[42rem] w-[42rem]" style={{ x: farX, y: farY }}>
        <motion.div
          className="h-full w-full rounded-full blur-[140px]"
          style={{ background: tint("--accent-secondary", 16) }}
          animate={reduced ? undefined : { scale: [1.08, 0.95, 1.08], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Slow rotating halo behind the focal column */}
      <div className="absolute left-1/2 top-[42%] h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 opacity-60">
        <motion.div
          className="h-full w-full rounded-full blur-[70px]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, ${tint("--accent-primary", 18)} 70deg, transparent 150deg, ${tint("--accent-secondary", 12)} 230deg, transparent 300deg)`,
            maskImage: "radial-gradient(circle, transparent 28%, black 45%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 28%, black 45%, transparent 70%)",
          }}
          animate={reduced ? undefined : { rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse 85% 75% at 50% 45%, transparent 40%, var(--bg-main) 100%)` }}
      />
    </motion.div>
  );
}
