"use client";

import { memo, type ReactNode } from "react";
import { Icon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { hapticLightImpact } from "@/lib/haptics";
import WidgetState, { type WidgetStateType } from "./WidgetState";

export type BentoCardProps = {
  title?: string;
  icon?: string;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  noHeader?: boolean;
  scrollable?: boolean;
  state?: WidgetStateType;
  stateMessage?: string;
  onAction?: () => void;
  actionLabel?: string;
};

function BentoCard({
  title,
  icon,
  action,
  badge,
  children,
  className = "",
  noHeader,
  scrollable = true,
  state,
  stateMessage,
  onAction,
  actionLabel,
}: BentoCardProps) {
  return (
    <div
      data-context-menu="bento"
      onPointerDown={hapticLightImpact}
      className={cn(
        "group v8-panel relative flex w-full flex-col p-4 transition-[border-color,box-shadow] duration-200 hover:border-[var(--accent-primary)]/20",
        "h-full min-h-0 w-full",
        className
      )}
    >
      <div className="relative z-10 flex flex-1 flex-col min-h-0">
        {!noHeader && (title || icon) && (
          <div className="mb-2 flex flex-none items-center justify-between border-b border-[var(--text-primary)]/[0.08] pb-2">
            <div className="flex items-center gap-2.5">
              {icon && (
                <span className="flex h-7 w-7 items-center justify-center text-[var(--accent-primary)]">
                  <Icon name={icon} pack="phosphor" className="h-4 w-4" />
                </span>
              )}
              {title && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
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
          {state ? (
            <WidgetState
              state={state}
              title={title}
              icon={icon}
              message={stateMessage}
              onAction={onAction}
              actionLabel={actionLabel}
              compact
            />
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

const MemoizedBentoCard = memo(BentoCard);
export default MemoizedBentoCard;
