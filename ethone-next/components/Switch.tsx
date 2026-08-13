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
      className={`inline-flex cursor-pointer items-center gap-3 select-none ${disabled ? "opacity-50" : ""}`}
    >
      {label && <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>}
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] ${
          checked
            ? "border-[var(--accent)] bg-[var(--accent)]"
            : "border-[var(--border)] bg-[var(--surface-raised)]"
        }`}
      >
        <span
          className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-md transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
