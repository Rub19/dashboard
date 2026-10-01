"use client";

import { useEffect, type CSSProperties } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SPRING_MOUSE } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

const mix = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, transparent)`;

// A few barely-visible specks: [left %, top %, size px, opacity, duration s, delay s, drift px]
const PARTICLES: [number, number, number, number, number, number, number][] = [
  [12, 68, 1.5, 0.18, 22, 0, 8], [24, 34, 1, 0.14, 26, 6, -6], [37, 82, 1, 0.16, 24, 12, 10],
  [55, 18, 1.5, 0.14, 28, 4, -8], [66, 58, 1, 0.18, 23, 9, 6], [78, 28, 1, 0.14, 27, 15, -10],
  [88, 74, 1.5, 0.16, 25, 3, 8], [46, 52, 1, 0.12, 30, 18, -6],
  [6, 24, 1, 0.12, 27, 7, 6], [31, 92, 1.5, 0.14, 24, 13, -8], [72, 12, 1, 0.12, 29, 2, 10], [94, 46, 1, 0.14, 26, 16, -6],
];

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// Every light is an ellipse that fades to fully transparent well inside an
// oversized layer, so nothing ever meets the viewport edge as a line.
const LIGHT = [
  `radial-gradient(42% 34% at 50% 6%, ${mix("--accent-primary", 11)}, transparent)`,
  `radial-gradient(34% 30% at 74% 42%, ${mix("--accent-primary", 7)}, transparent)`,
  `radial-gradient(38% 34% at 26% 66%, ${mix("--accent-secondary", 6)}, transparent)`,
  `radial-gradient(30% 22% at 82% 86%, ${mix("--accent-secondary", 5)}, transparent)`,
  `radial-gradient(60% 30% at 50% 108%, ${mix("--text-primary", 3)}, transparent)`,
].join(", ");

/** Auth backdrop: diffuse light pooled in soft ellipses on an oversized,
 * slowly breathing layer (its edges always sit outside the viewport), fine
 * grain, a handful of specks and a vignette. Transform/opacity only. */
export default function AuthBackdrop() {
  const { reduced } = useMotionPref();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_MOUSE);
  const sy = useSpring(py, SPRING_MOUSE);
  const x = useTransform(sx, (v) => v * -24);
  const y = useTransform(sy, (v) => v * -18);

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
      <motion.div className="absolute -inset-[25%]" style={{ x, y }}>
        <div className="auth-field absolute inset-0" style={{ background: LIGHT }} />
      </motion.div>

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

      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--bg-main) 100%)" }} />
    </motion.div>
  );
}
