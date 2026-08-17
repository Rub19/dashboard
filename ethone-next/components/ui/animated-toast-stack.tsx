"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface AnimatedToastData {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration: number;
}

type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left";

type ToastPlacement = "fixed" | "absolute";

interface AnimatedToastStackProps {
  toasts: AnimatedToastData[];
  onRemove: (id: string) => void;
  position?: ToastPosition;
  placement?: ToastPlacement;
  maxVisible?: number;
}

const CONFIG: Record<
  ToastType,
  {
    icon: React.ReactNode;
    badge: string;
    progress: string;
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    badge: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20",
    progress: "bg-emerald-400",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    badge: "text-rose-400 bg-rose-500/15 border-rose-500/20",
    progress: "bg-rose-400",
  },
  info: {
    icon: <Info className="h-4 w-4" />,
    badge: "text-cyan-400 bg-cyan-500/15 border-cyan-500/20",
    progress: "bg-cyan-400",
  },
  warning: {
    icon: <AlertTriangle className="h-4 w-4" />,
    badge: "text-amber-400 bg-amber-500/15 border-amber-500/20",
    progress: "bg-amber-400",
  },
  loading: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    badge: "text-purple-400 bg-purple-500/15 border-purple-500/20",
    progress: "bg-purple-400",
  },
};

function positionClasses(position: ToastPosition) {
  switch (position) {
    case "top-left":
      return "top-5 left-5 items-start";
    case "bottom-left":
      return "bottom-5 left-5 items-start";
    case "bottom-right":
      return "bottom-5 right-5 items-end";
    case "top-right":
    default:
      return "top-5 right-5 items-end";
  }
}

export function AnimatedToastStack({
  toasts,
  onRemove,
  position = "top-right",
  placement = "fixed",
  maxVisible = 4,
}: AnimatedToastStackProps) {
  const visible = useMemo(
    () => toasts.slice(0, Math.max(1, maxVisible)),
    [toasts, maxVisible]
  );

  return (
    <div
      className={`${placement} ${positionClasses(
        position
      )} z-[100] flex w-[min(28rem,calc(100vw-2.5rem))] flex-col gap-3 p-5 max-md:left-4 max-md:right-4 max-md:top-4 max-md:w-auto max-md:items-stretch max-md:p-0`}
      aria-live="polite"
      aria-atomic="true"
    >
      <AnimatePresence mode="popLayout">
        {visible.map((toast, index) => (
          <AnimatedToastItem
            key={toast.id}
            toast={toast}
            index={index}
            onRemove={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function AnimatedToastItem({
  toast,
  index,
  onRemove,
}: {
  toast: AnimatedToastData;
  index: number;
  onRemove: () => void;
}) {
  const config = CONFIG[toast.type];
  const depth = Math.min(index, 3);
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (toast.duration <= 0) {
      setProgress(100);
      return;
    }

    startRef.current = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - (startRef.current ?? now);
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(pct);
      if (pct > 0) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [toast.duration, toast.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1 - depth * 0.04,
      }}
      exit={{ opacity: 0, y: -10, scale: 0.92 }}
      transition={{ duration: 0.25, ease: EASE_OUT }}
      style={{ zIndex: 50 - depth }}
      className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/90 p-3.5 text-white shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl md:min-w-[300px] md:max-w-md"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${config.badge}`}
        >
          {config.icon}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-zinc-100">{toast.title}</p>
          {toast.description && (
            <p className="mt-0.5 text-xs text-zinc-400">{toast.description}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-100"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0 }}
            className={`h-full ${config.progress}`}
          />
        </div>
      )}
    </motion.div>
  );
}

export default AnimatedToastStack;
