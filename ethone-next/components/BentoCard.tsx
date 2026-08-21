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
      data-context-menu="bento"
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-[var(--panel-blur)] transition-all duration-200 hover:border-[var(--accent)]/20",
        "h-full min-h-0 w-full overflow-hidden",
        className
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        {!noHeader && (title || icon) && (
          <div className="mb-2 flex flex-none items-center justify-between border-b border-white/[0.05] pb-2">
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
            "flex flex-1 flex-col",
            scrollable ? "os-scroll min-h-0 overflow-y-auto" : "min-h-0 justify-between"
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
