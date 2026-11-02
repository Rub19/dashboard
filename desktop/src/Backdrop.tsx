import { useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { SPRING_MOUSE } from "./motion";

export default function Backdrop() {
  const reduced = useReducedMotion();
  const x = useSpring(useMotionValue(50), SPRING_MOUSE);
  const y = useSpring(useMotionValue(0), SPRING_MOUSE);
  const transform = useMotionTemplate`translate3d(${x}px, ${y}px, 0)`;

  useEffect(() => {
    if (reduced) return;
    const onMove = (event: PointerEvent) => {
      x.set((event.clientX / window.innerWidth - 0.5) * 36);
      y.set((event.clientY / window.innerHeight - 0.5) * 26);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, x, y]);

  return (
    <div aria-hidden="true" className="backdrop">
      <motion.div className="backdrop-light" style={{ transform }} />
    </div>
  );
}
