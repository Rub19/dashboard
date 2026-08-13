"use client";

import { useId } from "react";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
};

export default function Switch({ checked, onChange, label, id, disabled }: SwitchProps) {
  const generatedId = useId();
  const switchId = id || generatedId;

  return (
    <label
      htmlFor={switchId}
      className={`inline-flex cursor-pointer items-center gap-3 ${disabled ? "opacity-50" : ""}`}
    >
      {label && <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
          checked ? "bg-[var(--accent)]" : "bg-[var(--border)]"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
