"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { Icon } from "@/lib/icons";

export type ContextMenuItem = {
  id: string;
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
};

export default function ContextMenu({
  children,
  items,
}: {
  children: ReactNode;
  items: ContextMenuItem[];
}) {
  const i18n = useI18n();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [adjusted, setAdjusted] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPos({ x: e.clientX, y: e.clientY });
    setAdjusted({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function close() {
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function onResize() {
      close();
    }

    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    window.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      window.removeEventListener("click", onClick, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = pos.x;
    let y = pos.y;
    if (x + rect.width > vw - 8) x = Math.max(8, vw - rect.width - 8);
    if (y + rect.height > vh - 8) y = Math.max(8, vh - rect.height - 8);
    setAdjusted({ x, y });
  }, [open, pos]);

  return (
    <div onContextMenu={handleContextMenu} className="contents">
      {children}
      {open && (
        <div
          ref={menuRef}
          className="ethone-context-menu fixed z-50 min-w-[10rem] max-w-[18rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)]"
          style={{ left: adjusted.x, top: adjusted.y }}
          role="menu"
          aria-label={i18n("actions")}
        >
          {items.map((item) =>
            item.separator ? (
              <hr key={item.id} className="my-1 border-[var(--border)]" />
            ) : (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-raised)] disabled:opacity-40 disabled:hover:bg-transparent ${
                  item.danger ? "text-red-400" : "text-[var(--foreground)]"
                }`}
              >
                {item.icon && <Icon name={item.icon} className="h-4 w-4 text-[var(--muted)]" />}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
