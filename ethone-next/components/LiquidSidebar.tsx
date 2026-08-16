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
      className="w-56 space-y-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-2 backdrop-blur-[var(--panel-blur)]"
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
            className={`relative flex w-full items-center gap-3 rounded-[var(--panel-radius)] px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--panel-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.icon && <span className={isActive ? "text-white/80" : "text-[var(--muted)]"}>{item.icon}</span>}
            <span className="min-w-0 truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
