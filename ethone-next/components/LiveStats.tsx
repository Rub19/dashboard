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
    { label: i18n("connected"), value: byStatus.connected, color: "text-emerald-400" },
    { label: i18n("pending"), value: byStatus.loading, color: "text-cyan-400" },
    { label: i18n("events"), value: records.length, color: "text-zinc-200" },
    { label: i18n("error"), value: byStatus.error, color: "text-rose-400" },
  ];

  return (
    <div
      className={`w-full rounded-2xl v8-panel p-4 shadow-xl backdrop-blur-2xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.04] pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">{i18n("liveStats")}</span>
        </div>
        <LiveFreshness updatedAt={updatedAt} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {statItems.map((item) => (
          <div
            key={item.label}
            className="v8-inset flex items-center justify-between p-3"
          >
            <span className="text-[10px] uppercase text-zinc-400">{item.label}</span>
            <span className={`font-mono text-xl font-bold ${item.color}`}>
              {loading ? "-" : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
