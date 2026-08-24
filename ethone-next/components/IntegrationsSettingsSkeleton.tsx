"use client";

export default function IntegrationsSettingsSkeleton() {
  return (
    <div
      className="h-[28rem] w-full space-y-4 rounded-[var(--panel-radius)] p-4"
      aria-busy="true"
      aria-label="Chargement des intégrations"
    >
      <div className="h-6 w-1/3 rounded-lg bg-[var(--text-primary)]/[0.04]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="h-24 rounded-xl bg-[var(--text-primary)]/[0.04]" />
        <div className="h-24 rounded-xl bg-[var(--text-primary)]/[0.04]" />
        <div className="h-24 rounded-xl bg-[var(--text-primary)]/[0.04]" />
        <div className="h-24 rounded-xl bg-[var(--text-primary)]/[0.04]" />
      </div>
    </div>
  );
}
