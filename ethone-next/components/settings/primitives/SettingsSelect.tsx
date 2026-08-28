"use client";

import { cn } from "@/lib/utils";
import { hapticSelectionTick } from "@/lib/haptics";

export interface SettingsSelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: string;
}

export interface SettingsSelectProps<T extends string = string> {
  value: T;
  options: SettingsSelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function SettingsSelect<T extends string = string>({
  value,
  options,
  onChange,
  disabled = false,
  className,
  size = "md",
}: SettingsSelectProps<T>) {
  return (
    <div className={cn("relative inline-block", className)}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => {
          hapticSelectionTick();
          onChange(e.target.value as T);
        }}
        className={cn(
          "w-full cursor-pointer appearance-none rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] font-medium transition-all duration-180 outline-none",
          "hover:border-[var(--input-border-hover)] hover:bg-[var(--input-bg-hover)]",
          "focus:border-[var(--accent-primary)] focus:bg-[var(--input-bg-focus)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent)]",
          size === "sm" ? "h-8.5 px-3 pr-8 text-xs" : "h-10 px-3.5 pr-9 text-sm",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-[var(--surface-raised)] text-[var(--text-primary)]"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
