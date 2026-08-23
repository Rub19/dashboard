"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic, type HapticProfile } from "@/lib/haptics";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "liquid";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  haptic?: HapticProfile | false;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--accent-primary)] text-[var(--accent-contrast)]",
    "border border-[var(--accent-primary)]",
    "shadow-[0_0_12px_var(--glow-color)]",
    "hover:brightness-110",
  ),
  secondary: cn(
    "liquid-glass-btn text-[var(--text-primary)]",
    "hover:border-[var(--accent-primary)]/30 hover:bg-[var(--accent-primary)]/10",
  ),
  outline: cn(
    "liquid-glass-btn text-[var(--accent-primary)]",
    "border-[var(--accent-primary)]/50",
    "hover:bg-[var(--accent-primary)]/10",
  ),
  ghost: cn("liquid-glass-btn liquid-glass-btn-ghost"),
  danger: cn(
    "liquid-glass-btn liquid-glass-btn-danger",
    "shadow-lg shadow-[var(--danger)]/20",
  ),
  liquid: cn("liquid-glass-btn text-[var(--text-primary)]"),
};

const defaultHaptic: Record<ButtonVariant, HapticProfile> = {
  primary: "medium",
  secondary: "light",
  outline: "light",
  ghost: "light",
  danger: "heavy",
  liquid: "medium",
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
      haptic,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;
    const hapticProfile = haptic === false ? undefined : haptic ?? defaultHaptic[variant];

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hapticProfile) triggerHaptic(hapticProfile);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        onClick={handleClick}
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
