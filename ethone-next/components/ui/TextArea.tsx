"use client";

import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
  success?: boolean;
  inputClassName?: string;
  autoResize?: boolean;
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      error,
      success,
      inputClassName,
      className = "",
      autoResize,
      onChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
      if (!autoResize) return;
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });

    return (
      <div
        data-error={Boolean(error)}
        data-success={Boolean(success)}
        className={cn(
          "group/textarea relative w-full overflow-hidden rounded-2xl",
          "border border-[var(--input-border)] bg-[var(--input-bg)] p-3 text-sm text-[var(--text-primary)]",
          "outline-none transition-all duration-180 ease-out",
          // Hover
          "hover:border-[var(--input-border-hover)] hover:bg-[var(--input-bg-hover)]",
          // Focus-within
          "focus-within:border-[var(--accent-primary)] focus-within:bg-[var(--input-bg-focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-primary)_18%,transparent),0_0_16px_-4px_var(--glow-color)]",
          // Error
          error && "border-[var(--danger)]/80 focus-within:border-[var(--danger)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_18%,transparent)]",
          // Success
          success && !error && "border-[var(--success)]/80 focus-within:border-[var(--success)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_18%,transparent)]",
          // Disabled
          disabled && "opacity-50 cursor-not-allowed hover:border-[var(--input-border)] hover:bg-[var(--input-bg)]",
          className
        )}
      >
        <textarea
          ref={(node) => {
            innerRef.current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            }
          }}
          disabled={disabled}
          onChange={(e) => {
            if (autoResize) {
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
            onChange?.(e);
          }}
          className={cn(
            "h-full min-h-[5.5rem] w-full resize-y bg-transparent border-0 p-0 text-sm leading-relaxed text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]/60 placeholder:font-normal",
            "outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
            "caret-[var(--accent-primary)] disabled:cursor-not-allowed [scrollbar-width:thin]",
            inputClassName
          )}
          {...props}
        />
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
export default TextArea;
