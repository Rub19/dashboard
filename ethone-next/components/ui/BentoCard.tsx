"use client";

import { memo, type ReactNode, type CSSProperties } from "react";
import { Icon } from "@/lib/icons";

type BentoCardProps = {
  children: ReactNode;
  icon?: string;
  title?: string;
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function BentoCard({
  children,
  icon,
  title,
  action,
  className = "",
  style,
}: BentoCardProps) {
  return (
    <div
      className={`group relative min-w-0 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-[var(--panel-blur)] transition-[transform,opacity,border-color,background-color] duration-200 hover:border-[var(--accent)]/20 ${className}`}
      style={style}
    >
      {title && (
        <div className="relative z-10 mb-2 flex items-center justify-between border-b border-white/[0.05] pb-2">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-zinc-300">
                <Icon name={icon} className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">{title}</h2>
          </div>
          {action ? <div className="flex items-center">{action}</div> : null}
        </div>
      )}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export default memo(BentoCard);
