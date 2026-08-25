"use client";

import { motion } from "framer-motion";
import BrandMark from "./BrandMark";

export default function Loading({
  message = "Initialisation",
  progress,
}: {
  message?: string;
  progress?: number;
}) {
  const hasProgress = typeof progress === "number";
  const pct = hasProgress ? Math.min(100, Math.max(0, Math.round(progress))) : 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[var(--background)]"
      role="status"
      aria-label={message}
      data-v8-boot
    >
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" as const }}
      >
        <BrandMark size={72} />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">ETHONE</span>
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            OS
          </span>
        </div>
      </motion.div>

      <motion.div
        className="h-1 w-48 overflow-hidden rounded-full bg-[var(--surface-raised)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {hasProgress ? (
          <div className="relative h-full w-full">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent)]"
              initial={{ width: "0%" }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.12, ease: "linear" }}
            />
            {pct < 100 && (
              <motion.div
                className="pointer-events-none absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              />
            )}
          </div>
        ) : (
          <motion.div
            className="h-full w-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        )}
      </motion.div>

      {hasProgress && (
        <motion.span
          className="font-mono text-xs font-medium tabular-nums text-[var(--muted)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {pct}%
        </motion.span>
      )}

      <motion.p
        className="text-sm text-[var(--muted)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>
    </div>
  );
}
