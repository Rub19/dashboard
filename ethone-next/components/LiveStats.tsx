"use client";

import Card3D from "@/components/Card3D";
import LiveFreshness from "@/components/LiveFreshness";
import { useI18n } from "@/lib/hooks/useI18n";
import { useLiveData } from "@/lib/hooks/useLiveData";

export default function LiveStats() {
  const i18n = useI18n();
  const {
    records,
    loading,
    updatedAt,
    lastfmTopArtists,
    lastfmTopTracks,
    steamRecentGames,
    steamOwnedGames,
    minecraftNameHistory,
  } = useLiveData(60000);

  const byStatus = {
    connected: records.filter((r) => r.status === "connected").length,
    loading: records.filter((r) => r.status === "loading").length,
    empty: records.filter((r) => r.status === "empty").length,
    error: records.filter((r) => r.status === "error").length,
  };

  const historyCounts = {
    topArtists: lastfmTopArtists?.length ?? 0,
    topTracks: lastfmTopTracks?.length ?? 0,
    recentGames: steamRecentGames?.length ?? 0,
    ownedGames: steamOwnedGames?.length ?? 0,
    nameHistory: minecraftNameHistory?.length ?? 0,
  };

  const hasHistory = Object.values(historyCounts).some((n) => n > 0);

  return (
    <Card3D>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">{i18n("liveStats")}</h2>
        <LiveFreshness updatedAt={updatedAt} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--panel-radius)] bg-emerald-500/10 p-3 text-emerald-400">
          <p className="text-2xl font-bold">{loading ? "-" : byStatus.connected}</p>
          <p className="text-xs">{i18n("connected")}</p>
        </div>
        <div className="rounded-[var(--panel-radius)] bg-sky-500/10 p-3 text-sky-400">
          <p className="text-2xl font-bold">{loading ? "-" : byStatus.loading}</p>
          <p className="text-xs">{i18n("loading")}</p>
        </div>
        <div className="rounded-[var(--panel-radius)] bg-[var(--surface-raised)] p-3 text-[var(--muted)]">
          <p className="text-2xl font-bold">{loading ? "-" : byStatus.empty}</p>
          <p className="text-xs">{i18n("empty")}</p>
        </div>
        <div className="rounded-[var(--panel-radius)] bg-red-500/10 p-3 text-red-400">
          <p className="text-2xl font-bold">{loading ? "-" : byStatus.error}</p>
          <p className="text-xs">{i18n("error")}</p>
        </div>
      </div>

      {hasHistory && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-[var(--panel-radius)] bg-rose-500/10 p-3 text-rose-400">
            <p className="text-xl font-bold">{historyCounts.topArtists}</p>
            <p className="text-[10px]">{i18n("topArtists")}</p>
          </div>
          <div className="rounded-[var(--panel-radius)] bg-rose-500/10 p-3 text-rose-400">
            <p className="text-xl font-bold">{historyCounts.topTracks}</p>
            <p className="text-[10px]">{i18n("topTracks")}</p>
          </div>
          <div className="rounded-[var(--panel-radius)] bg-sky-500/10 p-3 text-sky-400">
            <p className="text-xl font-bold">{historyCounts.recentGames}</p>
            <p className="text-[10px]">{i18n("recentGames")}</p>
          </div>
          <div className="rounded-[var(--panel-radius)] bg-sky-500/10 p-3 text-sky-400">
            <p className="text-xl font-bold">{historyCounts.ownedGames}</p>
            <p className="text-[10px]">{i18n("ownedGames")}</p>
          </div>
          <div className="rounded-[var(--panel-radius)] bg-emerald-500/10 p-3 text-emerald-400">
            <p className="text-xl font-bold">{historyCounts.nameHistory}</p>
            <p className="text-[10px]">{i18n("nameHistory")}</p>
          </div>
        </div>
      )}
    </Card3D>
  );
}
