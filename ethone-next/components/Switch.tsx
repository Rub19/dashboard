"use client";

import { useId } from "react";
import { triggerHaptic } from "@/lib/haptics";

type SwitchSize = "sm" | "md" | "lg";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
  id?: string;
  disabled?: boolean;
  labels?: boolean;
  size?: SwitchSize;
};

const sizeClasses: Record<SwitchSize, { track: string; thumb: string; thumbSize: string; translate: string }> = {
  sm: { track: "h-5 w-9", thumb: "h-4 w-4", thumbSize: "h-4 w-4", translate: "translate-x-4" },
  md: { track: "h-6 w-11", thumb: "h-[18px] w-[18px]", thumbSize: "h-[18px] w-[18px]", translate: "translate-x-5" },
  lg: { track: "h-7 w-[52px]", thumb: "h-5 w-5", thumbSize: "h-5 w-5", translate: "translate-x-6" },
};

export default function Switch({
  checked,
  onChange,
  label,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  id,
  disabled,
  labels,
  size = "md",
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id || generatedId;
  const classes = sizeClasses[size] || sizeClasses.md;

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex min-h-[44px] cursor-pointer items-center gap-3 select-none ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      {label && <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-disabled={disabled}
        disabled={disabled}
        data-state={checked ? "checked" : "unchecked"}
        onClick={() => { triggerHaptic("light"); onChange(!checked); }}
        className={`relative flex min-h-[44px] min-w-[44px] items-center rounded-full border border-[var(--border)] bg-[var(--surface-raised)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] data-[state=checked]:border-[var(--accent-primary)] data-[state=checked]:bg-[var(--accent-primary)] ${classes.track}`}
      >
        <span
          className={`absolute left-[3px] top-1/2 -translate-y-1/2 rounded-full bg-[var(--text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            checked ? `${classes.translate} -translate-y-1/2` : "-translate-y-1/2"
          } ${classes.thumb}`}
        />
      </button>
      {labels && (
        <span className="text-sm text-[var(--text-primary)]">{checked ? "On" : "Off"}</span>
      )}
    </label>
  );
}
