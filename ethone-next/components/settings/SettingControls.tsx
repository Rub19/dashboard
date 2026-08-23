"use client";

import Switch from "@/components/Switch";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import Slider from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import Input from "@/components/Input";

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
  return <Slider value={value} onChange={onChange} min={min} max={max} unit={unit} className="w-40 sm:w-48" />;
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
  // Small option sets become a compact segmented control row.
  if (options.length <= 4) {
    return (
      <div className="flex items-stretch rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.5] p-0.5 backdrop-blur-[var(--panel-blur)]">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "relative flex-1 min-w-0 select-none rounded-[calc(var(--panel-radius)-2px)] px-2.5 py-1.5 text-[11px] font-medium transition-all",
                active
                  ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)] shadow-sm"
                  : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
              )}
            >
              <span className="block truncate text-center">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  const gridClass =
    cols === 2
      ? "grid-cols-2"
      : cols === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : cols === 5
          ? "grid-cols-2 sm:grid-cols-5"
          : "grid-cols-3";

  return (
    <div className={`grid ${gridClass} gap-1`}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "group relative flex items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors duration-150",
              active
                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/50"
            )}
          >
            <span className="relative z-10 truncate">{opt.label}</span>
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
      {options.map((opt) => (
        <Checkbox
          key={opt.id}
          checked={value.includes(opt.id)}
          onCheckedChange={(checked) => {
            const next = checked ? [...value, opt.id] : value.filter((id) => id !== opt.id);
            onChange(next);
          }}
          label={opt.label}
          className="min-w-0 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 backdrop-blur-[var(--panel-blur)]"
        />
      ))}
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
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputSize="compact"
      className="w-56"
    />
  );
}
