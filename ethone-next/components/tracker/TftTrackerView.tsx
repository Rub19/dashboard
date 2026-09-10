"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Search, Clock, AlertCircle, User, Trophy, Crown, Target } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { fetchWorker } from "@/lib/api";
import { type TftMatch, fetchTftMatchesDirect } from "@/lib/tft-tracker";
import TftMatchRow from "@/components/tracker/TftMatchRow";
import { cn } from "@/lib/utils";

const CACHE_TTL_MS = 15 * 60 * 1000;

export default function TftTrackerView() {
  const { settings } = useSettings();
  const [riotName, setRiotName] = useState(settings.liveTrackerRiotName || "");
  const [riotTag, setRiotTag] = useState(settings.liveTrackerRiotTag || "");
  const [matches, setMatches] = useState<TftMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cacheKey = useMemo(
    () => `ethone-tft-cache:${riotName.toLowerCase().trim()}:${riotTag.toLowerCase().trim()}`,
    [riotName, riotTag]
  );

  const fetchMatches = useCallback(
    async (force = false) => {
      const cleanName = riotName.trim();
      const cleanTag = riotTag.trim().replace(/^#/, "");
      if (!cleanName || !cleanTag) {
        setMatches([]);
        return;
      }

      if (!force) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw) as { matches: TftMatch[]; timestamp: number };
            if (Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.matches)) {
              setMatches(parsed.matches);
              setLastSyncTime(new Date(parsed.timestamp));
              return;
            }
          }
        } catch {}
      }

      if (force) setSyncing(true);
      else setLoading(true);
      setErrorMsg(null);

      let riotApiKey: string | null = null;
      if (typeof window !== "undefined") {
        riotApiKey =
          localStorage.getItem("ethone:cred:riot:riotApiKey") ||
          localStorage.getItem("ethone:cred:lol:apiKey") ||
          localStorage.getItem("ethone:cred:riotgames:apiKey") ||
          localStorage.getItem("RIOT_API_KEY");
        if (!riotApiKey) {
          const generic = localStorage.getItem("ethone:cred:riot:apiKey");
          if (generic && !generic.startsWith("HDEV-")) riotApiKey = generic;
        }
      }

      try {
        let list: TftMatch[] = [];
        try {
          list = await fetchTftMatchesDirect(cleanName, cleanTag, riotApiKey);
        } catch {
          try {
            const res = await fetchWorker(
              `/api/stats/tft-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
            );
            const rawList = (res?.data?.matches || res?.data || res?.matches || res || []) as TftMatch[];
            list = Array.isArray(rawList) ? rawList : [];
          } catch {
            list = [];
          }
        }

        setMatches(list);
        setLastSyncTime(new Date());
        if (list.length === 0) setErrorMsg("Aucune partie TFT trouvée. Vérifie le Riot ID (et l'API Riot si tu utilises ta clé perso).");
        else {
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ matches: list, timestamp: Date.now() }));
          } catch {}
        }
      } catch {
        setErrorMsg("Impossible de charger les parties TFT pour le moment.");
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [riotName, riotTag, cacheKey]
  );

  useEffect(() => {
    fetchMatches(false);
  }, [fetchMatches]);

  const stats = useMemo(() => {
    const withMe = matches.filter((m) => m.me);
    if (withMe.length === 0) return null;
    const placements = withMe.map((m) => m.me!.placement);
    const avg = placements.reduce((a, b) => a + b, 0) / placements.length;
    const top4 = placements.filter((p) => p <= 4).length;
    const firsts = placements.filter((p) => p === 1).length;
    return {
      games: withMe.length,
      avg: Math.round(avg * 10) / 10,
      top4Rate: Math.round((top4 / withMe.length) * 100),
      firstRate: Math.round((firsts / withMe.length) * 100),
    };
  }, [matches]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchMatches(true);
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden space-y-4">
      <div className="shrink-0 rounded-3xl border border-white/10 bg-[#0c0d14]/90 p-4 backdrop-blur-2xl shadow-lg">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                placeholder="TAG"
                className="w-full bg-transparent font-mono text-xs font-bold text-white placeholder-zinc-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || syncing}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-indigo-500 hover:to-violet-500 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Analyser</span>
            </button>
          </div>
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
              <RefreshCw className={cn("h-3.5 w-3.5 text-indigo-400", syncing && "animate-spin")} />
              <span>{syncing ? "Synchro..." : "Actualiser"}</span>
            </button>
          </div>
        </form>
      </div>

      {stats && (
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Parties", value: String(stats.games), icon: Target, tone: "text-zinc-300" },
            { label: "Placement moyen", value: `${stats.avg}`, icon: Trophy, tone: stats.avg <= 4 ? "text-emerald-400" : "text-rose-400" },
            { label: "Top 4", value: `${stats.top4Rate}%`, icon: Trophy, tone: "text-emerald-400" },
            { label: "Tops 1", value: `${stats.firstRate}%`, icon: Crown, tone: "text-amber-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-[#0c1017]/85 p-3.5 backdrop-blur-xl">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <s.icon className={cn("h-3.5 w-3.5", s.tone)} />
                {s.label}
              </div>
              <div className={cn("mt-1 text-xl font-bold", s.tone)}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-3 pr-1 pb-6 [overscroll-behavior:contain] [touch-action:pan-y]">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-white/[0.02]" />
            ))}
          </div>
        ) : errorMsg && matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <AlertCircle className="mb-2 h-6 w-6 text-rose-400" />
            <p className="max-w-sm text-sm">{errorMsg}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <Trophy className="mb-2 h-6 w-6 text-zinc-600" />
            <p className="text-sm">Entre ton Riot ID pour voir ton historique Teamfight Tactics.</p>
          </div>
        ) : (
          matches.map((m) => <TftMatchRow key={m.id} match={m} />)
        )}
      </div>
    </div>
  );
}
