"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type AnimatedFilterTab = {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
};

type AnimatedFilterTabsProps = {
  tabs: AnimatedFilterTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function AnimatedFilterTabs({
  tabs,
  activeId,
  onChange,
  className = "",
}: AnimatedFilterTabsProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 p-1 bg-zinc-950/70 border border-white/[0.08] backdrop-blur-xl rounded-xl overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 select-none z-10 ${
              isActive ? "text-emerald-300" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="activeFilterPill"
                className="absolute inset-0 rounded-lg bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_12px_rgba(52,211,153,0.15)] -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            {tab.icon && <span className="relative z-10">{tab.icon}</span>}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-lg font-mono ${
                  isActive
                    ? "bg-emerald-500/30 text-emerald-200"
                    : "bg-white/5 text-zinc-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
