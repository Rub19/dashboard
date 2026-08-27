"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type RichToastVariant = "success" | "error" | "info" | "warning" | "neutral" | "version" | "ai";

type RichToastAction = {
  label: string;
  onClick: () => void;
};

type RichToastProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: RichToastVariant;
  action?: RichToastAction;
  duration?: number;
  className?: string;
  badge?: string;
};

const VARIANT_CONFIG: Record<
  RichToastVariant,
  {
    iconBox: string;
    glow: string;
    titleColor: string;
    dotBg: string;
    progressBar: string;
    badgeBg: string;
    badgeText: string;
    defaultBadge: string;
  }
> = {
  success: {
    iconBox: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)]",
    glow: "shadow-[0_4px_24px_rgba(16,185,129,0.15)]",
    titleColor: "text-emerald-300",
    dotBg: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    progressBar: "from-emerald-500 via-teal-400 to-green-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30",
    badgeText: "text-emerald-300",
    defaultBadge: "SUCCÈS",
  },
  error: {
    iconBox: "text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-[0_0_16px_rgba(244,63,94,0.2)]",
    glow: "shadow-[0_4px_24px_rgba(244,63,94,0.15)]",
    titleColor: "text-rose-300",
    dotBg: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
    progressBar: "from-rose-500 via-red-500 to-amber-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
    badgeBg: "bg-rose-500/15 border-rose-500/30",
    badgeText: "text-rose-300",
    defaultBadge: "ERREUR",
  },
  warning: {
    iconBox: "text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.2)]",
    glow: "shadow-[0_4px_24px_rgba(245,158,11,0.15)]",
    titleColor: "text-amber-300",
    dotBg: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
    progressBar: "from-amber-500 via-orange-400 to-yellow-300 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
    badgeBg: "bg-amber-500/15 border-amber-500/30",
    badgeText: "text-amber-300",
    defaultBadge: "ALERTE",
  },
  info: {
    iconBox: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_16px_rgba(6,182,212,0.2)]",
    glow: "shadow-[0_4px_24px_rgba(6,182,212,0.15)]",
    titleColor: "text-cyan-300",
    dotBg: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
    progressBar: "from-cyan-500 via-sky-400 to-blue-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
    badgeBg: "bg-cyan-500/15 border-cyan-500/30",
    badgeText: "text-cyan-300",
    defaultBadge: "INFO",
  },
  version: {
    iconBox: "text-emerald-400 border-emerald-500/40 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
    glow: "shadow-[0_4px_28px_rgba(16,185,129,0.2)]",
    titleColor: "text-white font-bold",
    dotBg: "bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,1)]",
    progressBar: "from-emerald-400 via-teal-300 to-cyan-400 shadow-[0_0_10px_rgba(16,185,129,0.8)]",
    badgeBg: "bg-emerald-500/20 border-emerald-500/40",
    badgeText: "text-emerald-300",
    defaultBadge: "SYSTÈME",
  },
  ai: {
    iconBox: "text-purple-400 border-purple-500/30 bg-purple-500/10 shadow-[0_0_16px_rgba(168,85,247,0.2)]",
    glow: "shadow-[0_4px_24px_rgba(168,85,247,0.15)]",
    titleColor: "text-purple-300",
    dotBg: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
    progressBar: "from-purple-500 via-fuchsia-400 to-pink-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
    badgeBg: "bg-purple-500/15 border-purple-500/30",
    badgeText: "text-purple-300",
    defaultBadge: "BRAIN AI",
  },
  neutral: {
    iconBox: "text-zinc-300 border-white/10 bg-white/5",
    glow: "shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
    titleColor: "text-[var(--text-primary)]",
    dotBg: "bg-[var(--text-muted)]",
    progressBar: "from-[var(--accent-primary)] to-emerald-400",
    badgeBg: "bg-white/10 border-white/15",
    badgeText: "text-zinc-300",
    defaultBadge: "NOTIFICATION",
  },
};

export default function RichToast({
  icon,
  title,
  description,
  variant = "neutral",
  action,
  duration,
  className,
  badge,
}: RichToastProps) {
  const [playState, setPlayState] = useState<"running" | "paused">("running");
  const showProgress = typeof duration === "number" && duration > 0 && duration !== Infinity;
  const cfg = VARIANT_CONFIG[variant] || VARIANT_CONFIG.neutral;
  const displayBadge = badge || cfg.defaultBadge;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0d14]/95 p-3.5 backdrop-blur-2xl transition-all select-none",
        cfg.glow,
        className
      )}
      onMouseEnter={() => setPlayState("paused")}
      onMouseLeave={() => setPlayState("running")}
    >
      <div className="flex w-full items-start gap-3">
        {/* Animated Icon Box */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all",
            cfg.iconBox
          )}
        >
          {icon}
        </motion.div>

        {/* Text Content */}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="relative flex h-2 w-2">
                <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", cfg.dotBg)} />
                <span className={cn("relative inline-flex h-2 w-2 rounded-full", cfg.dotBg)} />
              </span>
              <p className={cn("text-xs font-bold leading-tight truncate", cfg.titleColor)}>
                {title}
              </p>
            </div>

            {displayBadge && (
              <span
                className={cn(
                  "shrink-0 rounded-md border px-1.5 py-0.2 font-mono text-[9px] font-bold tracking-wider uppercase",
                  cfg.badgeBg,
                  cfg.badgeText
                )}
              >
                {displayBadge}
              </span>
            )}
          </div>

          {description ? (
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400 line-clamp-2">
              {description}
            </p>
          ) : null}

          {action ? (
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={action.onClick}
                className="cursor-pointer rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white transition-all hover:bg-white/20 hover:scale-105 active:scale-95 shadow-xs focus:outline-none"
              >
                {action.label}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Laser Gradient Progress Bar */}
      {showProgress && (
        <div className="relative mt-3 h-[2px] w-full overflow-hidden rounded-full bg-white/5">
          <div
            className={cn("toast-progress h-full w-full origin-left rounded-full bg-gradient-to-r", cfg.progressBar)}
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState: playState,
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
