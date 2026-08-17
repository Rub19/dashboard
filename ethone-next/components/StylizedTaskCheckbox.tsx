"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function StylizedTaskCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  const [impact, setImpact] = useState(false);

  useEffect(() => {
    if (!checked) {
      setImpact(false);
      return;
    }
    setImpact(true);
    const t = window.setTimeout(() => setImpact(false), 350);
    return () => window.clearTimeout(t);
  }, [checked]);

  function handleToggle(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    onChange();
  }

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={handleToggle}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          onChange();
        }
      }}
      whileTap={{ scale: 0.9 }}
      animate={checked ? { scale: [0.85, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative flex h-5 w-5 shrink-0 cursor-pointer select-none items-center justify-center overflow-hidden rounded-lg border text-zinc-950 transition-all duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
        checked
          ? "border-emerald-400 bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.4)]"
          : "border-zinc-300/60 bg-zinc-100/80 hover:border-emerald-400/60 hover:bg-emerald-500/10 dark:border-white/20 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
      }`}
    >
      <AnimatePresence>
        {impact && (
          <motion.span
            key="impact"
            initial={{ opacity: 0.5, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-lg border border-emerald-400/60"
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {checked && (
          <motion.svg
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            viewBox="0 0 24 24"
            className="relative z-10 h-3.5 w-3.5 stroke-[3.5] text-zinc-950 dark:text-zinc-950"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M20 6L9 17l-5-5"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
