"use client";

import Switch from "@/components/Switch";
import Select from "@/components/ui/Select";

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
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-32 accent-[var(--accent)]"
      />
      <span className="w-10 text-right text-xs text-[var(--muted)]">{value}{unit}</span>
    </div>
  );
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
  const gridClass = cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3";
  return (
    <div className={`grid ${gridClass} gap-2`}>
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors hover:border-[var(--accent)] ${
            value === opt.id ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface-raised)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
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
          <label key={opt.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => {
                const next = e.target.checked ? [...value, opt.id] : value.filter((id) => id !== opt.id);
                onChange(next);
              }}
              className="accent-[var(--accent)]"
            />
            {opt.label}
          </label>
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
