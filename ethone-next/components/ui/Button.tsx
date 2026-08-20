"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--accent-primary)] text-[var(--accent-contrast)]",
    "shadow-[0_0_15px_var(--glow-color)]",
    "hover:opacity-90",
    "active:scale-[0.98]",
  ),
  secondary: cn(
    "bg-[var(--text-primary)]/4 text-[var(--text-primary)]",
    "border border-[var(--panel-border)]",
    "hover:bg-[var(--text-primary)]/8 hover:border-[var(--accent-primary)]/40",
    "active:scale-[0.98]",
  ),
  outline: cn(
    "bg-transparent text-[var(--accent-primary)]",
    "border border-[var(--accent-primary)]",
    "hover:bg-[var(--accent-primary)]/10",
    "active:scale-[0.98]",
  ),
  ghost: cn(
    "bg-transparent text-[var(--text-primary)]",
    "hover:bg-[var(--text-primary)]/6 hover:text-[var(--text-primary)]",
    "active:scale-[0.98]",
  ),
  danger: cn(
    "bg-[var(--danger)] text-[var(--text-primary)]",
    "shadow-lg shadow-[var(--danger)]/20",
    "hover:bg-[var(--danger)]/90",
    "active:scale-[0.98]",
  ),
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[11px] gap-1.5 rounded-lg",
  md: "h-9 px-3 text-xs gap-2 rounded-xl",
  lg: "h-10 px-4 text-sm gap-2 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          "relative inline-flex items-center justify-center whitespace-nowrap font-semibold",
          "transition-all duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          sizeClass[size],
          variantClass[variant],
          className,
        )}
        {...props}
      >
        {isLoading && (
          <Loader2
            className={`h-3.5 w-3.5 animate-spin ${(leftIcon || rightIcon) ? "mr-1.5" : ""}`}
            aria-hidden="true"
          />
        )}
        {!isLoading && leftIcon && (
          <span className="inline-flex shrink-0 items-center justify-center" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0 items-center justify-center" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
