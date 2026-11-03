import { Children, isValidElement, KeyboardEvent, ReactElement, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { nextOption, typeAhead } from "./select-keys";

interface Props {
  value: string | number;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

const text = (node: ReactNode): string => Children.toArray(node).map((part) => (typeof part === "string" || typeof part === "number" ? String(part) : "")).join("");

export default function Select({ value, onChange, children, className = "", disabled, "aria-label": label }: Props) {
  const options = useMemo(() => Children.toArray(children).filter(isValidElement).map((element) => {
    const props = (element as ReactElement<OptionProps>).props;
    return { value: String(props.value ?? ""), label: text(props.children), disabled: Boolean(props.disabled) };
  }), [children]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number; up: boolean } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const current = String(value);
  const selected = options.find((option) => option.value === current);

  const show = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const below = window.innerHeight - rect.bottom - 12;
    const up = below < 180 && rect.top > below;
    setPlace({ left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 180) - 8), width: rect.width, maxHeight: Math.min(320, up ? rect.top - 12 : below), up, ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    setActive(Math.max(0, options.findIndex((option) => option.value === current)));
    setOpen(true);
  };
  const choose = (next: string) => {
    setOpen(false);
    trigger.current?.focus();
    if (next !== current) onChange({ target: { value: next } });
  };

  useLayoutEffect(() => {
    if (open) panel.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);
  useEffect(() => {
    if (!open) return;
    const away = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const close = (event: Event) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const onKey = (event: KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (options[active] && !options[active].disabled) choose(options[active].value);
      return;
    }
    const moved = nextOption(options, active, event.key);
    const found = moved ?? (event.key.length === 1 ? typeAhead(options, active, event.key) : null);
    if (found !== null) {
      event.preventDefault();
      setActive(found);
    }
  };

  return (
    <>
      <button type="button" ref={trigger} className={`select-trigger ${open ? "open" : ""} ${className}`} disabled={disabled} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        <span>{selected?.label ?? ""}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && place && (
            <motion.ul
              ref={panel}
              className="select-panel"
              role="listbox"
              aria-label={label}
              style={{ left: place.left, minWidth: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight, transformOrigin: place.up ? "bottom left" : "top left" }}
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: place.up ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
            >
              {options.map((option, index) => (
                <li key={`${option.value}-${index}`} role="option" aria-selected={option.value === current} aria-disabled={option.disabled} className={`${index === active ? "active" : ""} ${option.disabled ? "off" : ""}`} onPointerEnter={() => setActive(index)} onClick={() => !option.disabled && choose(option.value)}>
                  <span>{option.label}</span>
                  {option.value === current && <Check size={14} aria-hidden="true" />}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
