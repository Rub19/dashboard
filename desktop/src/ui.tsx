import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, useReducedMotion } from "framer-motion";
import { Minus, Square, X } from "lucide-react";
import { t } from "./i18n";
import { SPRING_PRESS } from "./motion";

export function Button({ variant = "ghost", className = "", ...props }: ComponentProps<typeof motion.button> & { variant?: "ghost" | "primary" }) {
  return <motion.button type="button" whileTap={{ scale: 0.97 }} transition={SPRING_PRESS} className={`btn ${variant === "primary" ? "primary" : ""} ${className}`} {...props} />;
}

export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.5 5h-11v14h11M6.5 12h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WindowControls() {
  const appWindow = getCurrentWindow();
  return (
    <div className="winbtns">
      <button type="button" aria-label={t("minimize")} onClick={() => appWindow.minimize()}><Minus size={14} /></button>
      <button type="button" aria-label={t("maximize")} onClick={() => appWindow.toggleMaximize()}><Square size={11} /></button>
      <button type="button" className="close" aria-label={t("close")} onClick={() => appWindow.close()}><X size={15} /></button>
    </div>
  );
}

export function startDrag(event: React.MouseEvent) {
  if (event.button === 0 && event.target === event.currentTarget) getCurrentWindow().startDragging();
}

export function LightBorder({ children, light = "--accent", speed = 9, className = "", style }: { children: ReactNode; light?: string; speed?: number; className?: string; style?: CSSProperties }) {
  const reduced = useReducedMotion();
  return (
    <div className={`lightborder ${className}`} style={style}>
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="lightborder-ray"
          style={{ background: `conic-gradient(from 0deg, transparent 0deg 290deg, var(${light}) 345deg, transparent 360deg)` }}
          animate={{ rotate: 360 }}
          transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="lightborder-inner">{children}</div>
    </div>
  );
}
