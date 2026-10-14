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
  const [selectedTournament, setSelectedTournament] = useState("all");

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

  const allTournaments = useMemo(() => {
    const set = new Set<string>();
    upcomingMatches.forEach((m) => {
      if (m.tournament) set.add(m.tournament);
    });
    resultsMatches.forEach((m) => {
      if (m.tournament) set.add(m.tournament);
    });
    return Array.from(set).slice(0, 8);
  }, [upcomingMatches, resultsMatches]);

  const filteredUpcoming = useMemo(() => {
    return upcomingMatches.filter((m) => {
      if (selectedTournament !== "all" && m.tournament !== selectedTournament) return false;
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
  }, [upcomingMatches, selectedTournament, searchQuery]);

  const filteredResults = useMemo(() => {
    return resultsMatches.filter((m) => {
      if (selectedTournament !== "all" && m.tournament !== selectedTournament) return false;
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
  }, [resultsMatches, selectedTournament, searchQuery]);

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
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
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
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
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
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
              Sauvegardés en local
            </p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Flame className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/95 p-3 sm:p-4 backdrop-blur-xl shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setFilterTab("upcoming")}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-mono font-semibold transition-all cursor-pointer",
                filterTab === "upcoming"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              À venir & En direct ({upcomingMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("results")}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-mono font-semibold transition-all cursor-pointer",
                filterTab === "results"
                  ? "bg-white text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              Scores & Résultats ({resultsMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("pickems")}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-mono font-semibold transition-all cursor-pointer",
                filterTab === "pickems"
                  ? "bg-amber-400 text-black shadow-sm"
                  : "text-neutral-400 hover:text-white"
              )}
            >
              Mes Pick'ems ({pickEmStats.activeCount})
            </button>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 focus-within:border-white/20 transition-all flex-1">
              <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer une équipe (ex: Fnatic, Sentinels...)"
                className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
              />
            </div>
            <button
              type="button"
              onClick={loadVctData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer disabled:opacity-40 shrink-0"
              title="Rafraîchir les flux officiels"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="hidden sm:inline">Rafraîchir</span>
            </button>
          </div>
        </div>

        {allTournaments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto os-scroll pt-1 border-t border-white/[0.05]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 shrink-0">
              Tournoi :
            </span>
            <button
              type="button"
              onClick={() => setSelectedTournament("all")}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-mono transition-all cursor-pointer shrink-0",
                selectedTournament === "all"
                  ? "bg-white/[0.12] text-white font-bold"
                  : "text-neutral-400 hover:text-white bg-white/[0.03]"
              )}
            >
              Tous
            </button>
            {allTournaments.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTournament(t)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-mono transition-all cursor-pointer shrink-0 truncate max-w-[200px]",
                  selectedTournament === t
                    ? "bg-white/[0.12] text-white font-bold"
                    : "text-neutral-400 hover:text-white bg-white/[0.03]"
                )}
                title={t}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-white/[0.06] bg-[#10131B]/60 animate-pulse"
            />
          ))}
        </div>
      ) : errorMsg ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-rose-300">{errorMsg}</p>
          <button
            type="button"
            onClick={loadVctData}
            className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-all cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      ) : filterTab === "upcoming" ? (
        <div className="space-y-3">
          {filteredUpcoming.length > 0 ? (
            filteredUpcoming.map((m, idx) => {
              const team1 = m.teams?.[0];
              const team2 = m.teams?.[1];
              const pred = predictions[m.id];
              const isLive = m.status?.toLowerCase() === "live";

              return (
                <motion.div
                  key={m.id || idx}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2), ease: EASE_OUT }}
                  className="rounded-xl border border-white/[0.07] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm space-y-3 hover:border-white/15 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.05] pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400 font-semibold truncate max-w-sm">
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
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-300 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                          EN DIRECT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                          <Clock className="h-3 w-3 text-neutral-500" />
                          {m.in || m.utcDate || "À venir"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => team1?.name && savePrediction(m.id, team1.name)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 transition-all cursor-pointer text-left",
                        pred?.winner === team1?.name
                          ? "border-amber-400/50 bg-amber-500/15 text-white shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          : "border-white/[0.06] bg-black/30 hover:border-white/15 hover:bg-black/50 text-neutral-200"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {team1?.logo ? (
                          <img
                            src={team1.logo}
                            alt={team1.name}
                            className="h-8 w-8 object-contain shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-white/[0.05] flex items-center justify-center font-mono font-bold text-xs text-white">
                            {team1?.name?.[0] || "T1"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{team1?.name || "TBD"}</p>
                          <p className="text-[10px] font-mono text-neutral-400 uppercase">
                            {team1?.country || "INT"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {pred?.winner === team1?.name ? (
                          <span className="rounded bg-amber-400 text-black px-2 py-0.5 text-[10px] font-mono font-bold">
                            MON PICK
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-400 hover:text-white">
                            Choisir
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => team2?.name && savePrediction(m.id, team2.name)}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 transition-all cursor-pointer text-left",
                        pred?.winner === team2?.name
                          ? "border-amber-400/50 bg-amber-500/15 text-white shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                          : "border-white/[0.06] bg-black/30 hover:border-white/15 hover:bg-black/50 text-neutral-200"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {team2?.logo ? (
                          <img
                            src={team2.logo}
                            alt={team2.name}
                            className="h-8 w-8 object-contain shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-white/[0.05] flex items-center justify-center font-mono font-bold text-xs text-white">
                            {team2?.name?.[0] || "T2"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{team2?.name || "TBD"}</p>
                          <p className="text-[10px] font-mono text-neutral-400 uppercase">
                            {team2?.country || "INT"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {pred?.winner === team2?.name ? (
                          <span className="rounded bg-amber-400 text-black px-2 py-0.5 text-[10px] font-mono font-bold">
                            MON PICK
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-400 hover:text-white">
                            Choisir
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {pred?.winner && (
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] text-xs">
                      <span className="text-[11px] font-mono text-neutral-400">
                        Score prédit :
                      </span>
                      <div className="flex items-center gap-1.5">
                        {["2-0", "2-1", "3-0", "3-1", "3-2"].map((sc) => (
                          <button
                            key={sc}
                            type="button"
                            onClick={() => savePrediction(m.id, pred.winner, sc)}
                            className={cn(
                              "rounded px-2 py-0.5 text-[10px] font-mono transition-all cursor-pointer",
                              pred.score === sc
                                ? "bg-amber-400 text-black font-bold shadow-xs"
                                : "bg-white/[0.05] text-neutral-300 hover:bg-white/10"
                            )}
                          >
                            {sc}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-1">
              <Clock className="h-6 w-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-xs font-mono font-bold text-white uppercase">
                Aucun match à venir correspondant aux filtres
              </p>
              <p className="text-[11px] text-neutral-400">
                Consultez l'onglet Résultats & Scores pour voir les scores officiels récents.
              </p>
            </div>
          )}
        </div>
      ) : filterTab === "results" ? (
        <div className="space-y-3">
          {filteredResults.length > 0 ? (
            filteredResults.map((m, idx) => {
              const team1 = m.teams?.[0];
              const team2 = m.teams?.[1];
              const pred = predictions[m.id];

              const t1Won = team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0));
              const t2Won = team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0));
              const actualWinner = t1Won ? team1?.name : t2Won ? team2?.name : null;

              const isPredCorrect = pred && actualWinner && pred.winner.toLowerCase() === actualWinner.toLowerCase();

              return (
                <motion.div
                  key={m.id || idx}
                  initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2), ease: EASE_OUT }}
                  className="rounded-xl border border-white/[0.07] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm space-y-3 hover:border-white/15 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.05] pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-400 font-semibold truncate max-w-sm">
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
                      <span className="rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                        {m.ago || "Terminé"}
                      </span>
                      {pred && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-bold",
                            isPredCorrect
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          )}
                        >
                          {isPredCorrect ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              Pick Gagné (+10 pts)
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Pick Manqué
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 p-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {team1?.logo ? (
                        <img
                          src={team1.logo}
                          alt={team1.name}
                          className="h-9 w-9 object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-white/[0.05] flex items-center justify-center font-mono font-bold text-xs text-white">
                          {team1?.name?.[0] || "T1"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className={cn("text-sm font-bold truncate", t1Won ? "text-white" : "text-neutral-400")}>
                          {team1?.name}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase">
                          {team1?.country}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xl font-black shrink-0 px-4">
                      <span className={t1Won ? "text-emerald-400 font-extrabold" : "text-neutral-400"}>
                        {team1?.score ?? "0"}
                      </span>
                      <span className="text-neutral-600">:</span>
                      <span className={t2Won ? "text-emerald-400 font-extrabold" : "text-neutral-400"}>
                        {team2?.score ?? "0"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 min-w-0 flex-1 justify-end text-right">
                      <div className="min-w-0">
                        <p className={cn("text-sm font-bold truncate", t2Won ? "text-white" : "text-neutral-400")}>
                          {team2?.name}
                        </p>
                        <p className="text-[10px] font-mono text-neutral-500 uppercase">
                          {team2?.country}
                        </p>
                      </div>
                      {team2?.logo ? (
                        <img
                          src={team2.logo}
                          alt={team2.name}
                          className="h-9 w-9 object-contain shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-white/[0.05] flex items-center justify-center font-mono font-bold text-xs text-white">
                          {team2?.name?.[0] || "T2"}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-1">
              <Trophy className="h-6 w-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-xs font-mono font-bold text-white uppercase">
                Aucun résultat correspondant aux filtres
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {Object.keys(predictions).length > 0 ? (
            Object.values(predictions).map((pred, idx) => {
              const match = [...upcomingMatches, ...resultsMatches].find((m) => m.id === pred.matchId);
              return (
                <div
                  key={pred.matchId || idx}
                  className="rounded-xl border border-white/[0.07] bg-[#10131B]/90 p-4 backdrop-blur-xl shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-neutral-400 truncate">
                      {match?.tournament || "Match Compétitif"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-neutral-500">Pick :</span>
                      <span className="text-sm font-bold text-amber-300 font-mono">
                        {pred.winner}
                      </span>
                      {pred.score && (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.2 font-mono text-[10px] text-white">
                          {pred.score}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPredictions((prev) => {
                        const copy = { ...prev };
                        delete copy[pred.matchId];
                        try {
                          localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
                        } catch {}
                        return copy;
                      });
                    }}
                    className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer shrink-0"
                  >
                    Supprimer
                  </button>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-1">
              <Trophy className="h-6 w-6 text-neutral-500 mx-auto mb-2" />
              <p className="text-xs font-mono font-bold text-white uppercase">
                Vous n'avez pas encore fait de pronostic
              </p>
              <p className="text-[11px] text-neutral-400">
                Allez dans l'onglet "À venir & En direct" et cliquez sur une équipe pour enregistrer votre Pick'em.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
