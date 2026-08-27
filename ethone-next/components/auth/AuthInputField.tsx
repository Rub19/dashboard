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
        <label htmlFor={id} className="block text-xs font-medium text-zinc-400 select-none">
          {label}
        </label>
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-zinc-400">
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            disabled={disabled}
            className={cn(
              "h-12 w-full rounded-2xl border bg-white/[0.035] text-sm text-white placeholder-zinc-500 transition-all duration-150 outline-none",
              leftIcon ? "pl-11" : "pl-4",
              rightElement ? "pr-11" : "pr-4",
              "border-white/10 hover:border-white/20",
              "focus:border-emerald-500/60 focus:bg-white/[0.06] focus:ring-4 focus:ring-emerald-500/15",
              error && "border-rose-500/70 text-rose-300 focus:border-rose-500 focus:ring-rose-500/15",
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
          <p className="text-[11px] font-medium text-rose-400 animate-fadeIn">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInputField.displayName = "AuthInputField";

export default AuthInputField;
