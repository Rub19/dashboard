"use client";

import { useSettings } from "@/components/SettingsProvider";

export type SkeletonProps = {
  className?: string;
  width?: string;
  height?: string;
  circle?: boolean;
};

export default function Skeleton({ className = "", width, height, circle }: SkeletonProps) {
  const { settings } = useSettings();
  return (
    <span
      className={`inline-block animate-pulse bg-[var(--panel-bg)] ${
        settings.reducedMotion ? "" : "skeleton-shimmer"
      } ${circle ? "rounded-full" : "rounded-[var(--panel-radius)]"} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 backdrop-blur-[var(--panel-blur)]" aria-hidden="true">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton width="2.5rem" height="2.5rem" circle />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height="1rem" />
            <Skeleton width="40%" height="0.75rem" />
          </div>
        </div>
        <Skeleton width="100%" height="4rem" />
        <div className="flex gap-2">
          <Skeleton width="30%" height="1.5rem" />
          <Skeleton width="30%" height="1.5rem" />
        </div>
      </div>
      {children}
    </div>
  );
}

export function SkeletonList({ count = 4, label = "Chargement..." }: { count?: number; label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 backdrop-blur-[var(--panel-blur)]">
          <Skeleton width="2rem" height="2rem" circle />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height="0.875rem" />
            <Skeleton width="50%" height="0.625rem" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3, widths = ["100%", "92%", "60%"] }: { lines?: number; widths?: string[] }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={widths[i % widths.length] || "100%"} height="0.875rem" />
      ))}
    </div>
  );
}

export function SkeletonGrid({ columns = 3, rows = 2 }: { columns?: number; rows?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} aria-hidden="true">
      {Array.from({ length: columns * rows }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const map = { sm: "2rem", md: "2.5rem", lg: "4rem" };
  return <Skeleton width={map[size]} height={map[size]} circle />;
}

export function SkeletonPage() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Chargement de la page">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton width="240px" height="1.75rem" />
          <Skeleton width="160px" height="0.875rem" />
        </div>
        <Skeleton width="120px" height="2.5rem" />
      </div>
      <SkeletonGrid columns={3} rows={2} />
      <SkeletonList count={5} />
    </div>
  );
}
