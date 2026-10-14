"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Trophy,
  Flame,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  ChevronDown,
  History,
  Swords,
} from "@/components/icons/ph";
import { AnimatedNumber } from "./TrackerMotion";
import { cn } from "@/lib/utils";
import { EASE_OUT } from "@/lib/ease";

export interface VlrTeam {
  name: string;
  score?: string | null;
  country?: string;
  won?: boolean;
  id?: string;
  logo?: string;
}

export interface VlrMatch {
  id: string;
  teams: [VlrTeam, VlrTeam] | VlrTeam[];
  status: string;
  event: string;
  tournament: string;
  img?: string;
  in?: string;
  ago?: string;
  timestamp?: number;
  utcDate?: string;
  utc?: string;
}

export interface PickEmPrediction {
  matchId: string;
  winner: string;
  score?: string;
  savedAt: number;
}

const UPCOMING_API = "https://vlr.orlandomm.net/api/v1/matches";
const RESULTS_API = "https://vlr.orlandomm.net/api/v1/results";
const STORAGE_KEY = "ethone:vct:pickems";

export default function VctMatchesView() {
  const reducedMotion = useReducedMotion();
  const [upcomingMatches, setUpcomingMatches] = useState<VlrMatch[]>([]);
  const [resultsMatches, setResultsMatches] = useState<VlrMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [filterTab, setFilterTab] = useState<"upcoming" | "results" | "pickems">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEdition, setSelectedEdition] = useState("all");

  const [predictions, setPredictions] = useState<Record<string, PickEmPrediction>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const savePrediction = useCallback((matchId: string, winner: string, score?: string) => {
    setPredictions((prev) => {
      const next = {
        ...prev,
        [matchId]: {
          matchId,
          winner,
          score: score || prev[matchId]?.score,
          savedAt: Date.now(),
        },
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const deletePrediction = useCallback((matchId: string) => {
    setPredictions((prev) => {
      const copy = { ...prev };
      delete copy[matchId];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
        } catch {}
      }
      return copy;
    });
  }, []);

  const loadVctData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [upRes, resRes] = await Promise.all([
        fetch(UPCOMING_API).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(RESULTS_API).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const upcoming = Array.isArray(upRes?.data) ? upRes.data : [];
      const results = Array.isArray(resRes?.data) ? resRes.data : [];

      setUpcomingMatches(upcoming);
      setResultsMatches(results);
    } catch {
      setErrorMsg("Impossible de joindre le flux officiel VCT. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVctData();
  }, [loadVctData]);

  const tournamentStats = useMemo(() => {
    const map = new Map<string, { name: string; countUpcoming: number; countResults: number; total: number }>();
    upcomingMatches.forEach((m) => {
      const tour = m.tournament?.trim();
      if (!tour) return;
      const cur = map.get(tour) || { name: tour, countUpcoming: 0, countResults: 0, total: 0 };
      cur.countUpcoming++;
      cur.total++;
      map.set(tour, cur);
    });
    resultsMatches.forEach((m) => {
      const tour = m.tournament?.trim();
      if (!tour) return;
      const cur = map.get(tour) || { name: tour, countUpcoming: 0, countResults: 0, total: 0 };
      cur.countResults++;
      cur.total++;
      map.set(tour, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [upcomingMatches, resultsMatches]);

  const topEditions = useMemo(() => tournamentStats.slice(0, 6), [tournamentStats]);

  const liveCount = useMemo(() => {
    return upcomingMatches.filter((m) => m.status?.toLowerCase() === "live").length;
  }, [upcomingMatches]);

  const filteredUpcoming = useMemo(() => {
    return upcomingMatches.filter((m) => {
      if (selectedEdition !== "all" && m.tournament !== selectedEdition) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t1 = m.teams?.[0]?.name?.toLowerCase() || "";
        const t2 = m.teams?.[1]?.name?.toLowerCase() || "";
        const tour = m.tournament?.toLowerCase() || "";
        const ev = m.event?.toLowerCase() || "";
        if (!t1.includes(q) && !t2.includes(q) && !tour.includes(q) && !ev.includes(q)) return false;
      }
      return true;
    });
  }, [upcomingMatches, selectedEdition, searchQuery]);

  const filteredResults = useMemo(() => {
    return resultsMatches.filter((m) => {
      if (selectedEdition !== "all" && m.tournament !== selectedEdition) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t1 = m.teams?.[0]?.name?.toLowerCase() || "";
        const t2 = m.teams?.[1]?.name?.toLowerCase() || "";
        const tour = m.tournament?.toLowerCase() || "";
        const ev = m.event?.toLowerCase() || "";
        if (!t1.includes(q) && !t2.includes(q) && !tour.includes(q) && !ev.includes(q)) return false;
      }
      return true;
    });
  }, [resultsMatches, selectedEdition, searchQuery]);

  const pickEmStats = useMemo(() => {
    let evaluated = 0;
    let correct = 0;
    let scoreTotal = 0;

    resultsMatches.forEach((m) => {
      const pred = predictions[m.id];
      if (!pred) return;
      evaluated++;

      const winningTeam = m.teams?.find((t) => t.won === true)?.name || (
        Number(m.teams?.[0]?.score || 0) > Number(m.teams?.[1]?.score || 0)
          ? m.teams?.[0]?.name
          : m.teams?.[1]?.name
      );

      if (winningTeam && pred.winner.toLowerCase() === winningTeam.toLowerCase()) {
        correct++;
        scoreTotal += 10;
        if (pred.score) {
          const actualScore = `${m.teams?.[0]?.score}-${m.teams?.[1]?.score}`;
          const actualScoreInv = `${m.teams?.[1]?.score}-${m.teams?.[0]?.score}`;
          if (pred.score === actualScore || pred.score === actualScoreInv) {
            scoreTotal += 5;
          }
        }
      }
    });

    const activeCount = Object.keys(predictions).length;
    const accuracy = evaluated > 0 ? Math.round((correct / evaluated) * 100) : 0;

    return { evaluated, correct, scoreTotal, activeCount, accuracy };
  }, [predictions, resultsMatches]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Score Pick'ems
            </span>
            <p className="text-2xl font-mono font-bold text-amber-300 mt-1">
              <AnimatedNumber value={pickEmStats.scoreTotal} suffix=" pts" />
            </p>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
              {pickEmStats.correct} bon{pickEmStats.correct > 1 ? "s" : ""} pronostic{pickEmStats.correct > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Précision des Pronos
            </span>
            <p className="text-2xl font-mono font-bold text-emerald-400 mt-1">
              <AnimatedNumber value={pickEmStats.accuracy} suffix="%" />
            </p>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
              {pickEmStats.evaluated} match{pickEmStats.evaluated > 1 ? "s" : ""} évalué{pickEmStats.evaluated > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Target className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Pronostics Enregistrés
            </span>
            <p className="text-2xl font-mono font-bold text-white mt-1">
              <AnimatedNumber value={pickEmStats.activeCount} />
            </p>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
              Sauvegardés en local
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Flame className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-3.5 sm:p-5 backdrop-blur-xl shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/50 p-1.5">
            <button
              type="button"
              onClick={() => setFilterTab("upcoming")}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold transition-all cursor-pointer",
                filterTab === "upcoming"
                  ? "text-white"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {filterTab === "upcoming" && (
                <motion.div
                  layoutId="vct-active-pill"
                  className="absolute inset-0 rounded-lg bg-rose-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Swords className="relative z-10 h-3.5 w-3.5 text-rose-300" />
              <span className="relative z-10">À venir & En direct</span>
              {liveCount > 0 ? (
                <span className="relative z-10 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white animate-pulse">
                  {liveCount} LIVE
                </span>
              ) : (
                <span className="relative z-10 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px]">
                  {upcomingMatches.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("results")}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold transition-all cursor-pointer",
                filterTab === "results"
                  ? "text-black"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {filterTab === "results" && (
                <motion.div
                  layoutId="vct-active-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <History className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">Scores & Anciens matchs</span>
              <span className="relative z-10 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                {resultsMatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("pickems")}
              className={cn(
                "relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold transition-all cursor-pointer",
                filterTab === "pickems"
                  ? "text-black"
                  : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {filterTab === "pickems" && (
                <motion.div
                  layoutId="vct-active-pill"
                  className="absolute inset-0 rounded-lg bg-amber-400 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Trophy className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">Mes Pick'ems</span>
              <span className="relative z-10 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                {pickEmStats.activeCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 focus-within:border-amber-400/40 transition-all flex-1">
              <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une équipe ou tournoi..."
                className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
              />
            </div>
            <button
              type="button"
              onClick={loadVctData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              title="Rafraîchir les flux officiels VCT"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono font-medium text-neutral-400 shrink-0">
              Édition :
            </span>
            <div className="relative w-full sm:w-64">
              <select
                value={selectedEdition}
                onChange={(e) => setSelectedEdition(e.target.value)}
                className="w-full appearance-none rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 pr-8 text-xs font-mono font-medium text-white outline-none focus:border-amber-400/50 transition-all cursor-pointer"
                aria-label="Sélectionner l'édition du tournoi"
              >
                <option value="all" className="bg-[#10131B] text-white">
                  Toutes les compétitions ({upcomingMatches.length + resultsMatches.length})
                </option>
                {tournamentStats.map((t) => (
                  <option key={t.name} value={t.name} className="bg-[#10131B] text-white">
                    {t.name} ({filterTab === "upcoming" ? t.countUpcoming : filterTab === "results" ? t.countResults : t.total})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto os-scroll max-w-full">
            <button
              type="button"
              onClick={() => setSelectedEdition("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer shrink-0",
                selectedEdition === "all"
                  ? "bg-amber-400 text-black font-bold shadow-xs"
                  : "bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
              )}
            >
              Tous
            </button>
            {topEditions.map((t) => {
              const count = filterTab === "upcoming" ? t.countUpcoming : filterTab === "results" ? t.countResults : t.total;
              return (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setSelectedEdition(t.name)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer shrink-0 truncate max-w-[200px]",
                    selectedEdition === t.name
                      ? "bg-amber-400 text-black font-bold shadow-xs"
                      : "bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                  )}
                  title={t.name}
                >
                  {t.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-white/[0.06] bg-[#10131B]/60 animate-pulse"
            />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-rose-300">{errorMsg}</p>
          <button
            type="button"
            onClick={loadVctData}
            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-all cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : filterTab === "upcoming" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs px-1 text-neutral-400 font-mono">
            <span>
              {filteredUpcoming.length} match{filteredUpcoming.length > 1 ? "s" : ""} à venir & en direct
            </span>
            <button
              type="button"
              onClick={() => setFilterTab("results")}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Consulter les scores des anciens matchs →
            </button>
          </div>

          {filteredUpcoming.length > 0 ? (
            filteredUpcoming.map((m, idx) => {
              const team1 = m.teams?.[0];
              const team2 = m.teams?.[1];
              const pred = predictions[m.id];
              const isLive = m.status?.toLowerCase() === "live";
              const isT1Picked = pred?.winner?.toLowerCase() === team1?.name?.toLowerCase();
              const isT2Picked = pred?.winner?.toLowerCase() === team2?.name?.toLowerCase();

              return (
                <motion.div
                  key={m.id || idx}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.25), ease: EASE_OUT }}
                  whileHover={reducedMotion ? undefined : { y: -2 }}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#131722]/95 to-[#0e1119]/95 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.img && (
                        <img
                          src={m.img}
                          alt={m.tournament}
                          className="h-5 w-5 object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <span className="font-mono text-white font-bold truncate max-w-sm">
                        {m.tournament}
                      </span>
                      {m.event && (
                        <>
                          <span className="text-neutral-600 font-mono">/</span>
                          <span className="font-mono text-[11px] text-neutral-400 truncate">
                            {m.event}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-1 font-mono text-[11px] font-bold text-rose-300 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          EN DIRECT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-neutral-300">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" />
                          {m.in || m.utcDate || "À venir"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                    <button
                      type="button"
                      onClick={() => team1?.name && savePrediction(m.id, team1.name)}
                      className={cn(
                        "group relative flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer text-left",
                        isT1Picked
                          ? "border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                          : "border-white/[0.08] bg-[#0c0f17]/90 hover:border-white/20 hover:bg-[#121622] text-neutral-200"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 shadow-inner overflow-hidden">
                          {team1?.logo ? (
                            <img
                              src={team1.logo}
                              alt={team1.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="font-mono font-bold text-sm text-neutral-300">
                              {team1?.name?.[0] || "1"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-white truncate group-hover:text-amber-200 transition-colors">
                              {team1?.name || "TBD"}
                            </span>
                            {team1?.country && (
                              <span className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.2 font-mono text-[10px] text-neutral-400 uppercase shrink-0">
                                {team1.country}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            {isT1Picked ? "Sélectionné comme vainqueur" : "Cliquer pour pronostiquer"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isT1Picked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 text-black px-2.5 py-1 text-[11px] font-mono font-bold shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                            MON PICK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] text-neutral-400 px-2.5 py-1 text-[11px] font-mono group-hover:text-white group-hover:border-white/20 transition-all">
                            Choisir
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="flex flex-col items-center justify-center py-1 sm:py-0">
                      <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-neutral-800 to-neutral-900 shadow-md">
                        <span className="font-mono text-xs sm:text-sm font-black text-rose-400 tracking-wider">VS</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase mt-1 tracking-wider">BO3</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => team2?.name && savePrediction(m.id, team2.name)}
                      className={cn(
                        "group relative flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all cursor-pointer text-left",
                        isT2Picked
                          ? "border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                          : "border-white/[0.08] bg-[#0c0f17]/90 hover:border-white/20 hover:bg-[#121622] text-neutral-200"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 shadow-inner overflow-hidden">
                          {team2?.logo ? (
                            <img
                              src={team2.logo}
                              alt={team2.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="font-mono font-bold text-sm text-neutral-300">
                              {team2?.name?.[0] || "2"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm sm:text-base text-white truncate group-hover:text-amber-200 transition-colors">
                              {team2?.name || "TBD"}
                            </span>
                            {team2?.country && (
                              <span className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.2 font-mono text-[10px] text-neutral-400 uppercase shrink-0">
                                {team2.country}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            {isT2Picked ? "Sélectionné comme vainqueur" : "Cliquer pour pronostiquer"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isT2Picked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 text-black px-2.5 py-1 text-[11px] font-mono font-bold shadow-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                            MON PICK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] text-neutral-400 px-2.5 py-1 text-[11px] font-mono group-hover:text-white group-hover:border-white/20 transition-all">
                            Choisir
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {pred?.winner && (
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-amber-400" />
                        <span className="font-mono text-neutral-300">
                          Score exact <span className="text-amber-300">(Bonus +5 pts)</span> :
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {["2-0", "2-1", "3-0", "3-1", "3-2"].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => savePrediction(m.id, pred.winner, sc)}
                            className={cn(
                              "rounded px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer",
                              pred.score === sc
                                ? "bg-amber-400 text-black font-bold shadow-xs scale-105"
                                : "bg-white/[0.05] text-neutral-300 hover:bg-white/10"
                            )}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-2">
              <Clock className="h-7 w-7 text-neutral-500 mx-auto mb-1" />
              <p className="text-sm font-mono font-bold text-white uppercase">
                Aucun match à venir pour cette sélection
              </p>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Consultez l'onglet "Scores & Anciens matchs" pour voir les résultats officiels récents ou changez l'édition sélectionnée.
              </p>
            </div>
          )}
        </div>
      ) : filterTab === "results" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs px-1 text-neutral-400 font-mono">
            <span>
              {filteredResults.length} match{filteredResults.length > 1 ? "s" : ""} terminé{filteredResults.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setFilterTab("upcoming")}
              className="text-rose-400 hover:text-rose-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              ← Voir les matchs à venir & pronostiquer
            </button>
          </div>

          {filteredResults.length > 0 ? (
            filteredResults.map((m, idx) => {
              const team1 = m.teams?.[0];
              const team2 = m.teams?.[1];
              const pred = predictions[m.id];

              const t1Won = team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0));
              const t2Won = team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0));
              const actualWinner = t1Won ? team1?.name : t2Won ? team2?.name : null;

              const isPredCorrect = pred && actualWinner && pred.winner.toLowerCase() === actualWinner.toLowerCase();
              const actualScore = `${team1?.score}-${team2?.score}`;
              const actualScoreInv = `${team2?.score}-${team1?.score}`;
              const isScoreExact = pred?.score && (pred.score === actualScore || pred.score === actualScoreInv);

              return (
                <motion.div
                  key={m.id || idx}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: Math.min(idx * 0.04, 0.25), ease: EASE_OUT }}
                  whileHover={reducedMotion ? undefined : { y: -2 }}
                  className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#131722]/95 to-[#0e1119]/95 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-4 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {m.img && (
                        <img
                          src={m.img}
                          alt={m.tournament}
                          className="h-5 w-5 object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <span className="font-mono text-white font-bold truncate max-w-sm">
                        {m.tournament}
                      </span>
                      {m.event && (
                        <>
                          <span className="text-neutral-600 font-mono">/</span>
                          <span className="font-mono text-[11px] text-neutral-400 truncate">
                            {m.event}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-neutral-400">
                        <History className="h-3.5 w-3.5 text-neutral-500" />
                        {m.ago || "Terminé"}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all",
                        t1Won
                          ? "border-emerald-500/40 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                          : "border-white/[0.06] bg-[#0c0f17]/60 text-neutral-400 opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 overflow-hidden">
                          {team1?.logo ? (
                            <img
                              src={team1.logo}
                              alt={team1.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="font-mono font-bold text-sm text-neutral-300">
                              {team1?.name?.[0] || "1"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold text-sm sm:text-base truncate", t1Won ? "text-white" : "text-neutral-400")}>
                              {team1?.name || "TBD"}
                            </span>
                            {team1?.country && (
                              <span className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.2 font-mono text-[10px] text-neutral-400 uppercase shrink-0">
                                {team1.country}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            {t1Won ? "Vainqueur du match" : "Équipe défaite"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {t1Won ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                            <CheckCircle2 className="h-3 w-3" />
                            Victoire
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-white/[0.04] text-neutral-400 px-2 py-0.5 text-[10px] font-mono uppercase">
                            Défaite
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center py-1 sm:py-0">
                      <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/10 bg-black/70 shadow-inner font-mono">
                        <span className={cn("text-2xl sm:text-3xl font-black", t1Won ? "text-emerald-400 font-extrabold" : "text-neutral-400")}>
                          {team1?.score ?? "0"}
                        </span>
                        <span className="text-neutral-600 font-bold text-xl">:</span>
                        <span className={cn("text-2xl sm:text-3xl font-black", t2Won ? "text-emerald-400 font-extrabold" : "text-neutral-400")}>
                          {team2?.score ?? "0"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 uppercase mt-1">Score Final</span>
                    </div>

                    <div
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all",
                        t2Won
                          ? "border-emerald-500/40 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                          : "border-white/[0.06] bg-[#0c0f17]/60 text-neutral-400 opacity-80"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 overflow-hidden">
                          {team2?.logo ? (
                            <img
                              src={team2.logo}
                              alt={team2.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span className="font-mono font-bold text-sm text-neutral-300">
                              {team2?.name?.[0] || "2"}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold text-sm sm:text-base truncate", t2Won ? "text-white" : "text-neutral-400")}>
                              {team2?.name || "TBD"}
                            </span>
                            {team2?.country && (
                              <span className="rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.2 font-mono text-[10px] text-neutral-400 uppercase shrink-0">
                                {team2.country}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                            {t2Won ? "Vainqueur du match" : "Équipe défaite"}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {t2Won ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                            <CheckCircle2 className="h-3 w-3" />
                            Victoire
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-white/[0.04] text-neutral-400 px-2 py-0.5 text-[10px] font-mono uppercase">
                            Défaite
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {pred && (
                    <div
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-mono",
                        isPredCorrect
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                          : "border-rose-500/40 bg-rose-500/15 text-rose-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isPredCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                        )}
                        <span>
                          Votre prono : <strong>{pred.winner}</strong> {pred.score ? `(${pred.score})` : ""}
                        </span>
                      </div>
                      <span className="font-bold">
                        {isPredCorrect
                          ? isScoreExact
                            ? "+15 pts (Score exact !)"
                            : "+10 pts (Vainqueur correct)"
                          : "0 pt (Prono manqué)"}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-2">
              <Trophy className="h-7 w-7 text-neutral-500 mx-auto mb-1" />
              <p className="text-sm font-mono font-bold text-white uppercase">
                Aucun résultat correspondant aux critères
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs px-1 text-neutral-400 font-mono">
            <span>
              {Object.keys(predictions).length} pronostic{Object.keys(predictions).length > 1 ? "s" : ""} enregistré{Object.keys(predictions).length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => setFilterTab("upcoming")}
              className="text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Faire d'autres pronostics →
            </button>
          </div>

          {Object.keys(predictions).length > 0 ? (
            Object.values(predictions).map((pred, idx) => {
              const match = [...upcomingMatches, ...resultsMatches].find((m) => m.id === pred.matchId);
              const team1 = match?.teams?.[0];
              const team2 = match?.teams?.[1];

              const isCompleted = match?.status?.toLowerCase() === "completed" || Boolean(match?.ago);
              const t1Won = team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0));
              const t2Won = team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0));
              const actualWinner = t1Won ? team1?.name : t2Won ? team2?.name : null;
              const isPredCorrect = isCompleted && actualWinner && pred.winner.toLowerCase() === actualWinner.toLowerCase();

              return (
                <motion.div
                  key={pred.matchId || idx}
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.2), ease: EASE_OUT }}
                  className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3 text-xs">
                    <span className="font-mono text-neutral-400 font-semibold truncate">
                      {match?.tournament || "Compétition VCT"} {match?.event ? `— ${match.event}` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <span className="rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                          {match?.ago || "Terminé"}
                        </span>
                      ) : (
                        <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 font-mono text-[10px] font-bold">
                          {match?.in || "À venir"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => deletePrediction(pred.matchId)}
                        className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 font-mono">Vainqueur choisi :</span>
                      <span className="rounded-md bg-amber-400 text-black px-2.5 py-0.5 text-xs font-mono font-bold">
                        {pred.winner}
                      </span>
                      {pred.score && (
                        <span className="rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 font-mono text-xs text-white">
                          Score : {pred.score}
                        </span>
                      )}
                    </div>

                    {isCompleted && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400 font-mono">
                          Score réel : {team1?.score ?? "0"} - {team2?.score ?? "0"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-bold",
                            isPredCorrect
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          )}
                        >
                          {isPredCorrect ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Gagné (+10 pts)
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Manqué
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-2">
              <Trophy className="h-7 w-7 text-neutral-500 mx-auto mb-1" />
              <p className="text-sm font-mono font-bold text-white uppercase">
                Vous n'avez pas encore fait de pronostic
              </p>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Allez dans l'onglet "À venir & En direct" et cliquez sur une équipe pour enregistrer votre Pick'em et tenter de marquer jusqu'à 15 points par match !
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
