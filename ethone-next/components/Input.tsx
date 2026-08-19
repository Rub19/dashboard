"use client";

import { forwardRef } from "react";
import { Icon } from "@/lib/icons";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: string;
  error?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ icon, className = "", error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <input
          ref={ref}
          className={`w-full rounded-[var(--inset-radius)] border bg-[var(--inset-bg)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--accent)] ${
            icon ? "pl-9" : ""
          } ${error ? "border-red-400" : "border-[var(--inset-border)]"} ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
