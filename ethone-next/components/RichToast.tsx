"use client";

import { motion } from "framer-motion";

export type RichToastVariant = "success" | "error" | "info" | "warning" | "neutral";

type RichToastProps = {
  icon: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant?: RichToastVariant;
  className?: string;
};

const variantIcon: Record<RichToastVariant, string> = {
  success: "text-emerald-400",
  error: "text-rose-400",
  warning: "text-amber-400",
  info: "text-cyan-400",
  neutral: "text-zinc-200",
};

export default function RichToast({
  icon,
  title,
  description,
  variant = "neutral",
  className,
}: RichToastProps) {
  return (
    <div className={`flex w-full items-start gap-3 ${className || ""}`}>
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.05] ${variantIcon[variant]}`}
      >
        {icon}
      </motion.span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold leading-tight text-white">{title}</p>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
