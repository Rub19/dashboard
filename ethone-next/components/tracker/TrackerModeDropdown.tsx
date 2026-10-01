"use client";

import { Check } from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import {
  AnimatedDropdown,
  AnimatedDropdownTrigger,
  AnimatedDropdownTriggerIndicator,
  AnimatedDropdownContent,
  AnimatedDropdownItem,
} from "@/components/ui/AnimatedDropdown";

export interface ModeOption {
  id: string;
  label: string;
  badge?: string;
  icon?: string;
}

interface TrackerModeDropdownProps {
  options: ModeOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  accentColor?: "rose" | "amber" | "cyan";
  className?: string;
}

const accentTextClass: Record<"rose" | "amber" | "cyan", string> = {
  rose: "text-rose-300",
  amber: "text-amber-300",
  cyan: "text-cyan-300",
};

export default function TrackerModeDropdown({
  options,
  selectedId,
  onSelect,
  accentColor = "rose",
  className,
}: TrackerModeDropdownProps) {
  const selected = options.find((o) => o.id === selectedId) || options[0];

  return (
    <AnimatedDropdown>
      <AnimatedDropdownTrigger
        className={cn(
          "flex items-center gap-2 rounded-[var(--panel-radius)] border px-3.5 py-1.5 text-xs font-bold",
          "transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-xl",
          "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-primary)]/90 hover:border-[var(--input-border-hover)] hover:bg-[var(--text-primary)]/[0.08]",
          "data-[popup-open]:border-[var(--input-border-hover)] data-[popup-open]:bg-[var(--text-primary)]/15 data-[popup-open]:text-[var(--text-primary)] data-[popup-open]:ring-2 data-[popup-open]:ring-[var(--text-primary)]/10",
          className,
        )}
      >
        <span className="truncate max-w-[130px]">
          {selected?.label ?? "Tous les modes"}
        </span>
        <AnimatedDropdownTriggerIndicator className="h-3.5 w-3.5 text-[var(--text-muted)] group-data-[popup-open]:text-[var(--text-primary)]" />
      </AnimatedDropdownTrigger>

      <AnimatedDropdownContent side="bottom" align="start" sideOffset={4}>
        {options.map((opt) => {
          const isCurrent = opt.id === selectedId;
          return (
            <AnimatedDropdownItem
              key={opt.id}
              icon={isCurrent ? <Check /> : undefined}
              onClick={() => onSelect(opt.id)}
              className={
                isCurrent ? accentTextClass[accentColor] : undefined
              }
            >
              {opt.label}
            </AnimatedDropdownItem>
          );
        })}
      </AnimatedDropdownContent>
    </AnimatedDropdown>
  );
}
