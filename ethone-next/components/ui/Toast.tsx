"use client";

import { useMemo } from "react";
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import EthoneGlyph from "@/components/icons/EthoneGlyph";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

const MAX_DEPTH = 4;

const CONFIG: Record<
  ToastType,
  {
    icon: React.ReactNode;
    dot: string;
    border: string;
    text: string;
    progress: string;
  }
> = {
  success: {
    icon: <EthoneGlyph name="check" className="h-4 w-4 text-[var(--success)]" />,
    dot: "bg-[var(--success)] shadow-[0_0_6px_var(--success)]",
    border: "border-[var(--success)]/30",
    text: "text-[var(--success)]",
    progress: "bg-[var(--success)]",
  },
  error: {
    icon: <EthoneGlyph name="alert" className="h-4 w-4 text-[var(--danger)]" />,
    dot: "bg-[var(--danger)] shadow-[0_0_6px_var(--danger)]",
    border: "border-[var(--danger)]/30",
    text: "text-[var(--danger)]",
    progress: "bg-[var(--danger)]",
  },
  info: {
    icon: <EthoneGlyph name="update" className="h-4 w-4 text-[var(--info)]" />,
    dot: "bg-[var(--info)] shadow-[0_0_6px_var(--info)]",
    border: "border-[var(--info)]/30",
    text: "text-[var(--info)]",
    progress: "bg-[var(--info)]",
  },
  warning: {
    icon: <EthoneGlyph name="alert" className="h-4 w-4 text-[var(--warning)]" />,
    dot: "bg-[var(--warning)] shadow-[0_0_6px_var(--warning)]",
    border: "border-[var(--warning)]/30",
    text: "text-[var(--warning)]",
    progress: "bg-[var(--warning)]",
  },
  loading: {
    icon: <EthoneGlyph name="refresh" className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />,
    dot: "bg-[var(--accent-primary)] shadow-[0_0_6px_var(--accent-primary)]",
    border: "border-[var(--accent-primary)]/30",
    text: "text-[var(--accent-primary)]",
    progress: "bg-[var(--accent-primary)]",
  },
};

export default function Toast({
  toast,
  depth,
  onRemove,
}: {
  toast: ToastData;
  depth: number;
  onRemove: () => void;
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-120, 0, 120], [0.25, 1, 0.25]);

  const config = CONFIG[toast.type];
  const clampedDepth = Math.min(depth, MAX_DEPTH);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 80) onRemove();
  };

  const { scale, y, targetOpacity } = useMemo(
    () => ({
      scale: 1 - clampedDepth * 0.04,
      y: -clampedDepth * 6,
      targetOpacity: 1 - clampedDepth * 0.1,
    }),
    [clampedDepth]
  );

  return (
    <motion.div
      layout={false}
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{
        opacity: targetOpacity,
        y,
        scale,
      }}
      exit={{ opacity: 0, y: -5, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, opacity, zIndex: 50 - depth }}
      className={`relative pointer-events-auto w-full min-w-0 overflow-hidden rounded-xl border bg-[var(--panel-bg)]/85 p-3.5 shadow-2xl shadow-[var(--background)]/80 backdrop-blur-xl md:min-w-[300px] md:max-w-md ${config.border} flex items-center gap-3 text-sm`}
    >
      <span className="shrink-0">{config.icon}</span>
      <span className={`h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
      <p className={`min-w-0 flex-1 truncate ${config.text}`}>{toast.message}</p>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-[var(--text-muted)] opacity-70 transition-all hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] hover:opacity-100"
        aria-label="Fermer"
      >
        <EthoneGlyph name="close" className="h-4 w-4" />
      </button>

      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-primary)]/10">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: toast.duration / 1000, ease: "linear" }}
            className={`h-full ${config.progress}`}
          />
        </div>
      )}
    </motion.div>
  );
}
