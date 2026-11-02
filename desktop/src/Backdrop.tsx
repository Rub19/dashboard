import { useEffect, type CSSProperties } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { SPRING_MOUSE } from "./motion";

const PARTICLES: [number, number, number, number, number, number, number][] = [
  [12, 68, 1.5, 0.18, 22, 0, 8], [24, 34, 1, 0.14, 26, 6, -6], [37, 82, 1, 0.16, 24, 12, 10],
  [55, 18, 1.5, 0.14, 28, 4, -8], [66, 58, 1, 0.18, 23, 9, 6], [78, 28, 1, 0.14, 27, 15, -10],
  [88, 74, 1.5, 0.16, 25, 3, 8], [46, 52, 1, 0.12, 30, 18, -6],
  [6, 24, 1, 0.12, 27, 7, 6], [31, 92, 1.5, 0.14, 24, 13, -8], [72, 12, 1, 0.12, 29, 2, 10], [94, 46, 1, 0.14, 26, 16, -6],
];

export default function Backdrop() {
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useTransform(useSpring(px, SPRING_MOUSE), (value) => value * -24);
  const y = useTransform(useSpring(py, SPRING_MOUSE), (value) => value * -18);

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      px.set(event.clientX / window.innerWidth - 0.5);
      py.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, px, py]);

  return (
    <motion.div aria-hidden="true" className="backdrop" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, ease: "easeOut" }}>
      <motion.div className="backdrop-layer" style={{ x, y }}>
        <div className="auth-field" />
      </motion.div>
      {!reduced &&
        PARTICLES.map(([left, top, size, opacity, duration, delay, drift], index) => (
          <span
            key={index}
            className="auth-particle"
            style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, "--o": opacity, "--dx": `${drift}px`, animationDuration: `${duration}s`, animationDelay: `-${delay}s` } as CSSProperties}
          />
        ))}
      <div className="backdrop-vignette" />
    </motion.div>
  );
}
