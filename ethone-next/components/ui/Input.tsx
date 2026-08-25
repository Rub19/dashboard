"use client";

import { forwardRef, useRef, useState, useEffect, type ReactNode, useId } from "react";
import { Icon } from "@/lib/icons";

export type InputSize = "default" | "large" | "compact";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: string;
  error?: boolean;
  inputSize?: InputSize;
  clearable?: boolean;
  right?: ReactNode;
  inputClassName?: string;
};

const SIZE_CLASSES: Record<InputSize, string> = {
  default: "h-11",
  large: "h-12",
  compact: "h-9",
};

function setRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      icon,
      error,
      inputSize = "default",
      clearable,
      right,
      inputClassName,
      className = "",
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const fallbackId = useId();
    const id = props.id || fallbackId;
    const innerRef = useRef<HTMLInputElement>(null);
    const [hasValue, setHasValue] = useState(() =>
      typeof value === "string" ? value.length > 0 : false
    );

    useEffect(() => {
      setHasValue(typeof value === "string" ? value.length > 0 : false);
    }, [value]);

    const showClear = clearable && hasValue && !disabled;

    const baseWrapper =
      "group relative flex w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-[var(--text-primary)]/[0.04] px-3.5 text-sm text-[var(--text-primary)] outline-none backdrop-blur-md transition-all duration-200 ease-out";
    const hover = "hover:border-white/[0.18]";
    const focus =
      "focus-within:border-[var(--accent-primary)]/60 focus-within:ring-1 focus-within:ring-[var(--accent-primary)]/20 focus-within:shadow-[0_0_20px_var(--glow-color)]";
    const state = error
      ? "border-red-500/50 ring-1 ring-red-500/10 text-red-200"
      : `${hover} ${focus}`;
    const opacity = disabled ? "opacity-50 cursor-not-allowed" : "";

    return (
      <div
        className={`${baseWrapper} ${SIZE_CLASSES[inputSize]} ${state} ${opacity} ${className}`}
      >
        {icon && (
          <span className="pointer-events-none flex shrink-0 items-center justify-center text-[var(--text-muted)] transition-colors duration-200 group-focus-within:text-[var(--accent-primary)]">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <input
          ref={(node) => {
            innerRef.current = node;
            setRef(ref, node);
          }}
          id={id}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            onChange?.(e);
          }}
          className={`min-w-0 flex-1 bg-transparent border-0 p-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-0 caret-[var(--accent-primary)] disabled:cursor-not-allowed ${inputClassName || ""}`}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              const input = innerRef.current;
              if (!input) return;
              const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype,
                "value"
              )?.set;
              if (nativeSetter) {
                nativeSetter.call(input, "");
              } else {
                input.value = "";
              }
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.focus();
              setHasValue(false);
            }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/5 hover:text-[var(--text-primary)]"
            aria-label="Effacer"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        )}
        {right && <div className="shrink-0">{right}</div>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
