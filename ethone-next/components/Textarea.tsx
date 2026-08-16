"use client";

import { forwardRef } from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-[var(--panel-radius)] border bg-[var(--surface)] p-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] ${
          error ? "border-red-400" : "border-[var(--border)]"
        } ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
