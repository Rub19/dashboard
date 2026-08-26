"use client";

import Badge, { type BadgeVariant } from "@/components/ui/Badge";

const VARIANT_MAP: Record<string, BadgeVariant> = {
  oauth: "primary",
  api: "info",
  api_key: "info",
  webhook: "warning",
  local: "muted",
  feed: "muted",
  restricted: "warning",
  limited: "warning",
  connected: "connected",
  error: "danger",
  unconfigured: "muted",
  syncing: "synced",
  premium: "pro",
  beta: "beta",
};

type ConnectionBadgeVariant = keyof typeof VARIANT_MAP;

type ConnectionBadgeProps = {
  children: React.ReactNode;
  variant?: ConnectionBadgeVariant;
  dot?: boolean;
  className?: string;
};

export default function ConnectionBadge({ children, variant = "unconfigured", dot, className }: ConnectionBadgeProps) {
  const badgeVariant = VARIANT_MAP[variant] || "muted";
  return (
    <Badge variant={badgeVariant} dot={dot} size="sm" className={className}>
      {children}
    </Badge>
  );
}
