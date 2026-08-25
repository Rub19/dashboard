"use client";

import { memo, useMemo } from "react";
import { Activity } from "lucide-react";
import LiveFreshness from "@/components/LiveFreshness";
import { useI18n } from "@/lib/hooks/useI18n";
import type { LiveRecord } from "@/lib/hooks/useLiveData";

export type LiveStatsProps = {
  records?: LiveRecord[];
  updatedAt?: Date | null;
  loading?: boolean;
  className?: string;
};

const LiveStats = memo(function LiveStats({ records = [], updatedAt, loading, className = "" }: LiveStatsProps) {
  const i18n = useI18n();

  const byStatus = useMemo(() => {
    let connected = 0;
    let loadingCount = 0;
    let errorCount = 0;
    for (const r of records) {
      if (r.status === "connected") connected++;
      else if (r.status === "loading") loadingCount++;
      else if (r.status === "error") errorCount++;
    }
    return { connected, loading: loadingCount, error: errorCount };
  }, [records]);

  const statItems = useMemo(
    () => [
      { label: i18n("connected"), value: byStatus.connected, color: "text-[var(--accent-primary)]" },
      { label: i18n("pending"), value: byStatus.loading, color: "text-[--info]" },
      { label: i18n("events"), value: records.length, color: "text-[var(--text-primary)]" },
      { label: i18n("error"), value: byStatus.error, color: "text-rose-400" },
    ],
    [i18n, byStatus.connected, byStatus.loading, byStatus.error, records.length]
  );

  return (
    <div
      className={`w-full rounded-2xl v8-panel p-3 shadow-xl backdrop-blur-2xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--text-primary)]/[0.04] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">{i18n("liveStats")}</span>
        </div>
        <LiveFreshness updatedAt={updatedAt} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="v8-inset flex items-center justify-between p-2.5"
          >
            <span className="text-[10px] uppercase text-[var(--text-muted)]">{item.label}</span>
            <span className={`font-mono text-xl font-bold ${item.color}`}>
              {loading ? "-" : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default LiveStats;
