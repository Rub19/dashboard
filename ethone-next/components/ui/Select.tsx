"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Sélectionner…",
  label,
  disabled = false,
  className = "",
  id: providedId,
  "aria-label": ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.id === value),
    [options, value]
  );

  const selected = options[selectedIndex];

  useEffect(() => {
    if (open) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        listboxRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (options[activeIndex] && !options[activeIndex].disabled) {
          onChange(options[activeIndex].id);
          setOpen(false);
          triggerRef.current?.focus();
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  const selectOption = (option: SelectOption) => {
    if (option.disabled) return;
    onChange(option.id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label id={labelId} htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--muted)]">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-left text-sm font-medium transition-all focus:outline-none ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${
          open
            ? "border-purple-500/50 bg-white/[0.04] text-zinc-200 ring-1 ring-purple-500/30"
            : "border-white/10 bg-zinc-900/70 text-zinc-200 hover:border-white/20"
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden="true" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            onKeyDown={handleListboxKeyDown}
            className="absolute z-50 mt-1.5 w-full min-w-[12rem] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 shadow-2xl shadow-black/60 backdrop-blur-xl"
          >
            <div className="max-h-64 overflow-y-auto p-1.5">
              {options.map((option, index) => {
                const isSelected = option.id === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={option.id}
                    ref={(el) => { optionRefs.current[index] = el; }}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectOption(option)}
                    tabIndex={-1}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                      option.disabled
                        ? "cursor-not-allowed opacity-40"
                        : isSelected
                          ? "bg-purple-500/10 text-purple-300"
                          : isActive
                            ? "bg-purple-500/15 text-white"
                            : "text-zinc-300 hover:bg-purple-500/15 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0 text-purple-400" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
