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
          className={`w-full h-full min-h-0 rounded-[var(--inset-radius)] border bg-[var(--inset-bg)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition-all duration-200 placeholder:text-[var(--muted)] focus:border-white/20 focus:ring-1 focus:ring-white/15 focus:shadow-[0_0_15px_rgba(255,255,255,0.03)] ${
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
