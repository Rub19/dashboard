"use client";

import { type ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface SettingsSectionProps {
  id: string;
  icon?: string;
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function SettingsSection({
  id,
  icon,
  title,
  description,
  badge,
  actions,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section
      id={`settings-section-${id}`}
      data-section={id}
      className={cn("flex flex-col gap-6 w-full max-w-4xl pb-12", className)}
    >
      {/* Section Header */}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--panel-border)]/40 pb-5">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shadow-sm">
              <Icon name={icon} className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
              {badge && (
                <span className="rounded-full bg-[var(--accent-primary)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-primary)]">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            {actions}
          </div>
        )}
      </div>

      {/* Section Content */}
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}
