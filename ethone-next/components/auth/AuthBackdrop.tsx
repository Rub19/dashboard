"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SPRING_MOUSE } from "@/lib/ease";
import { useMotionPref } from "@/lib/hooks/useMotionPref";

const CELL = 72;

// Grid lines that carry a travelling pulse: offset in cells from the centre,
// lap duration and start delay. Fixed so every visit looks the same.
const V_PULSES = [
  { at: -7, dur: 7, delay: 0.4 },
  { at: -3, dur: 9, delay: 3.2 },
  { at: 2, dur: 8, delay: 1.6 },
  { at: 6, dur: 10, delay: 5 },
] as const;
const H_PULSES = [
  { at: -4, dur: 11, delay: 2.4 },
  { at: 3, dur: 9, delay: 6 },
] as const;

const line = (pct: number) => `color-mix(in srgb, var(--text-primary) ${pct}%, transparent)`;
const fade = "radial-gradient(ellipse 75% 70% at 50% 50%, black 25%, transparent 80%)";

/** Auth backdrop: a precise line grid that fades toward the edges, a few
 * light pulses travelling along its lines. No blurred glows — every light is a 1px line. */
export default function AuthBackdrop() {
  const { reduced } = useMotionPref();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING_MOUSE);
  const sy = useSpring(py, SPRING_MOUSE);
  const gx = useTransform(sx, (v) => v * -14);
  const gy = useTransform(sy, (v) => v * -14);

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
      <motion.div
        className="absolute -inset-16"
        style={{ x: gx, y: gy, maskImage: fade, WebkitMaskImage: fade }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${line(7)} 1px, transparent 1px), linear-gradient(90deg, ${line(7)} 1px, transparent 1px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
            backgroundPosition: `calc(50% + ${CELL / 2}px) calc(50% + ${CELL / 2}px)`,  // puts a line exactly on the centre
          }}
        />
        {/* Intersections */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, ${line(22)} 1.2px, transparent 1.6px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
            backgroundPosition: "center center",
          }}
        />

        {!reduced && (
          <>
            {V_PULSES.map((p) => (
              <div key={`v${p.at}`} className="absolute inset-y-0 w-px overflow-hidden" style={{ left: `calc(50% + ${p.at * CELL}px)` }}>
                <motion.div
                  className="h-40 w-px"
                  style={{ background: "linear-gradient(to bottom, transparent, var(--accent-primary))" }}
                  initial={{ y: "-10rem" }}
                  animate={{ y: "110vh" }}
                  transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, repeatDelay: 2, ease: "linear" }}
                />
              </div>
            ))}
            {H_PULSES.map((p) => (
              <div key={`h${p.at}`} className="absolute inset-x-0 h-px overflow-hidden" style={{ top: `calc(50% + ${p.at * CELL}px)` }}>
                <motion.div
                  className="h-px w-56"
                  style={{ background: "linear-gradient(to right, transparent, var(--accent-secondary, var(--accent-primary)))" }}
                  initial={{ x: "-14rem" }}
                  animate={{ x: "110vw" }}
                  transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
                />
              </div>
            ))}
          </>
        )}
      </motion.div>

      {/* Edge falloff into the page colour */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, var(--bg-main), transparent 18%, transparent 82%, var(--bg-main))" }}
      />
    </motion.div>
  );
}
