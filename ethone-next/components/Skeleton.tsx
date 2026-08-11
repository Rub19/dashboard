"use client";

import { useSettings } from "@/components/SettingsProvider";

type SkeletonProps = {
  className?: string;
  width?: string;
  height?: string;
  circle?: boolean;
};

export default function Skeleton({ className = "", width, height, circle }: SkeletonProps) {
  const { settings } = useSettings();
  return (
    <span
      className={`inline-block animate-pulse bg-[var(--surface-raised)] ${
        settings.reducedMotion ? "" : "skeleton-shimmer"
      } ${circle ? "rounded-full" : "rounded-xl"} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" aria-hidden="true">
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

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
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
