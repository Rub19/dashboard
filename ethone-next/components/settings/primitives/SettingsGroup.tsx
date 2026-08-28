"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SettingsGroupProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "card" | "subtle";
}

export default function SettingsGroup({
  title,
  description,
  action,
  children,
  className,
  variant = "card",
}: SettingsGroupProps) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {(title || description || action) && (
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            {title && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[11px] text-[var(--text-muted)]">
                {description}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      <div
        className={cn(
          "divide-y divide-[var(--panel-border)]/40 overflow-hidden rounded-2xl transition-all",
          variant === "card" &&
            "border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/40 backdrop-blur-md shadow-sm",
          variant === "subtle" &&
            "border border-[var(--panel-border)]/30 bg-[var(--surface-sunken)]/30",
          variant === "default" && "border border-[var(--panel-border)]/50"
        )}
      >
        {children}
      </div>
    </div>
  );
}
