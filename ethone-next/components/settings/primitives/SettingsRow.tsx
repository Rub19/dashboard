"use client";

import { type ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface SettingsRowProps {
  icon?: string;
  label: string;
  description?: ReactNode;
  badge?: string;
  control?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  align?: "center" | "top";
}

export default function SettingsRow({
  icon,
  label,
  description,
  badge,
  control,
  children,
  onClick,
  disabled = false,
  className,
  align = "center",
}: SettingsRowProps) {
  const isClickable = Boolean(onClick) && !disabled;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "flex min-h-[56px] w-full gap-4 px-4 py-3.5 transition-colors duration-150",
        align === "center" ? "items-center" : "items-start",
        isClickable
          ? "cursor-pointer hover:bg-[var(--surface-hover)]/60 active:bg-[var(--surface-active)]/80"
          : "",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-sunken)]/80 text-[var(--text-secondary)]">
          <Icon name={icon} className="h-4 w-4" />
        </div>
      )}

      {/* Label & Description */}
      <div className="flex min-w-0 flex-1 flex-col justify-center text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {label}
          </span>
          {badge && (
            <span className="rounded-md bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-primary)]">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <div className="text-xs text-[var(--text-muted)] leading-relaxed mt-0.5">
            {description}
          </div>
        )}
      </div>

      {/* Control / Action */}
      {(control || children) && (
        <div className="flex shrink-0 items-center gap-2">
          {control}
          {children}
        </div>
      )}
    </div>
  );
}
