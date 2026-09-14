"use client";

import { useState } from "react";

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

  function handleClick(id: string) {
    if (active === undefined) setInternal(id);
    onChange?.(id);
  }

  return (
    <div
      className="flex w-full shrink-0 gap-1 overflow-x-auto no-scrollbar rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 backdrop-blur-[var(--panel-blur)] md:w-56 md:flex-col md:gap-0 md:space-y-1 md:overflow-visible"
      role="tablist"
      aria-label="Panneau latéral"
    >
      {items.map((item) => {
        const isActive = currentActive === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(item.id)}
            className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[var(--panel-radius)] px-3 py-2 text-sm font-medium transition-colors md:w-full md:gap-3 ${
              isActive
                ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                : "text-[var(--text-muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.icon && <span className={isActive ? "text-white/80" : "text-[var(--text-muted)]"}>{item.icon}</span>}
            <span className="min-w-0 truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
