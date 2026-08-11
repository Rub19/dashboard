"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type ContextMenuItem = { id: string; label: string; onClick: () => void; icon?: string };

export default function ContextMenu({ x, y, items, onClose, children }: { x: number; y: number; items: ContextMenuItem[]; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [onClose]);

  return (
    <div className="relative">
      {children}
      <div
        ref={ref}
        className="fixed z-50 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-2xl"
        style={{ top: y, left: x }}
        role="menu"
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => { onClose(); item.onClick(); }}
            role="menuitem"
            className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--surface-raised)]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
