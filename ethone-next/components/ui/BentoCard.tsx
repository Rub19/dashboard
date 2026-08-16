"use client";

import { type ReactNode, type CSSProperties } from "react";
import { Icon } from "@/lib/icons";

type BentoCardProps = {
  children: ReactNode;
  icon?: string;
  title?: string;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export default function BentoCard({
  children,
  icon,
  title,
  action,
  className = "",
  style,
}: BentoCardProps) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden bg-zinc-950/70 backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.16] rounded-2xl p-5 shadow-xl shadow-black/50 transition-all duration-200 group ${className}`}
      style={style}
    >
      <div className="before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent before:pointer-events-none before:rounded-2xl" />
      {title && (
        <div className="relative z-10 border-b border-white/[0.05] pb-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06] text-zinc-300">
                <Icon name={icon} className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{title}</h2>
          </div>
          {action ? <div className="flex items-center">{action}</div> : null}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
