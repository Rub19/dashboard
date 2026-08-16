"use client";

import { motion } from "framer-motion";

export type CustomCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
};

export default function CustomCheckbox({ checked, onChange, label, className = "" }: CustomCheckboxProps) {
  return (
    <label className={`inline-flex cursor-pointer select-none items-center ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={onChange}
        className="relative flex h-4 w-4 items-center justify-center rounded-md border transition-all"
        style={
          checked
            ? {
                background: "var(--accent-color, #10b981)",
                borderColor: "var(--accent-color, #10b981)",
                boxShadow: "0 0 10px var(--accent-glow, rgba(16,185,129,0.35))",
              }
            : undefined
        }
      >
        <span
          className={`absolute inset-0 rounded-md transition-all ${
            checked ? "bg-transparent" : "border border-white/20 bg-white/[0.04] hover:border-white/40"
          }`}
        />
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="relative z-10 h-3 w-3 stroke-[3] text-zinc-950"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              d="M5 13l4 4L19 7"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            />
          </motion.svg>
        )}
      </button>
      {label && <span className="ml-2.5 text-xs font-medium text-zinc-300">{label}</span>}
    </label>
  );
}
