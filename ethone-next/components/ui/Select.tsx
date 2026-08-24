"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import { hapticLightImpact } from "@/lib/haptics";

export type SelectOption = {
  id: string;
  label: React.ReactNode;
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.id === value),
    [options, value]
  );

  const selected = options[selectedIndex];

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 240);
    const maxLeft = Math.max(8, (typeof window !== "undefined" ? window.innerWidth : 0) - width - 8);
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, maxLeft)),
      width,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      setMounted(false);
      return;
    }
    updatePosition();
    setReady(true);
    setMounted(false);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    const raf = requestAnimationFrame(() => setMounted(true));
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, selectedIndex, updatePosition]);

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
    hapticLightImpact();
    onChange(option.id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const listboxLabel = ariaLabel || (typeof label === "string" ? label : undefined);

  const listbox = (
    <div
      ref={listboxRef}
      id={listboxId}
      role="listbox"
      aria-label={listboxLabel}
      onKeyDown={handleListboxKeyDown}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(-6px)",
      }}
      className="z-[var(--z-dropdown)] liquid-glass-select mt-1.5 min-w-[min(18rem,90vw)] max-w-[90vw] rounded-[var(--panel-radius)] transition-[opacity,transform] duration-150 ease-out"
    >
      <div role="group" className="max-h-64 overflow-y-auto p-1.5 no-scrollbar">
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
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-[var(--panel-radius)] px-3 py-2 text-base transition-colors ${
                option.disabled
                  ? "cursor-not-allowed opacity-40"
                  : isSelected
                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                    : isActive
                      ? "bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--accent-primary)]/15 hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="truncate">{option.label}</span>
              {isSelected && (
                <Check className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label id={labelId} htmlFor={id} className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          hapticLightImpact();
          setOpen((v) => !v);
        }}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-labelledby={label ? labelId : undefined}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-[var(--panel-radius)] px-3.5 text-left text-base font-medium focus:outline-none md:h-10 liquid-glass-select ${
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
        } ${
          open
            ? "border-[var(--accent-primary)]/50 text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]/30"
            : "text-[var(--text-primary)]"
        }`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" />
        </motion.span>
      </button>

      {open && ready && typeof document !== "undefined" && createPortal(listbox, document.body, generatedId)}
    </div>
  );
}
