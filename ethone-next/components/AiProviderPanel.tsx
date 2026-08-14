"use client";

import { useAiStatus } from "@/lib/hooks/useAiStatus";

function formatPercent(value: number) {
  return `${Math.round((value || 0) * 100)}%`;
}

export function AiProviderPanel() {
  const { status, quota, loading, error } = useAiStatus();

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Chargement des providers IA...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
        Impossible de charger l'état IA.
      </div>
    );
  }

  const primary = status?.providers.find((p) => p.id === status?.primary);
  const fallback = status?.providers.find((p) => p.id === status?.fallback);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Primary AI</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium">{primary?.label || status?.primary || "Cloudflare Workers AI"}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">{primary?.defaultModel || status?.cloudflare?.model}</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Fallback AI</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${fallback ? "bg-amber-500" : "bg-red-500"}`} />
          <span className="text-sm font-medium">{fallback?.label || status?.fallback || "Non configuré"}</span>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">{fallback?.defaultModel}</p>
      </div>

      {quota && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Cloudflare Quota</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>{Math.round(quota.used)} / {quota.budget} neurons</span>
            <span className={`font-medium ${quota.exhausted ? "text-red-400" : quota.prepare ? "text-amber-400" : quota.warning ? "text-yellow-400" : "text-emerald-400"}`}>
              {formatPercent(quota.percent)}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface)]">
            <div
              className={`h-full transition-all ${quota.exhausted ? "bg-red-500" : quota.prepare ? "bg-amber-500" : quota.warning ? "bg-yellow-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, Math.round(quota.percent * 100))}%` }}
            />
          </div>
          {quota.exhausted && (
            <p className="mt-2 text-xs text-red-400">Quota interne atteint. Le fallback est actif.</p>
          )}
        </div>
      )}
    </div>
  );
}
