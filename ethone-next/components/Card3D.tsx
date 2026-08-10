"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useSettings } from "./SettingsProvider";

export default function Card3D({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-8, 8]), { stiffness: 300, damping: 30 });

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!settings.cardTilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    x.set(px);
    y.set(py);
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="min-w-0 overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]/30"
      data-card-style={settings.glassEnabled ? "glass" : "solid"}
      style={{
        rotateX: settings.cardTilt ? rotateX : 0,
        rotateY: settings.cardTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 1000,
        borderRadius: "var(--card-radius)",
        boxShadow: settings.shadow === "glow" ? "var(--shadow)" : settings.shadow === "md" ? "0 4px 20px -4px rgba(0,0,0,0.3)" : settings.shadow === "sm" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
      }}
    >
      {children}
    </motion.div>
  );
}
