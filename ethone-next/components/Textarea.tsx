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
        className={`w-full h-full min-h-0 rounded-[var(--panel-radius)] border bg-[var(--panel-bg)] p-3 text-sm text-[var(--foreground)] outline-none transition-all duration-200 placeholder:text-[var(--muted)] focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] ${
          error ? "border-red-400" : "border-[var(--panel-border)]"
        } ${className} backdrop-blur-[var(--panel-blur)]`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
