"use client";

export default function SettingsLayoutSkeleton() {
  return (
    <div
      className="relative flex h-[calc(100svh-5rem)] w-full gap-4 p-4"
      aria-label="Chargement des réglages"
      aria-busy="true"
    >
      <div className="hidden w-64 shrink-0 flex-col gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4 md:flex">
        <div className="h-8 w-3/4 rounded-lg bg-white/[0.04]" />
        <div className="space-y-2">
          <div className="h-9 rounded-lg bg-white/[0.04]" />
          <div className="h-9 rounded-lg bg-white/[0.04]" />
          <div className="h-9 rounded-lg bg-white/[0.04]" />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-4 overflow-hidden rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
        <div className="h-8 w-1/3 rounded-lg bg-white/[0.04]" />
        <div className="h-48 rounded-2xl bg-white/[0.04]" />
        <div className="h-48 rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
