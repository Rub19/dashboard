"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface AuthInputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
  error?: string | null;
}

const AuthInputField = forwardRef<HTMLInputElement, AuthInputFieldProps>(
  ({ label, leftIcon, rightElement, error, className, id, disabled, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full text-left">
        <label htmlFor={id} className="block text-xs font-medium text-[var(--text-muted)] select-none">
          {label}
        </label>
        <div className="group relative flex items-center w-full">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-[var(--text-muted)] transition-[color,transform] duration-200 [transition-timing-function:var(--ease-snap)] group-focus-within:scale-110 group-focus-within:text-[var(--accent-primary)]">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            disabled={disabled}
            className={cn(
              "h-12 w-full rounded-[var(--inset-radius)] border bg-white/[0.035] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-150 [transition-timing-function:var(--ease-snap)] outline-none",
              leftIcon ? "pl-11" : "pl-4",
              rightElement ? "pr-11" : "pr-4",
              "border-[var(--panel-border)] hover:border-[var(--input-border-hover)]",
              "focus:border-[var(--accent-primary)]/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-[var(--accent-primary)]/15",
              error && "border-[var(--danger)]/70 text-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/15",
              disabled && "opacity-50 cursor-not-allowed",
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[11px] font-medium text-[var(--danger)] animate-fadeIn">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInputField.displayName = "AuthInputField";

export default AuthInputField;
