"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RefreshCw, Server, Microchip } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { forceAppReload } from "@/lib/force-reload";
import { Icon } from "@/lib/icons";
import DiagnosticPanel from "./DiagnosticPanel";

function formatMegabytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "N/A";
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} Mo`;
}

function ActionCard({
  onClick,
  loading,
  icon,
  label,
}: {
  onClick: () => void;
  loading?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="group flex min-h-[44px] items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-3 text-left transition-all hover:border-[var(--accent-primary)]/40 hover:bg-[var(--text-primary)]/[0.03] active:scale-[0.98] disabled:opacity-60 backdrop-blur-[var(--panel-blur)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] transition-colors group-hover:bg-[var(--accent-primary)]/15">
        {loading ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : icon}
      </span>
      <span className="min-w-0 flex-1 text-xs font-medium text-[var(--text-primary)]">{label}</span>
    </button>
  );
}

function InfoCard({
  icon,
  label,
  value,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  badge?: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.02] p-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-[var(--text-primary)]">{value ?? "—"}</p>
          {badge && (
            <span className="rounded-full border border-[var(--text-primary)]/[0.06] bg-[var(--text-primary)]/[0.03] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
              {badge}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MaintenancePanel() {
  const i18n = useI18n();
  const [deviceMemory, setDeviceMemory] = useState<string | null>(null);
  const [usedHeap, setUsedHeap] = useState<string | null>(null);
  const [latency, setLatency] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
      setDeviceMemory(`${(navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? "?"} Go`);
    } else {
      setDeviceMemory(i18n("unknown", "Inconnue"));
    }

    const perf = typeof performance !== "undefined" ? (performance as Performance & { memory?: { usedJSHeapSize?: number } }) : undefined;
    setUsedHeap(formatMegabytes(perf?.memory?.usedJSHeapSize));
  }, [i18n]);

  const handleReload = () => {
    forceAppReload();
  };

  const handleResync = async () => {
    setLoading(true);
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      const cb = Date.now();
      await fetch(`/version.json?cb=${cb}`, { cache: "no-store" });

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
      setLatency(`${Math.round(t1 - t0)} ms`);
    } catch {
      setLatency(i18n("error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4" data-section-match>
      <DiagnosticPanel />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <ActionCard
        onClick={handleReload}
        icon={<RotateCcw className="h-4 w-4" />}
        label={i18n("refreshAll") || "Vider le cache et recharger"}
      />
      <ActionCard
        onClick={handleResync}
        loading={loading}
        icon={<RefreshCw className="h-4 w-4" />}
        label={i18n("resyncWorker") || "Resynchroniser avec le Worker"}
      />
      <InfoCard
        icon={<Microchip className="h-4 w-4" />}
        label={i18n("deviceMemory") || "Mémoire appareil"}
        value={deviceMemory}
      />
      <InfoCard
        icon={<Server className="h-4 w-4" />}
        label={i18n("usedHeap") || "Heap JS utilisé"}
        value={usedHeap}
        badge={latency}
      />
    </div>
    </div>
  );
}
