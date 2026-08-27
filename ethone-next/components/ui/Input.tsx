"use client";

import { forwardRef, useRef, useState, useEffect, type ReactNode, useId } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type InputSize = "default" | "large" | "compact";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: string;
  error?: boolean;
  success?: boolean;
  inputSize?: InputSize;
  clearable?: boolean;
  shortcut?: string;
  right?: ReactNode;
  inputClassName?: string;
};

const SIZE_CLASSES: Record<InputSize, { wrapper: string; input: string; icon: string }> = {
  compact: {
    wrapper: "h-9 px-3 text-xs rounded-xl",
    input: "text-xs placeholder:text-xs",
    icon: "h-3.5 w-3.5",
  },
  default: {
    wrapper: "h-11 px-3.5 text-sm rounded-xl",
    input: "text-sm placeholder:text-sm",
    icon: "h-4 w-4",
  },
  large: {
    wrapper: "h-12 px-4 text-base rounded-2xl",
    input: "text-base placeholder:text-base",
    icon: "h-5 w-5",
  },
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
      success,
      inputSize = "default",
      clearable,
      shortcut,
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
      typeof value === "string" ? value.length > 0 : typeof props.defaultValue === "string" ? props.defaultValue.length > 0 : false
    );

    useEffect(() => {
      setHasValue(typeof value === "string" ? value.length > 0 : false);
    }, [value]);

    const showClear = clearable && hasValue && !disabled;
    const sizeConfig = SIZE_CLASSES[inputSize] || SIZE_CLASSES.default;

    return (
      <div
        data-error={Boolean(error)}
        data-success={Boolean(success)}
        className={cn(
          "group/input relative flex w-full min-w-0 items-center gap-2.5",
          "border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)]",
          "outline-none transition-all duration-180 ease-out",
          // Hover
          "hover:border-[var(--input-border-hover)] hover:bg-[var(--input-bg-hover)]",
          // Focus-within (No square outline, smooth glow following border radius)
          "focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--input-bg-focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent),0_0_16px_-4px_var(--glow-color)]",
          // Error state
          error && "border-[var(--danger)]/80 focus-within:border-[var(--danger)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_18%,transparent)]",
          // Success state
          success && !error && "border-[var(--success)]/80 focus-within:border-[var(--success)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_18%,transparent)]",
          // Disabled
          disabled && "opacity-50 cursor-not-allowed hover:border-[var(--input-border)] hover:bg-[var(--input-bg)]",
          sizeConfig.wrapper,
          className
        )}
      >
        {/* Leading Icon */}
        {icon && (
          <span
            className={cn(
              "pointer-events-none flex shrink-0 items-center justify-center text-[var(--text-muted)] transition-colors duration-180",
              "group-focus-within/input:text-[var(--accent-primary)]",
              error && "group-focus-within/input:text-[var(--danger)]"
            )}
          >
            <Icon name={icon} className={sizeConfig.icon} />
          </span>
        )}

        {/* Inner Input */}
        <input
          ref={(node) => {
            innerRef.current = node;
            setRef(ref, node);
          }}
          id={id}
          aria-invalid={error}
          disabled={disabled}
          value={value}
          onChange={(e) => {
            setHasValue(e.target.value.length > 0);
            onChange?.(e);
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent border-0 p-0 text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]/60 placeholder:font-normal",
            "outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
            "caret-[var(--accent-primary)] disabled:cursor-not-allowed select-text",
            sizeConfig.input,
            inputClassName
          )}
          {...props}
        />

        {/* Clear Button */}
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
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
            aria-label="Effacer le contenu"
          >
            <Icon name="x" className="h-3 w-3" />
          </button>
        )}

        {/* Shortcut badge if provided */}
        {shortcut && !hasValue && (
          <kbd className="hidden sm:inline-flex items-center rounded-md border border-[var(--panel-border)]/[0.2] bg-[var(--panel-bg)]/[0.6] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-muted)] select-none">
            {shortcut}
          </kbd>
        )}

        {/* Trailing custom slot */}
        {right && <div className="shrink-0 flex items-center">{right}</div>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
