"use client";

import { memo, type ReactNode, type CSSProperties } from "react";
import { Icon } from "@/lib/icons";
import { hapticLightImpact } from "@/lib/haptics";

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
      onPointerDown={hapticLightImpact}
      className={`group liquid-glass-card relative flex min-h-0 w-full flex-col rounded-2xl p-4 active:scale-[0.995] ${className}`}
      style={style}
    >
      {title && (
        <div className="relative z-10 mb-2 flex shrink-0 items-center justify-between border-b border-[var(--text-primary)]/[0.05] pb-2">
          <div className="flex items-center gap-2.5">
            {icon && (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.04] text-[var(--text-primary)]">
                <Icon name={icon} className="h-4 w-4" />
              </span>
            )}
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">{title}</h2>
          </div>
          {action ? <div className="flex items-center">{action}</div> : null}
        </div>
      )}
      <div className="relative z-10 min-h-0 flex-1 flex flex-col">{children}</div>
    </div>
  );
}

export default memo(BentoCard);
