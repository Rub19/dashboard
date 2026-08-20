"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLayer } from "@/components/LayerProvider";
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

  useLayer(open, () => setOpen(false), {
    boundary: menuRef,
    kind: "menu",
    closeOnEscape: true,
    closeOnOutside: true,
    closeOnScroll: true,
    closeOnResize: true,
    initialFocus: true,
  });

  const focusableItems = items.filter((item) => !item.separator);

  const [activeId, setActiveId] = useState<string | null>(
    focusableItems.find((item) => !item.disabled)?.id ?? null
  );

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const activeIndex = focusableItems.findIndex((item) => item.id === activeId);

  const setNext = useCallback(
    (direction: "next" | "prev") => {
      if (focusableItems.length === 0) return;
      const start = activeIndex >= 0 ? activeIndex : -1;
      for (let i = 1; i <= focusableItems.length; i++) {
        const idx =
          direction === "next"
            ? (start + i) % focusableItems.length
            : (start - i + focusableItems.length) % focusableItems.length;
        const item = focusableItems[idx];
        if (item && !item.disabled) {
          setActiveId(item.id);
          return;
        }
      }
    },
    [activeIndex, focusableItems, setActiveId]
  );

  const setFirst = useCallback(() => {
    const first = focusableItems.find((item) => !item.disabled);
    if (first) setActiveId(first.id);
  }, [focusableItems, setActiveId]);

  const setLast = useCallback(() => {
    const last = [...focusableItems].reverse().find((item) => !item.disabled);
    if (last) setActiveId(last.id);
  }, [focusableItems, setActiveId]);

  const activate = useCallback(() => {
    const item = focusableItems.find((i) => i.id === activeId);
    if (item && !item.disabled) {
      close();
      item.onClick?.();
    }
  }, [activeId, close, focusableItems]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setPos({ x: e.clientX, y: e.clientY });
      setAdjusted({ x: e.clientX, y: e.clientY });
      setActiveId(focusableItems.find((item) => !item.disabled)?.id ?? null);
      setOpen(true);
    },
    [focusableItems, setActiveId, setOpen, setPos, setAdjusted]
  );

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
          className="v8-context-menu ethone-context-menu fixed z-50 min-w-[10rem] max-w-[18rem] rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 shadow-[var(--shadow)] outline-none backdrop-blur-[var(--panel-blur)]"
          style={{ left: adjusted.x, top: adjusted.y }}
          role="menu"
          aria-label={i18n("actions")}
          aria-orientation="vertical"
          aria-activedescendant={activeId ? `ctx-item-${activeId}` : undefined}
          tabIndex={0}
          onKeyDown={(e) => {
            switch (e.key) {
              case "ArrowDown":
              case "Down":
                e.preventDefault();
                setNext("next");
                return;
              case "ArrowUp":
              case "Up":
                e.preventDefault();
                setNext("prev");
                return;
              case "Home":
                e.preventDefault();
                setFirst();
                return;
              case "End":
                e.preventDefault();
                setLast();
                return;
              case "Enter":
              case " ":
                e.preventDefault();
                activate();
                return;
            }

            if (e.key === "Tab") {
              e.preventDefault();
              if (e.shiftKey) setNext("prev");
              else setNext("next");
              return;
            }

            if (e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key)) {
              const match = focusableItems.find(
                (item, idx) =>
                  idx > (activeIndex >= 0 ? activeIndex : -1) &&
                  !item.disabled &&
                  item.label.toLowerCase().startsWith(e.key.toLowerCase())
              );
              if (match) {
                e.preventDefault();
                setActiveId(match.id);
                return;
              }
              const wrap = focusableItems.find(
                (item) =>
                  !item.disabled &&
                  item.label.toLowerCase().startsWith(e.key.toLowerCase())
              );
              if (wrap) {
                e.preventDefault();
                setActiveId(wrap.id);
              }
            }
          }}
        >
          {items.map((item) =>
            item.separator ? (
              <hr key={item.id} className="my-1 border-[var(--panel-border)]" role="separator" />
            ) : (
              <button
                key={item.id}
                type="button"
                id={`ctx-item-${item.id}`}
                role="menuitem"
                data-context-item={item.id}
                disabled={item.disabled}
                tabIndex={-1}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onClick?.();
                }}
                onMouseEnter={() => setActiveId(item.id)}
                onPointerEnter={() => setActiveId(item.id)}
                className={`flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--panel-bg)] focus:bg-[var(--panel-bg)] disabled:opacity-40 disabled:hover:bg-transparent ${
                  item.id === activeId ? "bg-[var(--panel-bg)]" : ""
                } ${item.danger ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}
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
