"use client";

export default function LiveWidgetSkeleton() {
  return (
    <div
      className="fixed bottom-12 right-6 z-40 h-10 w-10 rounded-2xl border border-[var(--text-primary)]/[0.08] bg-zinc-950/80"
      aria-hidden="true"
    />
  );
}
