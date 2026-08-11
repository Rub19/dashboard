"use client";

/* eslint-disable react-hooks/refs */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFloating, offset, flip, size, autoUpdate, FloatingPortal } from "@floating-ui/react";
import { Icon } from "@/lib/icons";

function mergeRefs<T>(...refs: Array<React.Ref<T>>) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") ref(value);
      else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
    });
  };
}

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
};

export default function Select({ options, value, onChange, placeholder = "Sélectionner…", disabled, label }: SelectProps) {
  const id = useId();
  const listId = `${id}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [search, setSearch] = useState("");
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const mergedRef = mergeRefs(triggerRef, refs.setReference);

  const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);
  const selectedIndex = useMemo(
    () => enabledOptions.findIndex((o) => o.value === value),
    [enabledOptions, value]
  );

  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
      setSearch("");
    }
  }, [open, selectedIndex]);

  useEffect(() => {
    const active = optionRefs.current[activeIndex];
    active?.focus({ preventScroll: true });
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const next =
          event.key === "ArrowDown"
            ? (activeIndex + 1) % enabledOptions.length
            : (activeIndex - 1 + enabledOptions.length) % enabledOptions.length;
        setActiveIndex(next);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const option = enabledOptions[activeIndex];
        if (option) {
          onChange?.(option.value);
          setOpen(false);
        }
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(enabledOptions.length - 1);
    } else if (event.key.length === 1) {
      const term = (search + event.key).toLowerCase();
      const next = enabledOptions.findIndex(
        (o, i) => i > activeIndex && o.label.toLowerCase().startsWith(term)
      );
      const fallback = enabledOptions.findIndex(
        (o) => o.label.toLowerCase().startsWith(term)
      );
      const index = next >= 0 ? next : fallback >= 0 ? fallback : activeIndex;
      if (index >= 0) {
        setActiveIndex(index);
        setSearch((s) => s + event.key);
        setTimeout(() => setSearch(""), 500);
      }
    }
  }

  function select(option: SelectOption) {
    if (option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const activeLabel = enabledOptions.find((o) => o.value === value)?.label || placeholder;

  return (
    <div className="v8-select relative inline-block w-full" data-v8-kind="select" data-value={value}>
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]" id={`${id}-label`}>
          {label}
        </label>
      )}
      <button
        ref={mergedRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors hover:border-[var(--accent)]/40 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] disabled:opacity-50"
      >
        <span className="truncate">{activeLabel}</span>
        <Icon name="chevron-down" className="h-4 w-4 text-[var(--muted)]" />
      </button>
      <FloatingPortal>
        <AnimatePresence>
          {open && (
            <motion.div
              ref={refs.setFloating}
              id={listId}
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              onKeyDown={handleKeyDown}
              className="z-50 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-xl outline-none"
              style={floatingStyles}
            >
              {enabledOptions.map((option, i) => {
                const selected = option.value === value;
                const active = i === activeIndex;
                return (
                  <button
                    key={option.value}
                    id={`${id}-option-${i}`}
                    ref={(el) => { optionRefs.current[i] = el; }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-value={option.value}
                    tabIndex={-1}
                    onClick={() => select(option)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`v8-select__option flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                      active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--surface)]"
                    } ${selected ? "font-medium" : ""}`}
                  >
                    <span className="h-4 w-4 text-[var(--accent)]">
                      {selected ? <Icon name="check" className="h-4 w-4" /> : null}
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </div>
  );
}
