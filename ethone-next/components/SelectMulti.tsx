"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFloating, offset, flip, size, autoUpdate, FloatingPortal } from "@floating-ui/react";
import { Icon } from "@/lib/icons";

export type MultiSelectOption = {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
};

type SelectMultiProps = {
  options: MultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  searchable?: boolean;
};

export default function SelectMulti({
  options,
  values,
  onChange,
  placeholder = "Sélectionner…",
  disabled,
  label,
  searchable,
}: SelectMultiProps) {
  const id = useId();
  const listId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.group && o.group.toLowerCase().includes(q)));
  }, [options, query]);

  const groups = useMemo(() => {
    const map = new Map<string, MultiSelectOption[]>();
    for (const o of filtered) {
      const key = o.group || "";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return map;
  }, [filtered]);

  const flat = useMemo(() => filtered.filter((o) => !o.disabled), [filtered]);

  const { refs, floatingStyles } = useFloating({
    open,
    onOpenChange: setOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    strategy: "fixed",
    middleware: [
      offset(6),
      flip({ padding: 8 }),
      size({
        apply({ rects, elements, availableHeight }) {
          Object.assign(elements.floating.style, {
            minWidth: `${rects.reference.width}px`,
            maxHeight: `${Math.max(120, Math.min(320, availableHeight))}px`,
          });
        },
        padding: 8,
      }),
    ],
  });

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    const el = optionRefs.current[activeIndex];
    if (open && el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  function toggle(value: string) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) toggle(flat[activeIndex]?.value);
      else setOpen(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const activeLabel = values.length
    ? values.map((v) => options.find((o) => o.value === v)?.label).filter(Boolean).join(", ")
    : placeholder;

  return (
    <div className="v8-select relative inline-block w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]" id={`${id}-label`}>
          {label}
        </label>
      )}
      <button
        ref={refs.setReference}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors hover:border-[var(--accent)]/40 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
      >
        <span className="truncate text-left">{activeLabel}</span>
        <Icon name="chevron-down" className="h-4 w-4 text-[var(--muted)]" />
      </button>
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              id={listId}
              role="listbox"
              aria-multiselectable
              aria-label={label}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              onKeyDown={handleKeyDown}
              className="z-50 overflow-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 shadow-xl outline-none backdrop-blur-[var(--panel-blur)]"
              style={floatingStyles}
            >
              {searchable && (
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                  placeholder="Rechercher…"
                  className="mb-1 w-full rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2.5 py-1.5 text-sm outline-none focus:border-[var(--accent)] backdrop-blur-[var(--panel-blur)]"
                  onKeyDown={handleKeyDown}
                />
              )}
              {Array.from(groups.entries()).map(([group, groupOptions]) => (
                <div key={group || "default"}>
                  {group && (
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-[var(--muted)]">{group}</div>
                  )}
                  {groupOptions.map((option) => {
                    const selected = values.includes(option.value);
                    const flatIndex = flat.findIndex((o) => o.value === option.value);
                    const active = flatIndex === activeIndex;
                    return (
                      <button
                        key={option.value}
                        ref={(el) => { optionRefs.current[flatIndex] = el; }}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        aria-disabled={option.disabled || undefined}
                        tabIndex={-1}
                        disabled={option.disabled}
                        onClick={() => toggle(option.value)}
                        onMouseEnter={() => !option.disabled && setActiveIndex(flatIndex)}
                        className={`flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-2.5 py-1.5 text-left text-sm transition-colors ${
                          active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--panel-bg)]"
                        } ${option.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded border border-[var(--panel-border)] text-[var(--accent)]">
                          {selected && <Icon name="check" className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </div>
  );
}
