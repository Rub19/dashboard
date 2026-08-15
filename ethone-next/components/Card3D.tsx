"use client";

import { useRef, type ReactNode, type MouseEvent, type CSSProperties } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useSettings } from "./SettingsProvider";

export default function Card3D({
  children,
  tilt = false,
  bump = false,
  className = "",
  style,
  radius,
}: {
  children: ReactNode;
  tilt?: boolean;
  bump?: boolean;
  className?: string;
  style?: CSSProperties;
  radius?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-8, 8]), { stiffness: 300, damping: 30 });

  const interactive = bump;

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!interactive || !tilt || !settings.cardTilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    x.set(px);
    y.set(py);
    if (ref.current) {
      ref.current.style.setProperty("--v8-tilt-x", `${(px - 0.5) * 8}deg`);
      ref.current.style.setProperty("--v8-tilt-y", `${(py - 0.5) * -8}deg`);
      ref.current.style.setProperty("--v8-spotlight-x", `${px * 100}%`);
      ref.current.style.setProperty("--v8-spotlight-y", `${py * 100}%`);
    }
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
    if (ref.current) {
      ref.current.style.setProperty("--v8-tilt-x", "0deg");
      ref.current.style.setProperty("--v8-tilt-y", "0deg");
      ref.current.style.setProperty("--v8-spotlight-x", "50%");
      ref.current.style.setProperty("--v8-spotlight-y", "50%");
    }
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={interactive ? { scale: 1.015 } : undefined}
      whileTap={interactive ? { scale: 0.985 } : undefined}
      transition={interactive ? { type: "spring", stiffness: 400, damping: 25 } : undefined}
      className={`v8-depth-active min-w-0 overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--accent)]/30 hover:bg-white/[0.02] ${className}`}
      data-card-style={settings.glassEnabled ? "glass" : "solid"}
      style={{
        rotateX: interactive && tilt && settings.cardTilt ? rotateX : 0,
        rotateY: interactive && tilt && settings.cardTilt ? rotateY : 0,
        transformStyle: "preserve-3d",
        perspective: 1000,
        borderRadius: radius || "var(--card-radius)",
        willChange: interactive ? "transform" : "auto",
        backfaceVisibility: "hidden",
        boxShadow: settings.shadow === "glow" ? "var(--shadow)" : settings.shadow === "md" ? "0 4px 20px -4px rgba(0,0,0,0.3)" : settings.shadow === "sm" ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background: "radial-gradient(circle at var(--v8-spotlight-x, 50%) var(--v8-spotlight-y, 50%), color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%)",
        }}
        aria-hidden="true"
      />
      <div
        className="relative z-10"
        style={{ transform: interactive && tilt && settings.cardTilt ? "translateZ(30px)" : "none" }}
      >
        {children}
      </div>
    </motion.div>
  );
}
