"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Swords, Shield, Trophy, Flame, Zap, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function TrackerModeDropdown({
  options,
  selectedId,
  onSelect,
  accentColor = "rose",
  className,
}: TrackerModeDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.id === selectedId) || options[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={dropdownRef} className={cn("relative inline-block text-left select-none", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-2xl border px-3.5 py-1.5 text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-xl",
          open
            ? "border-white/25 bg-white/15 text-white ring-2 ring-white/10"
            : "border-white/10 bg-black/60 text-zinc-200 hover:border-white/20 hover:bg-white/[0.08]"
        )}
      >
        <span className="truncate max-w-[130px]">{selected?.label || "Tous les modes"}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-zinc-400 transition-transform duration-200",
            open && "rotate-180 text-white"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:right-0 sm:left-auto top-full z-50 min-w-[190px] overflow-hidden rounded-2xl border border-white/15 bg-[#0e131d]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
          >
            <div className="space-y-0.5">
              {options.map((opt) => {
                const isCurrent = opt.id === selectedId;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelect(opt.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer",
                      isCurrent
                        ? accentColor === "rose"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          : accentColor === "amber"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                        : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                    )}
                  >
                    <span>{opt.label}</span>
                    {isCurrent && (
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          accentColor === "rose"
                            ? "text-rose-400"
                            : accentColor === "amber"
                            ? "text-amber-400"
                            : "text-cyan-400"
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
