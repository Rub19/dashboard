"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { hapticSelectionTick } from "@/lib/haptics";

export interface SettingsSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export default function SettingsSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  onChange,
  disabled = false,
  className,
}: SettingsSliderProps) {
  const [localVal, setLocalVal] = useState(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(e.target.value);
    setLocalVal(next);
    hapticSelectionTick();
    onChange(next);
  };

  const percentage = Math.max(0, Math.min(100, ((localVal - min) / (max - min)) * 100));

  return (
    <div className={cn("flex items-center gap-3 w-full sm:w-64", className)}>
      <div className="relative flex-1 flex items-center h-6">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localVal}
          disabled={disabled}
          onChange={handleChange}
          className="h-2 w-full appearance-none rounded-lg bg-[var(--surface-sunken)] outline-none cursor-pointer accent-[var(--accent-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
          style={{
            background: `linear-gradient(to right, var(--accent-primary) 0%, var(--accent-primary) ${percentage}%, var(--surface-sunken) ${percentage}%, var(--surface-sunken) 100%)`,
          }}
        />
      </div>
      <span className="w-12 text-right font-mono text-xs font-medium text-[var(--text-secondary)]">
        {localVal}
        {unit}
      </span>
    </div>
  );
}
