"use client";

import { motion } from "framer-motion";

export default function StylizedTaskCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      aria-label={ariaLabel}
      aria-checked={checked}
      role="checkbox"
      className="relative flex h-5 w-5 shrink-0 cursor-pointer select-none items-center justify-center rounded-lg border transition-all duration-200"
      style={
        checked
          ? {
              background: "var(--accent-color, #10b981)",
              borderColor: "var(--accent-color, #10b981)",
              boxShadow: "0 0 12px var(--accent-glow, rgba(16,185,129,0.35))",
            }
          : undefined
      }
      onMouseDown={(e) => e.stopPropagation()}
    >
      {checked && (
        <motion.svg
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 stroke-[3.5] text-zinc-950"
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
    </button>
  );
}
