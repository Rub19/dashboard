"use client";

import { useMemo } from "react";
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, Loader2, AlertTriangle, X } from "lucide-react";

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
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
    border: "border-emerald-500/30",
    progress: "bg-emerald-400/50",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4 text-red-400" />,
    border: "border-red-500/30",
    progress: "bg-red-400/50",
  },
  info: {
    icon: <Info className="h-4 w-4 text-cyan-400" />,
    border: "border-cyan-500/30",
    progress: "bg-cyan-400/50",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
    border: "border-amber-500/30",
    progress: "bg-amber-400/50",
  },
  loading: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-purple-400" />,
    border: "border-purple-500/30",
    progress: "bg-purple-400/50",
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
      transition={{ duration: 0.15, ease: "easeOut" }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ x, opacity, zIndex: 50 - depth }}
      className={`relative w-full min-w-0 overflow-hidden rounded-xl border bg-zinc-950/85 p-3.5 shadow-2xl shadow-black/80 backdrop-blur-xl md:min-w-[300px] md:max-w-md ${config.border} flex items-center gap-3 text-sm text-zinc-100`}
    >
      <span className="shrink-0">{config.icon}</span>
      <p className="min-w-0 flex-1 truncate">{toast.message}</p>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>

      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
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
