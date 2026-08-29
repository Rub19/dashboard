"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Shield,
  Clock,
  AlertCircle,
  User,
  Activity,
  Trophy,
} from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import {
  type LolMatch,
  groupLolMatchesByDate,
  fetchLolMatchesDirect,
  LOL_QUEUES,
} from "@/lib/lol-tracker";
import LolMatchRow from "@/components/tracker/LolMatchRow";
import LolDayHeader from "@/components/tracker/LolDayHeader";
import DailyReportModal from "@/components/tracker/DailyReportModal";
import TrackerModeDropdown from "@/components/tracker/TrackerModeDropdown";
import { cn } from "@/lib/utils";

const LOL_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface CacheData {
  matches: LolMatch[];
  timestamp: number;
}

export default function LolTrackerView() {
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();

  const [riotName, setRiotName] = useState(settings.liveTrackerRiotName || "Rub19");
  const [riotTag, setRiotTag] = useState(settings.liveTrackerRiotTag || "Boss");
  const [selectedQueue, setSelectedQueue] = useState<string>("all");

  const [matches, setMatches] = useState<LolMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeReportIndex, setActiveReportIndex] = useState<number | null>(null);

  const cacheKey = useMemo(
    () => `ethone-lol-cache:${riotName.toLowerCase().trim()}:${riotTag.toLowerCase().trim()}:${selectedQueue}`,
    [riotName, riotTag, selectedQueue]
  );

  const fetchMatches = useCallback(
    async (force = false) => {
      const cleanName = riotName.trim();
      const cleanTag = riotTag.trim().replace(/^#/, "");

      if (!cleanName || !cleanTag) {
        setMatches([]);
        return;
      }

      // Check LocalStorage cache
      if (!force) {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const parsed: CacheData = JSON.parse(cachedRaw);
            if (Date.now() - parsed.timestamp < LOL_CACHE_TTL_MS && Array.isArray(parsed.matches)) {
              setMatches(parsed.matches);
              setLastSyncTime(new Date(parsed.timestamp));
              setLoading(false);
              return;
            }
          }
        } catch {}
      }

      if (force) setSyncing(true);
      else setLoading(true);
      setErrorMsg(null);

      const riotApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("ethone:cred:riot:riotApiKey") ||
            localStorage.getItem("ethone:cred:riot:apiKey")
          : null;

      try {
        let validMatches: LolMatch[] = [];

        // 1. Direct Riot API call
        try {
          validMatches = await fetchLolMatchesDirect(cleanName, cleanTag, selectedQueue, riotApiKey);
        } catch (directErr) {
          // 2. Fallback to Cloudflare Worker
          try {
            const queueParam = selectedQueue !== "all" ? `&mode=${encodeURIComponent(selectedQueue)}` : "";
            const res = await fetchWorker(
              `/api/stats/lol-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}${queueParam}`
            );
            const rawList = (res?.data?.matches || res?.data || res?.matches || res || []) as LolMatch[];
            validMatches = Array.isArray(rawList) ? rawList : [];
          } catch {
            validMatches = [];
          }
        }

        setMatches(validMatches);
        setLastSyncTime(new Date());

        if (validMatches.length > 0) {
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                matches: validMatches,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }

        if (force) {
          if (validMatches.length > 0) {
            success(`${validMatches.length} parties LoL actualisées`);
          } else {
            showError(`Aucune partie LoL trouvée pour ${cleanName}#${cleanTag}`);
          }
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la récupération des données LoL");
        setMatches([]);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [riotName, riotTag, selectedQueue, cacheKey, success, showError]
  );

  useEffect(() => {
    fetchMatches(false);
  }, [fetchMatches]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({
      liveTrackerRiotName: riotName.trim(),
      liveTrackerRiotTag: riotTag.trim().replace(/^#/, ""),
    });
    fetchMatches(true);
  };

  const dayGroups = useMemo(() => groupLolMatchesByDate(matches), [matches]);

  // Global aggregate stats
  const totalCount = matches.length;
  const totalWins = matches.filter((m) => m.metadata?.result?.toLowerCase() === "victory").length;
  const totalLosses = totalCount - totalWins;
  const winRate = totalCount > 0 ? ((totalWins / totalCount) * 100).toFixed(1) : "0.0";

  let sumDpm = 0;
  let sumDamageTotal = 0;
  let sumKills = 0;
  let sumDeaths = 0;
  let sumAssists = 0;
  let sumGpm = 0;
  let sumGoldTotal = 0;

  matches.forEach((m) => {
    const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
    const k = me?.stats?.kills || m.segments?.[0]?.stats?.kills?.value || 0;
    const d = me?.stats?.deaths || m.segments?.[0]?.stats?.deaths?.value || 0;
    const a = me?.stats?.assists || m.segments?.[0]?.stats?.assists?.value || 0;
    const dpm = me?.stats?.damagePerMin || m.segments?.[0]?.stats?.damagePerMin?.value || 400;
    const dmg = me?.stats?.damage || m.segments?.[0]?.stats?.totalDamageDealtToChampions?.value || 15000;
    const gpm = me?.stats?.goldPerMin || m.segments?.[0]?.stats?.goldPerMin?.value || 350;
    const gold = me?.stats?.gold || 10000;

    sumKills += k;
    sumDeaths += d;
    sumAssists += a;
    sumDpm += dpm;
    sumDamageTotal += dmg;
    sumGpm += gpm;
    sumGoldTotal += gold;
  });

  const avgDpm = totalCount > 0 ? Math.round(sumDpm / totalCount) : 0;
  const avgDmgMatch = totalCount > 0 ? (sumDamageTotal / totalCount).toFixed(1) : "0";
  const avgKills = totalCount > 0 ? (sumKills / totalCount).toFixed(1) : "0";
  const avgDeaths = totalCount > 0 ? (sumDeaths / totalCount).toFixed(1) : "0";
  const avgAssists = totalCount > 0 ? (sumAssists / totalCount).toFixed(1) : "0";
  const avgKda = sumDeaths === 0 ? (sumKills + sumAssists).toFixed(2) : ((sumKills + sumAssists) / sumDeaths).toFixed(2);
  const avgGpm = totalCount > 0 ? Math.round(sumGpm / totalCount) : 0;
  const avgGoldMatch = totalCount > 0 ? (sumGoldTotal / totalCount).toFixed(1) : "0";

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="shrink-0 rounded-3xl border border-white/10 bg-[#0c0d14]/90 p-4 backdrop-blur-2xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Riot ID Input */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 flex-1 min-w-[180px]">
              <User className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={riotName}
                onChange={(e) => setRiotName(e.target.value)}
                placeholder="Riot Name (ex: Rub19)"
                className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 w-28 shrink-0">
              <span className="text-xs font-bold text-zinc-500">#</span>
              <input
                type="text"
                value={riotTag}
                onChange={(e) => setRiotTag(e.target.value)}
                placeholder="TAG (ex: Boss)"
                className="w-full bg-transparent font-mono text-xs font-bold text-white placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Queue Selector */}
            <TrackerModeDropdown
              options={LOL_QUEUES}
              selectedId={selectedQueue}
              onSelect={(id) => setSelectedQueue(id)}
              accentColor="amber"
            />

            <button
              type="submit"
              disabled={loading || syncing}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-amber-500 hover:to-yellow-500 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Analyser</span>
            </button>
          </div>

          {/* Sync & Cache Indicator */}
          <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
            {lastSyncTime && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                <Clock className="h-3 w-3 text-zinc-500" />
                <span>Mis en cache ({lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchMatches(true)}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-amber-400", syncing && "animate-spin")} />
              <span>{syncing ? "Synchro..." : "Actualiser"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Top Global Summary Banner (Matching Screenshot) */}
      {matches.length > 0 && (
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Win Rate */}
          <div className="rounded-2xl border border-white/10 bg-[#0c1017]/85 p-3.5 backdrop-blur-xl">
            <span className="block text-[11px] font-bold text-zinc-400">
              Win Rate <span className="text-sm font-black text-white">{winRate}%</span>
            </span>
            <div className="mt-1 flex items-center gap-1 font-mono text-[10px] font-bold">
              <span className="rounded bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5">
                {totalWins} W
              </span>
              <span className="text-zinc-600">{"//"}</span>
              <span className="rounded bg-rose-500/15 text-rose-400 px-1.5 py-0.5">
                {totalLosses} L
              </span>
            </div>
          </div>

          {/* Avg DPM */}
          <div className="rounded-2xl border border-white/10 bg-[#0c1017]/85 p-3.5 backdrop-blur-xl">
            <span className="block text-[11px] font-bold text-zinc-400">
              Avg DPM <span className="text-sm font-black text-white">{avgDpm}</span>
            </span>
            <span className="block mt-1 font-mono text-[10px] text-zinc-500">
              {avgDmgMatch} Damage/Match
            </span>
          </div>

          {/* Avg KDA */}
          <div className="rounded-2xl border border-white/10 bg-[#0c1017]/85 p-3.5 backdrop-blur-xl">
            <span className="block text-[11px] font-bold text-zinc-400">
              Avg KDA <span className="text-sm font-black text-white">{avgKda}</span>
            </span>
            <span className="block mt-1 font-mono text-[10px] text-zinc-500">
              {avgKills} {"//"} {avgDeaths} {"//"} {avgAssists}
            </span>
          </div>

          {/* Avg GPM */}
          <div className="rounded-2xl border border-white/10 bg-[#0c1017]/85 p-3.5 backdrop-blur-xl">
            <span className="block text-[11px] font-bold text-zinc-400">
              Avg GPM <span className="text-sm font-black text-white">{avgGpm}</span>
            </span>
            <span className="block mt-1 font-mono text-[10px] text-zinc-500">
              {avgGoldMatch} Gold/Match
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area: Date Groups & Matches */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6 pr-1">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]"
              />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400 mb-3 shadow-md">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-white">Erreur de chargement League of Legends</h4>
            <p className="mt-1 max-w-sm text-xs text-zinc-400">{errorMsg}</p>
          </div>
        ) : dayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 mb-3">
              <Shield className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-white">Aucune partie trouvée</h4>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Vérifiez votre Riot ID (ex: Rub19#Boss) ci-dessus pour charger vos statistiques League of Legends officielles.
            </p>
          </div>
        ) : (
          dayGroups.map((group, gi) => (
            <div key={group.rawDate || gi} className="space-y-2">
              {/* Day Header */}
              <LolDayHeader
                group={group}
                onViewReport={() => setActiveReportIndex(gi)}
              />

              {/* Match Rows */}
              <div className="space-y-2">
                {group.matches.map((match, mi) => (
                  <LolMatchRow
                    key={match.id || `${gi}-${mi}`}
                    match={match}
                    index={mi}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Daily Report Modal with Animations */}
      {activeReportIndex !== null && dayGroups[activeReportIndex] && (
        <DailyReportModal
          isOpen={true}
          onClose={() => setActiveReportIndex(null)}
          game="lol"
          currentGroup={dayGroups[activeReportIndex]}
          previousGroup={dayGroups[activeReportIndex + 1] || null}
        />
      )}
    </div>
  );
}
