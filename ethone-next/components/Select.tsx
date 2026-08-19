"use client";



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
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const enabledIndexes = useMemo(
    () => options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0),
    [options]
  );

  const selectedAllIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value]);
  const selectedEnabledIndex = enabledIndexes.indexOf(selectedAllIndex);

  function enabledIndexToAllIndex(enabledIdx: number) {
    return enabledIndexes[enabledIdx] ?? -1;
  }

  function allIndexToEnabledIndex(allIdx: number) {
    return enabledIndexes.indexOf(allIdx);
  }

  useEffect(() => {
    if (open) {
      const initialEnabled = selectedEnabledIndex >= 0 ? selectedEnabledIndex : 0;
      setActiveIndex(enabledIndexToAllIndex(initialEnabled));
      setSearch("");
    }
  }, [open, selectedEnabledIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const allIdx = activeIndex;
    const el = optionRefs.current[allIdx];
    if (open && el) {
      el.focus({ preventScroll: true });
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  function setActiveEnabledIndex(enabledIdx: number) {
    setActiveIndex(enabledIndexToAllIndex(enabledIdx));
  }

  function adjustEnabledIndex(delta: number) {
    if (enabledIndexes.length === 0) return;
    const currentEnabled = allIndexToEnabledIndex(activeIndex);
    const next = (currentEnabled + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveEnabledIndex(next);
  }

  function findTypeahead(term: string) {
    if (enabledIndexes.length === 0) return;
    const currentEnabled = allIndexToEnabledIndex(activeIndex);
    const next = enabledIndexes.findIndex(
      (allIdx, i) => i > currentEnabled && options[allIdx].label.toLowerCase().startsWith(term)
    );
    const fallback = enabledIndexes.findIndex((allIdx) =>
      options[allIdx].label.toLowerCase().startsWith(term)
    );
    const index = next >= 0 ? next : fallback >= 0 ? fallback : currentEnabled;
    setActiveEnabledIndex(index);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        adjustEnabledIndex(event.key === "ArrowDown" ? 1 : -1);
      }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        select(options[activeIndex]);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (open) setActiveEnabledIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      if (open) setActiveEnabledIndex(enabledIndexes.length - 1);
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      const term = (search + event.key).toLowerCase();
      setSearch(term);
      findTypeahead(term);
      searchTimeoutRef.current = setTimeout(() => setSearch(""), 600);
    }
  }

  function select(option: SelectOption) {
    if (option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
  }

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const activeLabel = options.find((o) => o.value === value)?.label || placeholder;

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
        aria-activedescendant={open && enabledIndexes.length > 0 ? `${id}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2 text-sm outline-none transition-colors hover:border-white/20 focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] disabled:opacity-50 backdrop-blur-[var(--panel-blur)]"
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
              aria-multiselectable={false}
              aria-label={label}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              onKeyDown={handleKeyDown}
              className="z-50 overflow-auto rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-1 shadow-xl outline-none backdrop-blur-[var(--panel-blur)]"
              style={floatingStyles}
            >
              {options.map((option, i) => {
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
                    aria-disabled={option.disabled || undefined}
                    data-value={option.value}
                    tabIndex={-1}
                    disabled={option.disabled}
                    onClick={() => select(option)}
                    onMouseEnter={() => !option.disabled && setActiveIndex(i)}
                    className={`v8-select__option flex w-full items-center gap-2 rounded-[var(--panel-radius)] px-2.5 py-1.5 text-left text-sm transition-colors ${
                      active ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "hover:bg-[var(--panel-bg)]"
                    } ${selected ? "font-medium" : ""} ${
                      option.disabled ? "cursor-not-allowed opacity-40" : ""
                    }`}
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
