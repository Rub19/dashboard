"use client";

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

export default function LiveStats({ records = [], updatedAt, loading, className = "" }: LiveStatsProps) {
  const i18n = useI18n();

  const byStatus = {
    connected: records.filter((r) => r.status === "connected").length,
    loading: records.filter((r) => r.status === "loading").length,
    error: records.filter((r) => r.status === "error").length,
  };

  const statItems = [
    { label: i18n("connected"), value: byStatus.connected, color: "text-[--accent-primary]" },
    { label: i18n("pending"), value: byStatus.loading, color: "text-[--info]" },
    { label: i18n("events"), value: records.length, color: "text-[var(--text-primary)]" },
    { label: i18n("error"), value: byStatus.error, color: "text-rose-400" },
  ];

  return (
    <div
      className={`w-full rounded-2xl v8-panel p-3 shadow-xl backdrop-blur-2xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--text-primary)]/[0.04] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[--accent-primary]" />
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
}
