"use client";

import { ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export type BentoCardProps = {
  title?: string;
  icon?: string;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  noHeader?: boolean;
  scrollable?: boolean;
};

export default function BentoCard({
  title,
  icon,
  action,
  badge,
  children,
  className = "",
  noHeader,
  scrollable = true,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "group relative w-full rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 shadow-xl shadow-black/50 backdrop-blur-[var(--panel-blur)] transition-all duration-200 hover:border-[var(--accent)]/20",
        scrollable ? "h-full overflow-hidden" : "h-auto min-h-fit overflow-visible",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent"
        aria-hidden="true"
      />

      <div
        className={cn(
          "relative z-10 flex flex-col",
          scrollable ? "h-full min-h-0 flex-1" : "h-auto overflow-visible"
        )}
      >
        {!noHeader && (title || icon) && (
          <div className="mb-4 flex flex-none items-center justify-between border-b border-white/[0.05] pb-3">
            <div className="flex items-center gap-2.5">
              {icon && (
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-300">
                  <Icon name={icon} className="h-4 w-4" />
                </span>
              )}
              {title && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  {title}
                </h3>
              )}
            </div>

            <div className="flex items-center gap-2">
              {badge}
              {action}
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex flex-col",
            scrollable ? "os-scroll min-h-0 flex-1 overflow-y-auto" : "h-auto overflow-visible"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
