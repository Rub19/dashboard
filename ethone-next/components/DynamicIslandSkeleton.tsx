"use client";

export default function DynamicIslandSkeleton() {
  return (
    <div
      className="fixed top-2 left-1/2 z-[var(--z-dynamic-island)] h-10 w-32 -translate-x-1/2 rounded-full border border-[var(--text-primary)]/[0.08] bg-[var(--bg-main)]/80"
      aria-hidden="true"
    />
  );
}
