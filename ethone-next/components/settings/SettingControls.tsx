"use client";

import { Icon } from "@/lib/icons";
import Switch from "@/components/Switch";
import Select from "@/components/ui/Select";
import Slider from "@/components/ui/Slider";

export function SwitchControl({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <Switch checked={checked} onChange={onChange} labels={false} size="md" />;
}

export function RangeControl({
  value,
  onChange,
  min = 0,
  max = 100,
  unit = "%",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}) {
  return <Slider value={value} onChange={onChange} min={min} max={max} unit={unit} className="w-full" />;
}

export function ButtonGridControl<T extends string>({
  value,
  onChange,
  options,
  cols = 3,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  cols?: number;
}) {
  const gridClass =
    cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : cols === 5 ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-3";
  return (
    <div className={`grid ${gridClass} gap-1.5`}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`group relative flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-medium transition-all ${
              active
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--foreground)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface)]"
            }`}
          >
            {active && <Icon name="check" className="h-3 w-3" />}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function CheckboxListControl({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const checked = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              const next = checked ? value.filter((id) => id !== opt.id) : [...value, opt.id];
              onChange(next);
            }}
            className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
              checked
                ? "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--foreground)]"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)] hover:border-[var(--accent)]/30 hover:text-[var(--foreground)]"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              {checked && <Icon name="check" className="h-3 w-3 text-white" />}
            </span>
            <span className="min-w-0 flex-1 truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ColorControl({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
    />
  );
}

export function SelectControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <Select
      value={value}
      onChange={(v) => onChange(v as T)}
      options={options as { id: string; label: string }[]}
      className="min-w-[8rem]"
    />
  );
}

export function TextControl({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
    />
  );
}
