"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { triggerHaptic, type HapticProfile } from "@/lib/haptics";

export type IconButtonVariant = "default" | "ghost" | "active";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  haptic?: HapticProfile | false;
}

const variantClass: Record<IconButtonVariant, string> = {
  default: cn(
    "border border-[var(--text-primary)]/[0.08] bg-[var(--text-primary)]/[0.04] text-[var(--text-muted)]",
    "hover:border-[var(--text-primary)]/20 hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
  ),
  ghost: cn(
    "border border-transparent bg-transparent text-[var(--text-muted)]",
    "hover:bg-[var(--text-primary)]/[0.08] hover:text-[var(--text-primary)]"
  ),
  active: cn(
    "border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]",
    "hover:bg-[var(--accent-primary)]/20"
  ),
};

const sizeClass: Record<IconButtonSize, string> = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-xl",
  lg: "h-10 w-10 rounded-xl",
};

const defaultHaptic: Record<IconButtonVariant, HapticProfile> = {
  default: "light",
  ghost: "light",
  active: "medium",
};

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { children, className, variant = "default", size = "md", haptic, onClick, ...props },
    ref,
  ) => {
    const hapticProfile = haptic === false ? undefined : haptic ?? defaultHaptic[variant];

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (hapticProfile) triggerHaptic(hapticProfile);
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={variant === "active" ? "true" : undefined}
        onClick={handleClick}
        className={cn(
          "inline-flex items-center justify-center",
          "transition-[color,background-color,border-color,opacity,transform] duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:outline-none",
          "active:scale-95",
          sizeClass[size],
          variantClass[variant],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
