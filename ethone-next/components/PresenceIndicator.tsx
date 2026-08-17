"use client";

import { Icon } from "@/lib/icons";
import { useSettings } from "@/components/SettingsProvider";
import { usePresence, type DerivedPresence } from "@/components/PresenceProvider";

type PresenceIndicatorProps = {
  presence?: DerivedPresence;
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
};

export default function PresenceIndicator({
  presence: prop,
  size = "sm",
  className = "",
  showIcon,
}: PresenceIndicatorProps) {
  const { presence: ctx } = usePresence();
  const { settings } = useSettings();
  const p = prop ?? ctx;

  const reduced = settings.reducedMotion;
  const showIconFlag = showIcon ?? settings.presenceShowSignals ?? false;

  const dotSize =
    size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const ringSize =
    size === "lg" ? "h-5 w-5" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const iconSize =
    size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";

  const pulse = !reduced && p.animate;
  const animation = p.meta?.animation;

  return (
    <span
      className={`relative inline-flex items-center gap-1 ${className}`}
      data-signal={p.dominant}
      data-signal-value={p.value}
      data-presence-pulse={pulse ? "active" : "idle"}
      role="status"
      aria-label={p.label}
    >
      {pulse && (
        <span
          className={`absolute inline-flex ${ringSize} ${
            animation === "spin" ? "animate-spin" : "animate-ping"
          } rounded-full opacity-60 ${p.meta.dot}`}
        />
      )}
      <span
        className={`relative inline-flex ${dotSize} rounded-full ${p.meta.dot} ${
          reduced ? "" : animation === "spin" ? "animate-spin" : "animate-pulse"
        }`}
      />
      {showIconFlag && (
        <Icon name={p.meta.icon} className={`${iconSize} ${p.meta.iconClass}`} />
      )}
      {p.badge !== undefined && p.badge > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-lg bg-[var(--accent)] px-1 text-[8px] font-bold text-white">
          {p.badge > 99 ? "99+" : p.badge}
        </span>
      ) : null}
    </span>
  );
}
