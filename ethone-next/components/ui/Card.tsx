"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type CardVariant = "default" | "primary" | "secondary" | "interactive" | "widget" | "status";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

const variantClass: Record<CardVariant, string> = {
  default:
    "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] shadow-sm",
  primary:
    "border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/[0.06] text-[var(--text-primary)] shadow-sm",
  secondary:
    "border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)] shadow-sm",
  interactive:
    "border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-primary)] shadow-sm " +
    "transition-[color,background-color,border-color,box-shadow,transform] duration-200 ease-out " +
    "hover:border-[var(--accent-primary)]/20 hover:bg-[var(--text-primary)]/[0.04] hover:shadow-md hover:-translate-y-0.5 " +
    "active:scale-[0.99]",
  widget:
    "border border-[var(--panel-border)] bg-[var(--panel-bg)]/90 text-[var(--text-primary)] shadow-sm",
  status:
    "border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] text-[var(--text-primary)]",
};

const paddingClass = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const radiusClass: Record<CardVariant, string> = {
  default: "rounded-2xl",
  primary: "rounded-2xl",
  secondary: "rounded-2xl",
  interactive: "rounded-2xl",
  widget: "rounded-xl",
  status: "rounded-xl",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = "default", padding = "md", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          radiusClass[variant],
          paddingClass[padding],
          variantClass[variant],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export default Card;
