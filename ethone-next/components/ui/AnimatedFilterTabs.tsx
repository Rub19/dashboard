"use client";

import { useId } from "react";
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
  const uid = useId();
  const pillLayoutId = `active-filter-pill-${uid}`;

  return (
    <motion.div
      layoutRoot
      className={`relative inline-flex items-center gap-1 p-1 v8-panel backdrop-blur-xl rounded-xl overflow-x-auto no-scrollbar ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 select-none z-10 ${
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={pillLayoutId}
                initial={false}
                className="absolute inset-0 rounded-lg bg-[var(--accent-primary)]/15 border border-[var(--accent-primary)]/30 shadow-[0_0_12px_var(--glow-color)] -z-10"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            {tab.icon && <span className="relative z-10">{tab.icon}</span>}
            <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-lg font-mono ${
                  isActive
                    ? "bg-[var(--accent-primary)]/30 text-[var(--accent-primary)]"
                    : "bg-[var(--text-primary)]/5 text-[var(--text-muted)]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </motion.div>
  );
}
