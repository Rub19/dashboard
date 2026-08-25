"use client";

import { useId } from "react";
import Switch from "@/components/Switch";
import Select from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import Slider from "@/components/ui/Slider";
import { cn } from "@/lib/utils";
import Input from "@/components/Input";

type AriaProps = {
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export function SwitchControl({
  checked,
  onChange,
  ...aria
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
} & AriaProps) {
  return <Switch checked={checked} onChange={onChange} labels={false} size="md" {...aria} />;
}

export function RangeControl({
  value,
  onChange,
  min = 0,
  max = 100,
  unit = "%",
  ...aria
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
} & AriaProps) {
  return (
    <Slider
      value={value}
      onChange={onChange}
      min={min}
      max={max}
      unit={unit}
      className="w-40 sm:w-48"
      aria-label={aria["aria-label"]}
    />
  );
}

export function ButtonGridControl<T extends string>({
  value,
  onChange,
  options,
  cols = 3,
  ...aria
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  cols?: number;
} & AriaProps) {
  const id = useId();
  const groupId = `${id}-group`;

  // Small option sets become a compact segmented control row.
  if (options.length <= 4) {
    return (
      <div
        id={groupId}
        data-testid="button-grid"
        role="group"
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        className="flex min-h-[44px] items-stretch rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)]/[0.5] p-0.5 backdrop-blur-[var(--panel-blur)]"
      >
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`button-grid-option-${opt.id}`}
              onClick={() => onChange(opt.id)}
              aria-pressed={active}
              className={cn(
                "relative flex-1 min-w-0 select-none rounded-[calc(var(--panel-radius)-2px)] px-2.5 py-1.5 text-[11px] font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] min-h-[40px]",
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
    <div
      id={groupId}
      role="group"
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
      className={`grid ${gridClass} gap-1`}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            data-testid={`button-grid-option-${opt.id}`}
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            className={cn(
              "group relative flex min-h-[44px] items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
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
  ...aria
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: { id: string; label: string }[];
} & AriaProps) {
  const id = useId();
  return (
    <div
      role="group"
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      id={id}
    >
      {options.map((opt) => (
        <Checkbox
          key={opt.id}
          checked={value.includes(opt.id)}
          onCheckedChange={(checked) => {
            const next = checked ? [...value, opt.id] : value.filter((id) => id !== opt.id);
            onChange(next);
          }}
          label={opt.label}
          className="min-h-[44px] min-w-0 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 backdrop-blur-[var(--panel-blur)]"
        />
      ))}
    </div>
  );
}

export function ColorControl({
  value,
  onChange,
  ...aria
}: {
  value: string;
  onChange: (v: string) => void;
} & AriaProps) {
  return (
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 min-h-[44px] w-12 min-w-[44px] cursor-pointer rounded border-0 bg-transparent p-0"
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
    />
  );
}

export function SelectControl<T extends string>({
  value,
  onChange,
  options,
  ...aria
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
} & AriaProps) {
  return (
    <Select
      value={value}
      onChange={(v) => onChange(v as T)}
      options={options as { id: string; label: string }[]}
      className="min-w-[8rem]"
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
    />
  );
}

export function TextControl({
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  ...aria
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
} & AriaProps) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputSize="compact"
      className="w-full min-w-0 sm:w-56"
      aria-label={aria["aria-label"]}
      aria-describedby={aria["aria-describedby"]}
    />
  );
}
