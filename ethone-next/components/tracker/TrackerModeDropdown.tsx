"use client";

import { Check } from "lucide-react";
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
          "flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-xs font-bold",
          "transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-xl",
          "border-white/10 bg-black/60 text-zinc-200 hover:border-white/20 hover:bg-white/[0.08]",
          "data-[popup-open]:border-white/25 data-[popup-open]:bg-white/15 data-[popup-open]:text-white data-[popup-open]:ring-2 data-[popup-open]:ring-white/10",
          className,
        )}
      >
        <span className="truncate max-w-[130px]">
          {selected?.label ?? "Tous les modes"}
        </span>
        <AnimatedDropdownTriggerIndicator className="h-3.5 w-3.5 text-zinc-400 group-data-[popup-open]:text-white" />
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
