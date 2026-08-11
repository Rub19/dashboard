"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/lib/icons";

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);
  const selectedIndex = useMemo(
    () => enabledOptions.findIndex((o) => o.value === value),
    [enabledOptions, value]
  );

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!triggerRef.current || !listRef.current) return;
      const target = event.target as Node;
      if (!triggerRef.current.contains(target) && !listRef.current.contains(target)) {
        setOpen(false);
      }
    }
    if (open) {
      window.addEventListener("mousedown", onClick);
      window.addEventListener("resize", () => setOpen(false));
      return () => {
        window.removeEventListener("mousedown", onClick);
        window.removeEventListener("resize", () => setOpen(false));
      };
    }
  }, [open]);

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
      const next = enabledOptions.findIndex(
        (o, i) => i > activeIndex && o.label.toLowerCase().startsWith((search + event.key).toLowerCase())
      );
      const fallback = enabledOptions.findIndex(
        (o) => o.label.toLowerCase().startsWith((search + event.key).toLowerCase())
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
    <div className="relative inline-block w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-medium text-[var(--muted)]" id={`${id}-label`}>
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
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
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            onKeyDown={handleKeyDown}
            className="absolute z-50 mt-1 max-h-60 w-full min-w-[12rem] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-xl outline-none"
            style={{ top: "100%" }}
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
                  tabIndex={-1}
                  onClick={() => select(option)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
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
    </div>
  );
}
