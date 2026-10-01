"use client";

import { useEffect, type CSSProperties } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SPRING_MOUSE } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

const mix = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

// Deterministic dust: [left %, top %, size px, opacity, duration s, delay s, drift px]
const PARTICLES: [number, number, number, number, number, number, number][] = [
  [8, 72, 1.5, 0.35, 18, 0, 10], [14, 30, 1, 0.25, 22, 4, -8], [21, 88, 2, 0.3, 20, 9, 14],
  [27, 54, 1, 0.2, 24, 2, -12], [33, 18, 1.5, 0.3, 19, 12, 6], [39, 76, 1, 0.25, 26, 6, -6],
  [46, 40, 1.5, 0.2, 21, 15, 10], [52, 92, 1, 0.3, 23, 3, -10], [58, 22, 2, 0.25, 25, 10, 8],
  [63, 64, 1, 0.3, 18, 7, -14], [69, 36, 1.5, 0.2, 22, 13, 12], [74, 84, 1, 0.35, 20, 1, -8],
  [80, 50, 1.5, 0.25, 24, 8, 6], [86, 14, 1, 0.3, 19, 5, -10], [91, 70, 2, 0.2, 27, 11, 10],
  [4, 44, 1, 0.25, 23, 14, 8], [96, 32, 1, 0.3, 21, 3, -6], [44, 8, 1, 0.2, 25, 9, 12],
];

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Auth backdrop: an overhead light, two slow colour fields with a hint of
 * cursor parallax, a planet-like horizon for depth, fine grain and a few
 * drifting specks. Plain gradients and transforms only — no blur filters. */
export default function AuthBackdrop() {
  const { reduced } = useMotionPref();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_MOUSE);
  const sy = useSpring(py, SPRING_MOUSE);
  const nearX = useTransform(sx, (v) => v * 40);
  const nearY = useTransform(sy, (v) => v * 30);
  const farX = useTransform(sx, (v) => v * -24);
  const farY = useTransform(sy, (v) => v * -18);

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
      transition={{ duration: 1.4, ease: "easeOut" }}
    >
      {/* Overhead light */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse 70% 45% at 50% -8%, ${mix("--accent-primary", 13)}, transparent 70%)` }} />

      {/* Colour fields */}
      <motion.div className="absolute -left-[15%] top-[20%] h-[70vh] w-[60vw]" style={{ x: farX, y: farY }}>
        <div className="auth-field h-full w-full" style={{ background: `radial-gradient(closest-side, ${mix("--accent-secondary", 9)}, transparent)` }} />
      </motion.div>
      <motion.div className="absolute -right-[10%] -top-[10%] h-[75vh] w-[55vw]" style={{ x: nearX, y: nearY }}>
        <div className="auth-field h-full w-full [animation-delay:-9s]" style={{ background: `radial-gradient(closest-side, ${mix("--accent-primary", 8)}, transparent)` }} />
      </motion.div>

      {/* Horizon */}
      <div
        className="absolute left-1/2 top-[84%] aspect-square w-[220vw] -translate-x-1/2 rounded-full"
        style={{
          borderTop: `1px solid ${mix("--text-primary", 9)}`,
          background: `radial-gradient(ellipse 50% 6% at 50% 0%, ${mix("--accent-primary", 10)}, transparent), linear-gradient(to bottom, ${mix("--bg-card", 60)}, var(--bg-main) 8%)`,
        }}
      />

      {/* Dust */}
      {!reduced &&
        PARTICLES.map(([left, top, size, opacity, dur, delay, dx], i) => (
          <span
            key={i}
            className="auth-particle"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              "--o": opacity,
              "--dx": `${dx}px`,
              animationDuration: `${dur}s`,
              animationDelay: `-${delay}s`,
            } as CSSProperties}
          />
        ))}

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.045] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />

      {/* Vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 80% at 50% 40%, transparent 55%, var(--bg-main) 100%)" }} />
    </motion.div>
  );
}
