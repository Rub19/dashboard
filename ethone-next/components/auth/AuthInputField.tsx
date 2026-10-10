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
      <div className="space-y-1.5 w-full text-left sm:space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-[var(--text-muted)] select-none">
          {label}
        </label>
        <div className="group relative flex items-center w-full">
          {leftIcon && (
            <div className="pointer-events-none absolute left-4 flex items-center justify-center text-[var(--text-muted)] transition-[color,transform] duration-200 [transition-timing-function:var(--ease-snap)] group-focus-within:scale-110 group-focus-within:text-[var(--accent-primary)]">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            disabled={disabled}
            className={cn(
              "auth-input h-12 w-full sm:h-[3.25rem] rounded-[var(--inset-radius)] border bg-[var(--text-primary)]/[0.035] text-[15px] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-150 [transition-timing-function:var(--ease-snap)] outline-none",
              leftIcon ? "pl-12" : "pl-4",
              rightElement ? "pr-12" : "pr-4",
              "border-[var(--panel-border)] hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.05]",
              "focus:border-[var(--accent-primary)]/60 focus:bg-[var(--text-primary)]/[0.06] focus:ring-4 focus:ring-[var(--accent-primary)]/15",
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
          <p className="text-xs font-medium text-[var(--danger)] animate-fadeIn">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInputField.displayName = "AuthInputField";

export default AuthInputField;
