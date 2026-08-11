"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
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
  const triggerRef = useRef<HTMLElement | null>(null);

  const focusableItems = items.filter((item) => !item.separator);

  const [activeId, setActiveId] = useState<string | null>(
    focusableItems.find((item) => !item.disabled)?.id ?? null
  );

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    triggerRef.current = (e.target as HTMLElement) || null;
    setPos({ x: e.clientX, y: e.clientY });
    setAdjusted({ x: e.clientX, y: e.clientY });
    setActiveId(focusableItems.find((item) => !item.disabled)?.id ?? null);
    setOpen(true);
  }

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) {
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === "function") {
        queueMicrotask(() => trigger.focus({ preventScroll: true }));
      }
      return;
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }

      const currentIndex = focusableItems.findIndex((item) => item.id === activeId);
      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowDown":
        case "Down":
          e.preventDefault();
          for (let i = 1; i <= focusableItems.length; i++) {
            const idx = (currentIndex + i) % focusableItems.length;
            if (!focusableItems[idx]?.disabled) {
              nextIndex = idx;
              break;
            }
          }
          break;
        case "ArrowUp":
        case "Up":
          e.preventDefault();
          for (let i = 1; i <= focusableItems.length; i++) {
            const idx = (currentIndex - i + focusableItems.length) % focusableItems.length;
            if (!focusableItems[idx]?.disabled) {
              nextIndex = idx;
              break;
            }
          }
          break;
        case "Home":
          e.preventDefault();
          for (let i = 0; i < focusableItems.length; i++) {
            if (!focusableItems[i]?.disabled) {
              nextIndex = i;
              break;
            }
          }
          break;
        case "End":
          e.preventDefault();
          for (let i = focusableItems.length - 1; i >= 0; i--) {
            if (!focusableItems[i]?.disabled) {
              nextIndex = i;
              break;
            }
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (currentIndex >= 0) {
            const item = focusableItems[currentIndex];
            if (item && !item.disabled) {
              close();
              item.onClick?.();
            }
          }
          return;
      }

      if (nextIndex !== currentIndex) {
        setActiveId(focusableItems[nextIndex]?.id ?? null);
      }
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
  }, [open, close, activeId, focusableItems]);

  useEffect(() => {
    if (open && menuRef.current) {
      const activeButton = menuRef.current.querySelector<HTMLButtonElement>(
        `[data-context-item="${activeId}"]`
      );
      activeButton?.focus({ preventScroll: true });
    }
  }, [open, activeId]);

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
          className="ethone-context-menu fixed z-50 min-w-[10rem] max-w-[18rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow)] outline-none"
          style={{ left: adjusted.x, top: adjusted.y }}
          role="menu"
          aria-label={i18n("actions")}
          aria-orientation="vertical"
          aria-activedescendant={activeId ? `ctx-item-${activeId}` : undefined}
          tabIndex={-1}
        >
          {items.map((item) =>
            item.separator ? (
              <hr key={item.id} className="my-1 border-[var(--border)]" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                id={`ctx-item-${item.id}`}
                role="menuitem"
                data-context-item={item.id}
                disabled={item.disabled}
                tabIndex={item.id === activeId ? 0 : -1}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onClick?.();
                }}
                onMouseEnter={() => setActiveId(item.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-raised)] focus:bg-[var(--surface-raised)] disabled:opacity-40 disabled:hover:bg-transparent ${
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
