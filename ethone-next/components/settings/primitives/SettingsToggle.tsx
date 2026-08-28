"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hapticLightImpact } from "@/lib/haptics";

export interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

export default function SettingsToggle({
  checked,
  onChange,
  disabled = false,
  id,
  ariaLabel,
  className,
}: SettingsToggleProps) {
  const handleClick = () => {
    if (disabled) return;
    hapticLightImpact();
    onChange(!checked);
  };

  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200 outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-deep)]",
        checked
          ? "bg-[var(--accent-primary)] shadow-[0_0_12px_-2px_var(--glow-color)]"
          : "bg-[var(--surface-sunken)] hover:bg-[var(--surface-hover)] border border-[var(--panel-border)]/60",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full shadow-sm transition-transform",
          checked
            ? "translate-x-5 bg-white"
            : "translate-x-0 bg-[var(--text-secondary)]"
        )}
      />
    </button>
  );
}
