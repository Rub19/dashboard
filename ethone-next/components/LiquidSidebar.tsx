"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export type LiquidItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

export default function LiquidSidebar({
  items,
  defaultActive,
  active,
  onChange,
}: {
  items: LiquidItem[];
  defaultActive?: string;
  active?: string;
  onChange?: (id: string) => void;
}) {
  const [internal, setInternal] = useState(defaultActive || items[0]?.id);
  const currentActive = active !== undefined ? active : internal;
  const [hovered, setHovered] = useState<string | null>(null);
  const current = hovered || currentActive;

  function handleClick(id: string) {
    if (active === undefined) setInternal(id);
    onChange?.(id);
  }

  return (
    <div
      className="v8-panel w-56 space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2"
      role="tablist"
      aria-label="Panneau latéral"
    >
      {items.map((item) => {
        const isCurrent = current === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={currentActive === item.id}
            onClick={() => handleClick(item.id)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            className="v8-panel__item relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
          >
            {isCurrent && (
              <motion.div
                layoutId="liquid-bg"
                className={`absolute inset-0 -z-10 rounded-xl ${
                  currentActive === item.id ? "bg-[var(--accent)]" : "bg-[var(--surface-raised)]"
                }`}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            {item.icon && <span className="text-[var(--muted)]">{item.icon}</span>}
            <span className={currentActive === item.id ? "font-semibold text-white" : "text-[var(--muted)]"}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
