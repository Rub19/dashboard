"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Swords,
  AlertCircle,
  Clock,
  User,
  Key,
  ExternalLink,
} from "@/components/icons/ph";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import { fetchWorker } from "@/lib/api";
import {
  type ValorantMatch,
  groupMatchesByDate,
  fetchValorantMatchesDirect,
  enrichMatchesWithRealRanks,
  VALORANT_QUEUES, matchScoreValue, PERFORMANCE_SCORE_MAX } from "@/lib/valorant-tracker";
import ValorantMatchRow from "@/components/tracker/ValorantMatchRow";
import ValorantDayHeader from "@/components/tracker/ValorantDayHeader";
import TrackerModeDropdown from "@/components/tracker/TrackerModeDropdown";
import { cn } from "@/lib/utils";

import DailyReportModal from "@/components/tracker/DailyReportModal";

const VALORANT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

interface CacheData {
  matches: ValorantMatch[];
  timestamp: number;
}

export default function ValorantTrackerView() {
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();

  const [riotName, setRiotName] = useState(settings.liveTrackerRiotName || "");
  const [riotTag, setRiotTag] = useState(settings.liveTrackerRiotTag || "");
  const [selectedMode, setSelectedMode] = useState<string>("all");

  const [matches, setMatches] = useState<ValorantMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyEnd, setHistoryEnd] = useState(false);
  // Nouveau compte ou nouveau mode : l'historique repart de la page 1.
  useEffect(() => {
    setHistoryPage(1);
    setHistoryEnd(false);
  }, [riotName, riotTag, selectedMode]);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeReportIndex, setActiveReportIndex] = useState<number | null>(null);

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

      let henrikApiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("ethone:cred:riot:henrikApiKey") ||
            localStorage.getItem("ethone:cred:valorant:apiKey") ||
            localStorage.getItem("ethone:cred:henrik:apiKey") ||
            localStorage.getItem("HENRIK_API_KEY")
          : null;
      if (!henrikApiKey && typeof window !== "undefined") {
        const generic = localStorage.getItem("ethone:cred:riot:apiKey");
        if (generic && generic.startsWith("HDEV-")) henrikApiKey = generic;
      }

      try {
        let validMatches: ValorantMatch[] = [];

        // 1. Direct Henrik API call
        try {
          validMatches = await fetchValorantMatchesDirect(cleanName, cleanTag, selectedMode, henrikApiKey);
        } catch {
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

        if (validMatches.length > 0) {
          try {
            const topSlice = validMatches.slice(0, 3);
            const enrichedTop = await enrichMatchesWithRealRanks(topSlice, henrikApiKey);
            validMatches = [...enrichedTop, ...validMatches.slice(3)];
          } catch {}
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

  // « Charger plus » : historique paginé de HenrikDev (stored-matches, via le worker). Page 1 = les plus récentes ;
  // chaque clic remonte page par page jusqu'à 25 nouvelles parties (ou la fin de l'historique disponible).
  const loadMoreMatches = useCallback(async () => {
    const cleanName = riotName.trim();
    const cleanTag = riotTag.trim().replace(/^#/, "");
    if (!cleanName || !cleanTag || loadingMore || historyEnd) return;

    setLoadingMore(true);
    try {
      const modeParam = selectedMode !== "all" ? `&mode=${encodeURIComponent(selectedMode)}` : "";
      const known = new Set(matches.map((m) => m.id));
      const added: ValorantMatch[] = [];
      let page = historyPage;
      let reachedEnd = false;
      for (let tries = 0; tries < 6 && added.length < 25; tries++) {
        const res = await fetchWorker(
          `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}${modeParam}&page=${page}`
        );
        const list = (res?.data?.matches || res?.data || res?.matches || res || []) as ValorantMatch[];
        page += 1;
        if (!Array.isArray(list) || list.length === 0) {
          reachedEnd = true;
          break;
        }
        for (const m of list) {
          if (m?.id && !known.has(m.id)) {
            known.add(m.id);
            added.push(m);
          }
        }
      }
      setHistoryPage(page);
      if (reachedEnd) setHistoryEnd(true);

      if (added.length === 0) {
        if (reachedEnd) success("Tout l'historique disponible est déjà chargé.");
        else showError("Aucune partie plus ancienne trouvée pour le moment.");
        return;
      }
      const merged = [...matches, ...added].sort((x, y) => new Date(y.metadata.timestamp).getTime() - new Date(x.metadata.timestamp).getTime());
      setMatches(merged);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ matches: merged, timestamp: Date.now() }));
      } catch {}
      success(`${added.length} partie${added.length > 1 ? "s" : ""} plus ancienne${added.length > 1 ? "s" : ""} chargée${added.length > 1 ? "s" : ""}`);
    } catch {
      showError("Impossible de charger l'historique pour le moment.");
    } finally {
      setLoadingMore(false);
    }
  }, [riotName, riotTag, selectedMode, matches, cacheKey, success, showError, loadingMore, historyPage, historyEnd]);

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

  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedMap, setSelectedMap] = useState<string>("all");

  const availableAgents = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.metadata?.agentName) set.add(m.metadata.agentName);
    });
    return Array.from(set);
  }, [matches]);

  const availableMaps = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.metadata?.mapName) set.add(m.metadata.mapName);
    });
    return Array.from(set);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (selectedAgent !== "all" && m.metadata?.agentName !== selectedAgent) return false;
      if (selectedMap !== "all" && m.metadata?.mapName !== selectedMap) return false;
      return true;
    });
  }, [matches, selectedAgent, selectedMap]);

  const dayGroups = useMemo(() => groupMatchesByDate(filteredMatches), [filteredMatches]);

  const totalMatchesCount = matches.length;
  const totalWins = matches.filter(
    (m) =>
      m.metadata?.result?.toLowerCase() === "victory" ||
      ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0))
  ).length;
  const totalLosses = totalMatchesCount - totalWins;
  const winRate = totalMatchesCount > 0 ? Math.round((totalWins / totalMatchesCount) * 100) : 0;

  const topAgents = useMemo(() => {
    const counts: Record<string, { matches: number; wins: number; kills: number; deaths: number; img: string }> = {};
    matches.forEach((m) => {
      const char = m.metadata?.agentName || "Jett";
      const isWin = m.metadata?.result?.toLowerCase() === "victory" || ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0));
      const k = m.segments?.[0]?.stats?.kills?.value || 0;
      const d = m.segments?.[0]?.stats?.deaths?.value || 1;
      const img = m.metadata?.agentImageUrl || "";
      if (!counts[char]) {
        counts[char] = { matches: 0, wins: 0, kills: 0, deaths: 0, img };
      }
      counts[char].matches += 1;
      if (isWin) counts[char].wins += 1;
      counts[char].kills += k;
      counts[char].deaths += d;
    });
    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        matches: data.matches,
        winRate: Math.round((data.wins / data.matches) * 100),
        kda: (data.kills / Math.max(1, data.deaths)).toFixed(2),
        img: data.img,
      }))
      .sort((a, b) => b.matches - a.matches)
      .slice(0, 3);
  }, [matches]);

  // Score de performance moyen (0-500, patch 13.06+) sur les parties qui le fournissent ; ACS seulement pour les anciennes parties.
  const scoreSummary = useMemo(() => {
    const entries = matches.map((m) => matchScoreValue(m)).filter((e) => e.value !== null) as Array<{ system: "performance" | "acs"; value: number }>;
    const performance = entries.filter((e) => e.system === "performance");
    const legacy = entries.filter((e) => e.system === "acs");
    const average = (list: Array<{ value: number }>) => Math.round(list.reduce((sum, e) => sum + e.value, 0) / list.length);
    if (performance.length > 0) return { system: "performance" as const, value: average(performance), count: performance.length };
    if (legacy.length > 0) return { system: "acs" as const, value: average(legacy), count: legacy.length };
    return { system: "performance" as const, value: null as number | null, count: 0 };
  }, [matches]);

  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    if (typeof window === "undefined") return "";
    return (
      localStorage.getItem("ethone:cred:riot:henrikApiKey") ||
      localStorage.getItem("ethone:cred:riot:apiKey") ||
      localStorage.getItem("HENRIK_API_KEY") ||
      ""
    );
  });

  const hasApiKey = Boolean(apiKeyInput.trim());

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (typeof window !== "undefined") {
      if (cleanKey) {
        localStorage.setItem("ethone:cred:riot:henrikApiKey", cleanKey);
      } else {
        localStorage.removeItem("ethone:cred:riot:henrikApiKey");
        localStorage.removeItem("HENRIK_API_KEY");
      }
    }
    setApiKeyModalOpen(false);
    if (cleanKey) {
      success("Clé API Henrik enregistrée · Rangs réels activés");
    } else {
      success("Clé API retirée · Mode standard");
    }
    fetchMatches(true);
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="shrink-0 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 backdrop-blur-2xl shadow-lg">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Riot ID Input */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 transition-colors focus-within:border-[var(--accent-primary)]/60 flex-1 min-w-[200px]">
              <User className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                value={riotName}
                onChange={(e) => setRiotName(e.target.value)}
                placeholder="Nom Riot (ex: Rub19)"
                className="w-full bg-transparent text-xs font-bold text-[var(--text-primary)] placeholder-zinc-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-2 transition-colors focus-within:border-[var(--accent-primary)]/60 w-28 shrink-0">
              <span className="text-xs font-bold text-[var(--text-muted)]/80">#</span>
              <input
                type="text"
                value={riotTag}
                onChange={(e) => setRiotTag(e.target.value)}
                placeholder="TAG" aria-label="TAG Riot (ex. EUW)"
                className="w-full bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] placeholder-zinc-500 outline-none"
              />
            </div>

            {/* Mode Selector */}
            <TrackerModeDropdown
              options={VALORANT_QUEUES}
              selectedId={selectedMode}
              onSelect={(id) => setSelectedMode(id)}
              accentColor="rose"
            />

            <button
              type="submit"
              disabled={loading || syncing}
              className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2 text-xs font-bold text-[var(--text-primary)] shadow-md hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Analyser</span>
            </button>
          </div>

          {/* Sync & API Key Controls */}
          <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
            {/* Henrik API Key Button */}
            <button
              type="button"
              onClick={() => setApiKeyModalOpen(true)}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--inset-radius)] border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer",
                hasApiKey
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              )}
              title="Configurer la clé API Henrik pour récupérer les rangs réels des joueurs"
            >
              <span className={cn("h-2 w-2 rounded-full", hasApiKey ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]")} />
              <span>{hasApiKey ? "Clé API Active" : "Clé API (Rangs Réels)"}</span>
            </button>

            {lastSyncTime && (
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium">
                <Clock className="h-3 w-3 text-[var(--text-muted)]/80" />
                <span>Mis en cache ({lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => fetchMatches(true)}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/5 px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-cyan-400", syncing && "animate-spin")} />
              <span>{syncing ? "Synchro..." : "Actualiser"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Overview Stats & Top Agents Banner */}
      {matches.length > 0 && (
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Winrate & Match Stats */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Victoires / Ratio</p>
              <p className="text-lg font-black text-[var(--text-primary)]">{winRate}% <span className="text-xs font-normal text-[var(--text-muted)]">({totalWins}V - {totalLosses}D)</span></p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--inset-radius)] bg-rose-500/15 text-rose-400 font-bold border border-rose-500/20">
              {winRate}%
            </div>
          </div>

          {/* Score de performance moyen (0-500) — remplace l'ACS depuis le patch 13.06 */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {scoreSummary.system === "performance" ? "Score de performance moyen" : "Score de combat moyen (ACS, ancien)"}
              </p>
              <p className="text-lg font-black text-cyan-400">
                {scoreSummary.value === null ? "—" : scoreSummary.value}{" "}
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {scoreSummary.value === null
                    ? "non fourni par l'API"
                    : scoreSummary.system === "performance"
                      ? `/ ${PERFORMANCE_SCORE_MAX}`
                      : "pts/round"}
                </span>
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--inset-radius)] bg-cyan-500/15 text-cyan-400 font-bold border border-cyan-500/20 text-[10px]">
              {scoreSummary.system === "performance" ? "PERF" : "ACS"}
            </div>
          </div>

          {/* Top Agent */}
          <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/70 p-3.5 backdrop-blur-xl flex items-center justify-between shadow-md">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Agent Principal</p>
              <p className="text-lg font-black text-[var(--text-primary)] truncate">{topAgents[0]?.name || "Valorant"}</p>
            </div>
            {topAgents[0] && (
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-400">{topAgents[0].winRate}% WR</span>
                <p className="text-[10px] text-[var(--text-muted)]">{topAgents[0].kda} KDA</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Agent & Map Filters */}
      {matches.length > 0 && (availableAgents.length > 1 || availableMaps.length > 1) && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/50 p-2 backdrop-blur-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]/80 px-2">Filtres :</span>
          
          {/* Agent Filter */}
          {availableAgents.length > 1 && (
            <div className="flex items-center gap-1 overflow-x-auto os-scroll">
              <button
                type="button"
                onClick={() => setSelectedAgent("all")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all",
                  selectedAgent === "all"
                    ? "bg-rose-500 text-white shadow-sm"
                    : "bg-[var(--text-primary)]/5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
                )}
              >
                Tous Agents
              </button>
              {availableAgents.map((agent) => (
                <button
                  key={agent}
                  type="button"
                  onClick={() => setSelectedAgent(agent)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all",
                    selectedAgent === agent
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-[var(--text-primary)]/5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
                  )}
                >
                  {agent}
                </button>
              ))}
            </div>
          )}

          {/* Map Filter */}
          {availableMaps.length > 1 && (
            <div className="flex items-center gap-1 border-l border-[var(--panel-border)] pl-2 overflow-x-auto os-scroll">
              <button
                type="button"
                onClick={() => setSelectedMap("all")}
                className={cn(
                  "rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all",
                  selectedMap === "all"
                    ? "bg-cyan-500 text-black font-extrabold shadow-sm"
                    : "bg-[var(--text-primary)]/5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
                )}
              >
                Toutes Maps
              </button>
              {availableMaps.map((map) => (
                <button
                  key={map}
                  type="button"
                  onClick={() => setSelectedMap(map)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 text-[11px] font-bold transition-all",
                    selectedMap === map
                      ? "bg-cyan-500 text-black font-extrabold shadow-sm"
                      : "bg-[var(--text-primary)]/5 text-[var(--text-muted)] hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)]"
                  )}
                >
                  {map}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="min-h-0 w-full flex-1 overflow-y-auto os-scroll space-y-6 pr-1 pb-6 [overscroll-behavior:contain] [touch-action:pan-y]">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-16 skeleton-shimmer rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/[0.02]"
              />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="pop-in flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--panel-radius)] border border-rose-500/30 bg-rose-500/10 text-rose-400 mb-3 shadow-md">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Impossible de charger les parties</h4>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]/80">{errorMsg}</p>
          </div>
        ) : dayGroups.length === 0 ? (
          <div className="pop-in flex flex-col items-center justify-center py-16 text-center text-[var(--text-muted)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--text-primary)]/5 text-[var(--text-primary)]/85 mb-3">
              <Swords className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Aucune partie trouvée</h4>
            <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)]/80">
              Vérifiez votre Riot ID et votre TAG ci-dessus pour charger vos statistiques officielles.
            </p>
          </div>
        ) : (
          dayGroups.map((group, gi) => (
            <div key={group.rawDate || gi} className="rise-in space-y-2" style={{ animationDelay: `${Math.min(gi, 6) * 60}ms` }}>
              {/* Day Header Group Matching Screenshot */}
              <ValorantDayHeader
                group={group}
                onViewReport={() => setActiveReportIndex(gi)}
              />

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

        {!loading && !errorMsg && matches.length > 0 && (
          <div className="flex flex-col items-center gap-1.5 pt-2">
            <button
              type="button"
              onClick={loadMoreMatches}
              disabled={loadingMore || historyEnd}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--text-primary)]/5 px-3.5 py-2 text-xs font-bold text-[var(--text-primary)]/85 hover:bg-[var(--text-primary)]/10 hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loadingMore && "animate-spin")} />
              <span>{loadingMore ? "Chargement..." : historyEnd ? "Tout l'historique est chargé" : "Charger plus de parties"}</span>
            </button>
            <p className="text-[10px] text-[var(--text-muted)]/60">{matches.length} parties chargées · les plus anciennes affichent un résumé (sans le tableau des 10 joueurs)</p>
          </div>
        )}
      </div>

      {/* Daily Report Modal with Animations */}
      {activeReportIndex !== null && dayGroups[activeReportIndex] && (
        <DailyReportModal
          isOpen={true}
          onClose={() => setActiveReportIndex(null)}
          game="valorant"
          currentGroup={dayGroups[activeReportIndex]}
          previousGroup={dayGroups[activeReportIndex + 1] || null}
        />
      )}

      {/* Henrik API Key Modal */}
      <Modal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        title="Clé API HenrikDev (Rangs Valorant Réels)"
        description="Configurez votre clé API Henrik pour récupérer les véritables rangs compétitifs (MMR) de tous les joueurs de vos parties sans estimation."
        size="md"
        hideFooter
      >
        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--text-primary)]/85">
              Clé API Henrik (Authorization)
            </label>
            <div className="flex items-center gap-2 rounded-[var(--inset-radius)] border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-3 py-2 text-xs">
              <Key className="h-4 w-4 text-amber-400 shrink-0" />
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="ex: HDEV-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full bg-transparent font-mono text-xs text-[var(--text-primary)] placeholder-zinc-500 outline-none"
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-1">
              Obtenez votre clé API gratuite sur{" "}
              <a
                href="https://api.henrikdev.xyz/dashboard/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 underline hover:text-cyan-300 font-medium inline-flex items-center gap-1"
              >
                api.henrikdev.xyz/dashboard/api-keys
                <ExternalLink className="h-3 w-3 inline" />
              </a>{" "}
              (permet jusqu&apos;à 30 requêtes/min pour charger le rang exact de chaque joueur de vos lobbies).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--panel-border)]">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setApiKeyModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Enregistrer et Synchroniser
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
