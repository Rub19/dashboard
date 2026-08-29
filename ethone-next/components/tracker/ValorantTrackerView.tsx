"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Search,
  Swords,
  Trophy,
  Shield,
  Zap,
  Target,
  Sparkles,
  AlertCircle,
  Clock,
  ChevronRight,
  User,
} from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import {
  type ValorantMatch,
  groupMatchesByDate,
  fetchValorantMatchesDirect,
} from "@/lib/valorant-tracker";
import ValorantMatchRow from "@/components/tracker/ValorantMatchRow";
import ValorantDayHeader from "@/components/tracker/ValorantDayHeader";
import { cn } from "@/lib/utils";

const VALORANT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

interface CacheData {
  matches: ValorantMatch[];
  timestamp: number;
}

export default function ValorantTrackerView() {
  const { settings, update } = useSettings();
  const { success, error: showError, notify } = useToast();

  const [riotName, setRiotName] = useState(settings.liveTrackerRiotName || "TenZ");
  const [riotTag, setRiotTag] = useState(settings.liveTrackerRiotTag || "0001");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  const [matches, setMatches] = useState<ValorantMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cacheKey = useMemo(
    () => `ethone-valo-cache:${riotName.toLowerCase().trim()}:${riotTag.toLowerCase().trim()}:${selectedMode}`,
    [riotName, riotTag, selectedMode]
  );

  const fetchMatches = useCallback(
    async (force = false) => {
      const cleanName = riotName.trim();
      const cleanTag = riotTag.trim().replace(/^#/, "");

      if (!cleanName || !cleanTag) {
        setMatches([]);
        return;
      }

      // Check LocalStorage cache if not forced
      if (!force) {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const parsed: CacheData = JSON.parse(cachedRaw);
            if (Date.now() - parsed.timestamp < VALORANT_CACHE_TTL_MS && Array.isArray(parsed.matches)) {
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

      const henrikApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("ethone:cred:riot:henrikApiKey") ||
            localStorage.getItem("ethone:cred:riot:apiKey") ||
            localStorage.getItem("ethone:cred:tracker:apiKey")
          : null;

      try {
        let validMatches: ValorantMatch[] = [];

        // 1. Direct Henrik API call
        try {
          validMatches = await fetchValorantMatchesDirect(cleanName, cleanTag, selectedMode, henrikApiKey);
        } catch (directErr) {
          // 2. Fallback to Cloudflare Worker
          try {
            const modeParam = selectedMode !== "all" ? `&mode=${encodeURIComponent(selectedMode)}` : "";
            const res = await fetchWorker(
              `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}${modeParam}`
            );
            const rawList = (res?.data?.matches || res?.data || res?.matches || res || []) as ValorantMatch[];
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
            success(`${validMatches.length} parties Valorant synchronisées`);
          } else {
            showError(`Aucun match trouvé pour ${cleanName}#${cleanTag} (${selectedMode})`);
          }
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Erreur lors de la récupération des matchs Valorant");
        setMatches([]);
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [riotName, riotTag, selectedMode, cacheKey, success, showError]
  );

  // Load once on mount or when account changes (using cache)
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

  const dayGroups = useMemo(() => groupMatchesByDate(matches), [matches]);

  const totalMatchesCount = matches.length;
  const totalWins = matches.filter(
    (m) =>
      m.metadata?.result?.toLowerCase() === "victory" ||
      ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0))
  ).length;
  const totalLosses = totalMatchesCount - totalWins;
  const winRate = totalMatchesCount > 0 ? Math.round((totalWins / totalMatchesCount) * 100) : 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="shrink-0 rounded-3xl border border-white/10 bg-[#0c0d14]/90 p-4 backdrop-blur-2xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Riot ID Input */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 flex-1 min-w-[200px]">
              <User className="h-4 w-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={riotName}
                onChange={(e) => setRiotName(e.target.value)}
                placeholder="Nom Riot (ex: TenZ)"
                className="w-full bg-transparent text-xs font-bold text-white placeholder-zinc-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-black/40 px-3 py-2 w-28 shrink-0">
              <span className="text-xs font-bold text-zinc-500">#</span>
              <input
                type="text"
                value={riotTag}
                onChange={(e) => setRiotTag(e.target.value)}
                placeholder="TAG (ex: 0001)"
                className="w-full bg-transparent font-mono text-xs font-bold text-white placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Mode Selector */}
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs font-semibold text-zinc-300 outline-none cursor-pointer"
            >
              <option value="all" className="bg-zinc-900 text-white">Tous les modes</option>
              <option value="competitive" className="bg-zinc-900 text-white">Compétitif</option>
              <option value="unrated" className="bg-zinc-900 text-white">Non classé</option>
              <option value="swiftplay" className="bg-zinc-900 text-white">Swiftplay</option>
              <option value="deathmatch" className="bg-zinc-900 text-white">Deathmatch</option>
              <option value="spikerush" className="bg-zinc-900 text-white">Spike Rush</option>
            </select>

            <button
              type="submit"
              disabled={loading || syncing}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
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
              <RefreshCw className={cn("h-3.5 w-3.5 text-cyan-400", syncing && "animate-spin")} />
              <span>{syncing ? "Synchro..." : "Actualiser"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Main Content Area */}
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
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 mb-3 shadow-md">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-white">Impossible de charger les parties</h4>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">{errorMsg}</p>
          </div>
        ) : dayGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 mb-3">
              <Swords className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-white">Aucune partie trouvée</h4>
            <p className="mt-1 max-w-sm text-xs text-zinc-500">
              Vérifiez votre Riot ID et votre TAG ci-dessus pour charger vos statistiques officielles.
            </p>
          </div>
        ) : (
          dayGroups.map((group, gi) => (
            <div key={group.rawDate || gi} className="space-y-2">
              {/* Day Header Group Matching Screenshot */}
              <ValorantDayHeader group={group} />

              {/* Match Rows */}
              <div className="space-y-2">
                {group.matches.map((match, mi) => (
                  <ValorantMatchRow
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
    </div>
  );
}
