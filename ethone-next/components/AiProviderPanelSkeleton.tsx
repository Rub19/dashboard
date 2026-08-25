"use client";

export default function AiProviderPanelSkeleton() {
  return (
    <div
      className="w-full space-y-4 rounded-[var(--panel-radius)] p-4"
      aria-busy="true"
      aria-label="Chargement des providers IA"
    >
      <div className="h-24 rounded-xl bg-white/[0.04]" />
      <div className="h-24 rounded-xl bg-white/[0.04]" />
      <div className="h-24 rounded-xl bg-white/[0.04]" />
    </div>
  );
}
