"use client";

import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from "react";

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
  inputClassName?: string;
  autoResize?: boolean;
};

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      error,
      inputClassName,
      className = "",
      autoResize,
      onChange,
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

    const base =
      "group relative w-full rounded-xl border border-[var(--text-primary)]/10 bg-[var(--text-primary)]/[0.03] p-3 text-sm text-[var(--text-primary)] outline-none backdrop-blur-sm transition-all duration-200 ease-out";
    const hover = "hover:border-[var(--text-primary)]/20";
    const focus =
      "focus-within:border-[var(--accent-primary)] focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/20 focus-within:shadow-[0_0_20px_var(--glow-color)]";
    const state = error
      ? "border-red-500/50 ring-1 ring-red-500/10 text-red-200"
      : `${hover} ${focus}`;

    return (
      <div className={`${base} ${state} ${className}`}>
        <textarea
          ref={(node) => {
            (innerRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            }
          }}
          onChange={(e) => {
            if (autoResize) {
              const el = e.target;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }
            onChange?.(e);
          }}
          className={`h-full min-h-[5rem] w-full resize-y bg-transparent border-0 p-0 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-0 caret-[var(--accent-primary)] ${inputClassName || ""}`}
          {...props}
        />
      </div>
    );
  }
);

TextArea.displayName = "TextArea";
export default TextArea;
