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
    border: string;
    progress: string;
  }
> = {
  success: {
    icon: <EthoneGlyph name="check" className="h-4 w-4 text-[var(--accent-primary)]" />,
    border: "border-[var(--accent-primary)]",
    progress: "bg-[var(--accent-primary)]",
  },
  error: {
    icon: <EthoneGlyph name="alert" className="h-4 w-4 text-[var(--danger)]" />,
    border: "border-[var(--danger)]/30",
    progress: "bg-[var(--danger)]/50",
  },
  info: {
    icon: <EthoneGlyph name="update" className="h-4 w-4 text-[var(--info)]" />,
    border: "border-[var(--info)]/30",
    progress: "bg-[var(--info)]/50",
  },
  warning: {
    icon: <EthoneGlyph name="alert" className="h-4 w-4 text-[var(--warning)]" />,
    border: "border-[var(--warning)]/30",
    progress: "bg-[var(--warning)]/50",
  },
  loading: {
    icon: <EthoneGlyph name="refresh" className="h-4 w-4 animate-spin text-[var(--accent-primary)]" />,
    border: "border-[var(--accent-primary)]/30",
    progress: "bg-[var(--accent-primary)]/50",
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
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{
        opacity: targetOpacity,
        y,
        scale,
      }}
      exit={{ opacity: 0, y: -8, scale: 0.94 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, opacity, zIndex: 50 - depth }}
      className={`relative w-full min-w-0 overflow-hidden rounded-xl border bg-[var(--panel-bg)]/85 p-3.5 shadow-2xl shadow-[var(--background)]/80 backdrop-blur-xl md:min-w-[300px] md:max-w-md ${config.border} flex items-center gap-3 text-sm text-[var(--text-primary)]`}
    >
      <span className="shrink-0">{config.icon}</span>
      <p className="min-w-0 flex-1 truncate">{toast.message}</p>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/6 hover:text-[var(--text-primary)]"
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
