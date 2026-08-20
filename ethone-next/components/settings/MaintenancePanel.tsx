"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RefreshCw, Server, Microchip } from "lucide-react";
import { useI18n } from "@/lib/hooks/useI18n";
import { forceAppReload } from "@/lib/force-reload";
import { Icon } from "@/lib/icons";

function formatMegabytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return "N/A";
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} Mo`;
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
    <div className="space-y-4 p-4" data-section-match>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleReload}
          className="flex items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/3 px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--text-primary)]/5"
        >
          <RotateCcw className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          {i18n("refreshAll") || "Vider le cache et recharger"}
        </button>

        <button
          type="button"
          onClick={handleResync}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/3 px-4 py-2.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent-primary)]/50 hover:bg-[var(--text-primary)]/5 disabled:opacity-50"
        >
          {loading ? (
            <Icon name="loader-2" className="h-3.5 w-3.5 animate-spin text-[var(--accent-primary)]" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          )}
          {i18n("resyncWorker") || "Resynchroniser avec le Worker"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <Microchip className="h-4 w-4 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-[var(--muted)]">{i18n("deviceMemory") || "Mémoire appareil"}</p>
            <p className="text-xs font-medium text-[var(--foreground)]">{deviceMemory}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[var(--panel-radius)] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
          <Server className="h-4 w-4 text-[var(--accent)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-[var(--muted)]">{i18n("usedHeap") || "Heap JS utilisé"}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-[var(--foreground)]">{usedHeap}</p>
              {latency && (
                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                  {latency}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
