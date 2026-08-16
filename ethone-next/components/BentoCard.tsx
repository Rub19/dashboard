"use client";

import { ReactNode } from "react";
import { Icon } from "@/lib/icons";

export type BentoCardProps = {
  title?: string;
  icon?: string;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  noHeader?: boolean;
};

export default function BentoCard({
  title,
  icon,
  action,
  badge,
  children,
  className = "",
  noHeader,
}: BentoCardProps) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-5 shadow-xl shadow-black/50 backdrop-blur-2xl transition-all duration-200 hover:border-white/[0.16] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" aria-hidden="true" />

      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col">
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
              {action ? (
                action
              ) : (
                <button
                  type="button"
                  className="text-zinc-500 transition-colors hover:text-zinc-300"
                  aria-label="Options"
                >
                  <Icon name="more-horizontal" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
