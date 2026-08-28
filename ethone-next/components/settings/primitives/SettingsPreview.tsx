"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SettingsPreviewProps {
  title?: string;
  badge?: string;
  children: ReactNode;
  className?: string;
}

export default function SettingsPreview({
  title,
  badge = "Aperçu en direct",
  children,
  className,
}: SettingsPreviewProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--panel-border)]/60 bg-[var(--surface-raised)]/30 p-4 sm:p-5 backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        {title && (
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {title}
          </span>
        )}
        {badge && (
          <span className="rounded-full bg-[var(--accent-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--accent-primary)]">
            {badge}
          </span>
        )}
      </div>
      <div className="flex w-full items-center justify-center min-h-[120px] rounded-xl border border-[var(--panel-border)]/40 bg-[var(--background-deep)]/40 p-4">
        {children}
      </div>
    </div>
  );
}
