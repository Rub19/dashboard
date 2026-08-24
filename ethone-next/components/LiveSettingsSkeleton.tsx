"use client";

export default function LiveSettingsSkeleton() {
  return (
    <div
      className="w-full space-y-4 rounded-[var(--panel-radius)] p-4"
      aria-busy="true"
      aria-label="Chargement des réglages live"
    >
      <div className="h-10 w-2/3 rounded-xl bg-[var(--text-primary)]/[0.04]" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="h-12 rounded-lg bg-[var(--text-primary)]/[0.04]" />
        <div className="h-12 rounded-lg bg-[var(--text-primary)]/[0.04]" />
      </div>
      <div className="h-24 rounded-xl bg-[var(--text-primary)]/[0.04]" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="h-10 rounded-lg bg-[var(--text-primary)]/[0.04]" />
        <div className="h-10 rounded-lg bg-[var(--text-primary)]/[0.04]" />
        <div className="h-10 rounded-lg bg-[var(--text-primary)]/[0.04]" />
        <div className="h-10 rounded-lg bg-[var(--text-primary)]/[0.04]" />
      </div>
    </div>
  );
}
