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
  Award,
  Zap,
  ArrowRight,
  CalendarDays,
  Lock,
  Bell,
  BellOff,
  CheckCheck,
  TrendingUp,
  BarChart3,
  Sparkles,
  Shield,
  SlidersHorizontal,
} from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { getTrackerI18n } from "@/lib/i18n-tracker";
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

export type VctTier = "champions" | "masters" | "international" | "challengers" | "game_changers" | "other";
export type MatchFormat = "BO1" | "BO3" | "BO5";
export type VctNavView = "overview" | "events" | "matches" | "pickems" | "leaderboard";
export type MatchDisplayMode = "detailed" | "quick" | "calendar";
export type MatchStatusFilter = "all" | "upcoming" | "results";
export type PickemStatusFilter = "all" | "pending" | "won" | "missed";

export interface TournamentMeta {
  tier: VctTier;
  tierRank: number;
  tierLabel: string;
  tierBadgeColor: string;
}

export interface TournamentGroup {
  name: string;
  img?: string;
  meta: TournamentMeta;
  status: "live" | "upcoming" | "finished";
  totalMatches: number;
  upcomingMatches: VlrMatch[];
  resultsMatches: VlrMatch[];
  teams: { name: string; logo?: string }[];
  earliestDate: number;
  latestDate: number;
}

const UPCOMING_API = "https://vlr.orlandomm.net/api/v1/matches";
const RESULTS_API = "https://vlr.orlandomm.net/api/v1/results";
const STORAGE_KEY = "ethone:vct:pickems";
const REMINDERS_KEY = "ethone:vct:reminders";

export function classifyTournament(name: string): TournamentMeta {
  const lower = (name || "").toLowerCase();

  if (lower.includes("game changers")) {
    return {
      tier: "game_changers",
      tierRank: 5,
      tierLabel: "Game Changers",
      tierBadgeColor: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
    };
  }

  const isTrueChampions =
    (lower.includes("champions") && !lower.includes("champions tour")) ||
    lower.includes("champions 202") ||
    lower.includes("champions seoul") ||
    lower.includes("champions paris") ||
    lower.includes("champions istanbul") ||
    lower.includes("champions los angeles") ||
    lower.includes("world championship");

  if (isTrueChampions) {
    return {
      tier: "champions",
      tierRank: 1,
      tierLabel: "Champions",
      tierBadgeColor: "border-amber-400/50 bg-amber-500/20 text-amber-300",
    };
  }

  if (lower.includes("masters") || lower.includes("lock//in")) {
    return {
      tier: "masters",
      tierRank: 2,
      tierLabel: "Masters",
      tierBadgeColor: "border-purple-500/40 bg-purple-500/15 text-purple-300",
    };
  }

  if (
    lower.includes("americas") ||
    lower.includes("emea") ||
    lower.includes("pacific") ||
    lower.includes("china") ||
    lower.includes("international league") ||
    lower.includes("vct kickoff") ||
    lower.includes("stage 1") ||
    lower.includes("stage 2")
  ) {
    if (lower.includes("challengers") || lower.includes("ascension")) {
      return {
        tier: "challengers",
        tierRank: 4,
        tierLabel: "Challengers",
        tierBadgeColor: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
      };
    }
    return {
      tier: "international",
      tierRank: 3,
      tierLabel: "VCT League",
      tierBadgeColor: "border-rose-500/40 bg-rose-500/15 text-rose-300",
    };
  }

  if (lower.includes("challengers") || lower.includes("ascension") || lower.includes("vcl")) {
    return {
      tier: "challengers",
      tierRank: 4,
      tierLabel: "Challengers",
      tierBadgeColor: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300",
    };
  }

  return {
    tier: "other",
    tierRank: 6,
    tierLabel: "Circuit",
    tierBadgeColor: "border-white/10 bg-white/[0.05] text-neutral-300",
  };
}

export function parseMatchTimestamp(m: VlrMatch): number {
  if (typeof m.timestamp === "number" && m.timestamp > 0) {
    return m.timestamp < 10000000000 ? m.timestamp * 1000 : m.timestamp;
  }
  if (m.utcDate) {
    const raw = m.utcDate.includes("T") ? m.utcDate : m.utcDate.replace(" ", "T") + "Z";
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) return parsed;
  }
  if (m.in) {
    const inStr = m.in.toLowerCase();
    let ms = 0;
    const dMatch = inStr.match(/(\d+)\s*d/);
    const hMatch = inStr.match(/(\d+)\s*h/);
    const mMatch = inStr.match(/(\d+)\s*m/);
    if (dMatch) ms += parseInt(dMatch[1], 10) * 86400000;
    if (hMatch) ms += parseInt(hMatch[1], 10) * 3600000;
    if (mMatch) ms += parseInt(mMatch[1], 10) * 60000;
    if (ms > 0) return Date.now() + ms;
  }
  if (m.ago) {
    const agoStr = m.ago.toLowerCase();
    let ms = 0;
    const dMatch = agoStr.match(/(\d+)\s*d/);
    const hMatch = agoStr.match(/(\d+)\s*h/);
    const mMatch = agoStr.match(/(\d+)\s*m/);
    if (dMatch) ms += parseInt(dMatch[1], 10) * 86400000;
    if (hMatch) ms += parseInt(hMatch[1], 10) * 3600000;
    if (mMatch) ms += parseInt(mMatch[1], 10) * 60000;
    if (ms > 0) return Date.now() - ms;
  }
  return 0;
}

export function detectMatchFormat(match: VlrMatch): MatchFormat {
  const hay = `${match.tournament} ${match.event || ""} ${match.status || ""}`.toLowerCase();
  if (hay.includes("bo5") || hay.includes("best of 5") || hay.includes("grand final") || hay.includes("grande finale")) {
    return "BO5";
  }
  if (hay.includes("bo1") || hay.includes("best of 1")) {
    return "BO1";
  }
  return "BO3";
}

export function isMatchLocked(m: VlrMatch): boolean {
  if (m.status?.toLowerCase() === "live" || m.status?.toLowerCase() === "completed") return true;
  const ts = parseMatchTimestamp(m);
  if (ts > 0 && ts <= Date.now()) return true;
  return false;
}

export function getRankTier(points: number, isEn: boolean) {
  if (points >= 100) return { title: isEn ? "Radiant Predictor" : "Pronostiqueur Radiant", badge: "border-amber-400 bg-amber-500/20 text-amber-300", min: 100, next: 150 };
  if (points >= 60) return { title: isEn ? "Immortal Predictor" : "Pronostiqueur Immortel", badge: "border-rose-500 bg-rose-500/20 text-rose-300", min: 60, next: 100 };
  if (points >= 30) return { title: isEn ? "Ascendant Predictor" : "Pronostiqueur Ascendant", badge: "border-emerald-500 bg-emerald-500/20 text-emerald-300", min: 30, next: 60 };
  if (points >= 15) return { title: isEn ? "Diamond Predictor" : "Pronostiqueur Diamant", badge: "border-cyan-500 bg-cyan-500/20 text-cyan-300", min: 15, next: 30 };
  return { title: isEn ? "Gold Predictor" : "Pronostiqueur Or", badge: "border-yellow-500 bg-yellow-500/20 text-yellow-300", min: 0, next: 15 };
}

export function getMatchDateGroup(m: VlrMatch, isEn: boolean): string {
  const ts = parseMatchTimestamp(m);
  if (ts <= 0) return isEn ? "Upcoming (Date TBD)" : "À venir (Date à confirmer)";
  const now = new Date();
  const d = new Date(ts);

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now.getTime() + 86400000);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();

  if (isToday) return isEn ? "Today" : "Aujourd'hui";
  if (isTomorrow) return isEn ? "Tomorrow" : "Demain";

  const diffDays = Math.round((ts - now.getTime()) / 86400000);
  if (diffDays < 0) {
    if (diffDays === -1) return isEn ? "Yesterday" : "Hier";
    return isEn ? "Past Matches" : "Matchs Terminés";
  }

  return new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}

export function formatMatchLocalTime(m: VlrMatch, isEn: boolean): string {
  const ts = parseMatchTimestamp(m);
  if (ts <= 0) return m.in || m.utcDate || (isEn ? "TBD" : "À venir");
  return new Intl.DateTimeFormat(isEn ? "en-US" : "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default function VctMatchesView({ lang }: { lang?: string } = {}) {
  const { settings } = useSettings();
  const effectiveLang =
    lang ||
    (typeof window !== "undefined"
      ? localStorage.getItem("ethone:tracker:language")
      : null) ||
    "en";
  const tr = useMemo(() => getTrackerI18n(effectiveLang), [effectiveLang]);
  const isEn = effectiveLang.toLowerCase().startsWith("en");
  const reducedMotion = useReducedMotion();

  const [upcomingMatches, setUpcomingMatches] = useState<VlrMatch[]>([]);
  const [resultsMatches, setResultsMatches] = useState<VlrMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<VctNavView>("overview");
  const [matchDisplayMode, setMatchDisplayMode] = useState<MatchDisplayMode>("detailed");

  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [tournamentSearch, setTournamentSearch] = useState<string>("");
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  const [matchStatusFilter, setMatchStatusFilter] = useState<MatchStatusFilter>("all");
  const [matchSearchQuery, setMatchSearchQuery] = useState<string>("");

  const [pickemFilter, setPickemFilter] = useState<PickemStatusFilter>("all");
  const [pickemSearchQuery, setPickemSearchQuery] = useState<string>("");

  const [saveToast, setSaveToast] = useState<string | null>(null);

  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(REMINDERS_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [predictions, setPredictions] = useState<Record<string, PickEmPrediction>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [draftPredictions, setDraftPredictions] = useState<Record<string, PickEmPrediction>>(() => predictions);

  useEffect(() => {
    setDraftPredictions(predictions);
  }, [predictions]);

  const savePrediction = useCallback((matchId: string, winner: string, score?: string) => {
    setPredictions((prev) => {
      const existing = prev[matchId];
      const isSameWinner = existing?.winner?.toLowerCase() === winner.toLowerCase();
      const nextScore = score !== undefined ? score : (isSameWinner ? existing?.score : undefined);

      const next = {
        ...prev,
        [matchId]: {
          matchId,
          winner,
          score: nextScore,
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

  const handleToggleReminders = async () => {
    const next = !remindersEnabled;
    setRemindersEnabled(next);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(REMINDERS_KEY, next ? "1" : "0");
      } catch {}
      if (next && "Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        await Notification.requestPermission();
      }
    }
    setSaveToast(next ? (isEn ? "Reminders enabled for upcoming matches" : "Rappels activés pour les matchs à venir") : (isEn ? "Reminders disabled" : "Rappels désactivés"));
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleDraftPick = (matchId: string, winner: string) => {
    setDraftPredictions((prev) => {
      const existing = prev[matchId];
      if (existing?.winner?.toLowerCase() === winner.toLowerCase()) {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      }
      return {
        ...prev,
        [matchId]: {
          matchId,
          winner,
          score: prev[matchId]?.score,
          savedAt: Date.now(),
        },
      };
    });
  };

  const handleDraftScore = (matchId: string, score: string) => {
    setDraftPredictions((prev) => {
      const existing = prev[matchId];
      if (!existing?.winner) return prev;
      return {
        ...prev,
        [matchId]: {
          ...existing,
          score: existing.score === score ? undefined : score,
        },
      };
    });
  };

  const unsavedCount = useMemo(() => {
    const allKeys = Array.from(new Set([...Object.keys(draftPredictions), ...Object.keys(predictions)]));
    let diff = 0;
    allKeys.forEach((key) => {
      const d = draftPredictions[key];
      const p = predictions[key];
      if (!d && p) diff++;
      else if (d && !p) diff++;
      else if (d && p && (d.winner !== p.winner || d.score !== p.score)) diff++;
    });
    return diff;
  }, [draftPredictions, predictions]);

  const handleSaveAllDrafts = () => {
    setPredictions(draftPredictions);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draftPredictions));
      } catch {}
    }
    setSaveToast(isEn ? "All predictions saved successfully!" : "Tous les pronostics ont été enregistrés !");
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleResetDrafts = () => {
    setDraftPredictions(predictions);
  };

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
      setErrorMsg(isEn ? "Unable to connect to official VCT feed. Please try again." : "Impossible de joindre le flux officiel VCT. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    loadVctData();
  }, [loadVctData]);

  const liveMatches = useMemo(() => {
    return upcomingMatches.filter((m) => m.status?.toLowerCase() === "live");
  }, [upcomingMatches]);

  const liveCount = liveMatches.length;

  const tournamentsCatalog = useMemo<TournamentGroup[]>(() => {
    const map = new Map<string, TournamentGroup>();

    const recordMatch = (m: VlrMatch, isUp: boolean) => {
      const tourName = m.tournament?.trim();
      if (!tourName) return;

      let group = map.get(tourName);
      if (!group) {
        group = {
          name: tourName,
          img: m.img,
          meta: classifyTournament(tourName),
          status: "upcoming",
          totalMatches: 0,
          upcomingMatches: [],
          resultsMatches: [],
          teams: [],
          earliestDate: 0,
          latestDate: 0,
        };
        map.set(tourName, group);
      }

      if (m.img && !group.img) group.img = m.img;
      group.totalMatches++;

      const ts = parseMatchTimestamp(m);
      if (ts > 0) {
        if (group.earliestDate === 0 || ts < group.earliestDate) group.earliestDate = ts;
        if (ts > group.latestDate) group.latestDate = ts;
      }

      if (isUp) {
        group.upcomingMatches.push(m);
      } else {
        group.resultsMatches.push(m);
      }

      m.teams?.forEach((t) => {
        if (t?.name && t.name !== "TBD" && !group.teams.some((existing) => existing.name === t.name)) {
          group.teams.push({ name: t.name, logo: t.logo });
        }
      });
    };

    upcomingMatches.forEach((m) => recordMatch(m, true));
    resultsMatches.forEach((m) => recordMatch(m, false));

    const list = Array.from(map.values()).map((g) => {
      const hasLive = g.upcomingMatches.some((m) => m.status?.toLowerCase() === "live");
      if (hasLive) {
        g.status = "live";
      } else if (g.upcomingMatches.length > 0) {
        g.status = "upcoming";
      } else {
        g.status = "finished";
      }
      return g;
    });

    list.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;

      if (a.status === "upcoming" && b.status === "finished") return -1;
      if (b.status === "upcoming" && a.status === "finished") return 1;

      if (a.status === "upcoming" && b.status === "upcoming") {
        const diff = Math.abs(a.earliestDate - b.earliestDate);
        if (diff < 86400000 * 3) {
          if (a.meta.tierRank !== b.meta.tierRank) {
            return a.meta.tierRank - b.meta.tierRank;
          }
        }
        if (a.earliestDate > 0 && b.earliestDate > 0) {
          return a.earliestDate - b.earliestDate;
        }
        return a.meta.tierRank - b.meta.tierRank;
      }

      if (a.meta.tierRank !== b.meta.tierRank) {
        return a.meta.tierRank - b.meta.tierRank;
      }

      return b.latestDate - a.latestDate;
    });

    return list;
  }, [upcomingMatches, resultsMatches]);

  const filteredTournaments = useMemo(() => {
    return tournamentsCatalog.filter((tour) => {
      if (selectedTierFilter !== "all" && tour.meta.tier !== selectedTierFilter) return false;
      if (selectedStatusFilter !== "all") {
        if (selectedStatusFilter === "live" && tour.status !== "live") return false;
        if (selectedStatusFilter === "upcoming" && tour.status !== "upcoming" && tour.status !== "live") return false;
        if (selectedStatusFilter === "finished" && tour.status !== "finished") return false;
      }
      if (tournamentSearch.trim()) {
        const q = tournamentSearch.toLowerCase();
        const matchesName = tour.name.toLowerCase().includes(q);
        const matchesTier = tour.meta.tierLabel.toLowerCase().includes(q);
        const matchesTeam = tour.teams.some((t) => t.name.toLowerCase().includes(q));
        if (!matchesName && !matchesTier && !matchesTeam) return false;
      }
      return true;
    });
  }, [tournamentsCatalog, selectedTierFilter, selectedStatusFilter, tournamentSearch]);

  const allScopedMatches = useMemo(() => {
    let upcomingPool = upcomingMatches;
    let resultsPool = resultsMatches;

    if (selectedTournament !== "all") {
      upcomingPool = upcomingPool.filter((m) => m.tournament === selectedTournament);
      resultsPool = resultsPool.filter((m) => m.tournament === selectedTournament);
    }

    const sortUpcoming = (list: VlrMatch[]) => {
      return [...list].sort((a, b) => {
        const aLive = a.status?.toLowerCase() === "live";
        const bLive = b.status?.toLowerCase() === "live";
        if (aLive && !bLive) return -1;
        if (bLive && !aLive) return 1;

        const aMeta = classifyTournament(a.tournament);
        const bMeta = classifyTournament(b.tournament);
        const aTime = parseMatchTimestamp(a);
        const bTime = parseMatchTimestamp(b);

        if (aTime > 0 && bTime > 0) {
          const dayDiff = Math.abs(aTime - bTime);
          if (dayDiff < 86400000 * 2) {
            if (aMeta.tierRank !== bMeta.tierRank) {
              return aMeta.tierRank - bMeta.tierRank;
            }
          }
          return aTime - bTime;
        }
        if (aMeta.tierRank !== bMeta.tierRank) {
          return aMeta.tierRank - bMeta.tierRank;
        }
        return aTime - bTime;
      });
    };

    const sortResults = (list: VlrMatch[]) => {
      return [...list].sort((a, b) => {
        const aTime = parseMatchTimestamp(a);
        const bTime = parseMatchTimestamp(b);
        if (bTime !== aTime && bTime > 0 && aTime > 0) {
          return bTime - aTime;
        }
        const aMeta = classifyTournament(a.tournament);
        const bMeta = classifyTournament(b.tournament);
        return aMeta.tierRank - bMeta.tierRank;
      });
    };

    return {
      upcoming: sortUpcoming(upcomingPool),
      results: sortResults(resultsPool),
    };
  }, [upcomingMatches, resultsMatches, selectedTournament]);

  const filteredMatchesList = useMemo(() => {
    let pool: { match: VlrMatch; isUpcoming: boolean }[] = [];

    if (matchStatusFilter === "all") {
      pool = [
        ...allScopedMatches.upcoming.map((m) => ({ match: m, isUpcoming: true })),
        ...allScopedMatches.results.map((m) => ({ match: m, isUpcoming: false })),
      ];
    } else if (matchStatusFilter === "upcoming") {
      pool = allScopedMatches.upcoming.map((m) => ({ match: m, isUpcoming: true }));
    } else {
      pool = allScopedMatches.results.map((m) => ({ match: m, isUpcoming: false }));
    }

    if (!matchSearchQuery.trim()) return pool;

    const q = matchSearchQuery.toLowerCase();
    return pool.filter(({ match: m }) => {
      const t1 = m.teams?.[0]?.name?.toLowerCase() || "";
      const t2 = m.teams?.[1]?.name?.toLowerCase() || "";
      const tour = m.tournament?.toLowerCase() || "";
      const ev = m.event?.toLowerCase() || "";
      return t1.includes(q) || t2.includes(q) || tour.includes(q) || ev.includes(q);
    });
  }, [allScopedMatches, matchStatusFilter, matchSearchQuery]);

  const matchesByDateGroups = useMemo(() => {
    const map = new Map<string, { match: VlrMatch; isUpcoming: boolean }[]>();
    filteredMatchesList.forEach((item) => {
      const groupKey = getMatchDateGroup(item.match, isEn);
      const arr = map.get(groupKey) || [];
      arr.push(item);
      map.set(groupKey, arr);
    });
    return Array.from(map.entries());
  }, [filteredMatchesList, isEn]);

  const pickEmStats = useMemo(() => {
    let evaluated = 0;
    let correct = 0;
    let scoreTotal = 0;
    let exactScores = 0;
    const evaluatedResults: { isCorrect: boolean; timestamp: number; tier: VctTier }[] = [];

    const tierBreakdown: Record<VctTier, { evaluated: number; correct: number }> = {
      champions: { evaluated: 0, correct: 0 },
      masters: { evaluated: 0, correct: 0 },
      international: { evaluated: 0, correct: 0 },
      challengers: { evaluated: 0, correct: 0 },
      game_changers: { evaluated: 0, correct: 0 },
      other: { evaluated: 0, correct: 0 },
    };

    resultsMatches.forEach((m) => {
      const pred = predictions[m.id];
      if (!pred) return;
      evaluated++;

      const winningTeam = m.teams?.find((t) => t.won === true)?.name || (
        Number(m.teams?.[0]?.score || 0) > Number(m.teams?.[1]?.score || 0)
          ? m.teams?.[0]?.name
          : m.teams?.[1]?.name
      );

      const isWon = Boolean(winningTeam && pred.winner.toLowerCase() === winningTeam.toLowerCase());
      const meta = classifyTournament(m.tournament);
      tierBreakdown[meta.tier].evaluated++;

      if (isWon) {
        correct++;
        tierBreakdown[meta.tier].correct++;
        scoreTotal += 10;
        if (pred.score) {
          const actualScore = `${m.teams?.[0]?.score}-${m.teams?.[1]?.score}`;
          const actualScoreInv = `${m.teams?.[1]?.score}-${m.teams?.[0]?.score}`;
          if (pred.score === actualScore || pred.score === actualScoreInv) {
            scoreTotal += 5;
            exactScores++;
          }
        }
      }

      evaluatedResults.push({
        isCorrect: isWon,
        timestamp: parseMatchTimestamp(m),
        tier: meta.tier,
      });
    });

    evaluatedResults.sort((a, b) => a.timestamp - b.timestamp);

    let streak = 0;
    let maxStreak = 0;
    evaluatedResults.forEach((res) => {
      if (res.isCorrect) {
        streak++;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        streak = 0;
      }
    });

    const activeCount = Object.keys(predictions).length;
    const pendingCount = upcomingMatches.filter((m) => predictions[m.id]).length;
    const accuracy = evaluated > 0 ? Math.round((correct / evaluated) * 100) : 0;
    const missedCount = evaluated - correct;

    return {
      evaluated,
      correct,
      scoreTotal,
      activeCount,
      accuracy,
      pendingCount,
      missedCount,
      exactScores,
      currentStreak: streak,
      bestStreak: maxStreak,
      tierBreakdown,
    };
  }, [predictions, resultsMatches, upcomingMatches]);

  const rankTier = useMemo(() => getRankTier(pickEmStats.scoreTotal, isEn), [pickEmStats.scoreTotal, isEn]);

  const urgentUnpredictedMatches = useMemo(() => {
    return allScopedMatches.upcoming
      .filter((m) => !predictions[m.id] && !isMatchLocked(m))
      .slice(0, 3);
  }, [allScopedMatches.upcoming, predictions]);

  const featuredTournaments = useMemo(() => {
    return tournamentsCatalog.slice(0, 4);
  }, [tournamentsCatalog]);

  const allPredictionsList = useMemo(() => {
    return Object.values(predictions).map((pred) => {
      const match = [...upcomingMatches, ...resultsMatches].find((m) => m.id === pred.matchId);
      const isCompleted = match?.status?.toLowerCase() === "completed" || Boolean(match?.ago);
      const isLocked = match ? isMatchLocked(match) : false;
      const team1 = match?.teams?.[0];
      const team2 = match?.teams?.[1];

      const t1Won = team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0));
      const t2Won = team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0));
      const actualWinner = t1Won ? team1?.name : t2Won ? team2?.name : null;

      const isPredCorrect = Boolean(isCompleted && actualWinner && pred.winner.toLowerCase() === actualWinner.toLowerCase());
      const actualScore = `${team1?.score}-${team2?.score}`;
      const actualScoreInv = `${team2?.score}-${team1?.score}`;
      const isScoreExact = Boolean(pred.score && (pred.score === actualScore || pred.score === actualScoreInv));

      return {
        pred,
        match,
        isCompleted,
        isLocked,
        isPredCorrect,
        isScoreExact,
        team1,
        team2,
      };
    });
  }, [predictions, upcomingMatches, resultsMatches]);

  const filteredPredictionsList = useMemo(() => {
    return allPredictionsList.filter((item) => {
      if (pickemFilter === "pending") return !item.isCompleted;
      if (pickemFilter === "won") return item.isCompleted && item.isPredCorrect;
      if (pickemFilter === "missed") return item.isCompleted && !item.isPredCorrect;

      if (pickemSearchQuery.trim()) {
        const q = pickemSearchQuery.toLowerCase();
        const tour = item.match?.tournament?.toLowerCase() || "";
        const w = item.pred.winner.toLowerCase();
        const t1 = item.team1?.name?.toLowerCase() || "";
        const t2 = item.team2?.name?.toLowerCase() || "";
        if (!tour.includes(q) && !w.includes(q) && !t1.includes(q) && !t2.includes(q)) return false;
      }
      return true;
    });
  }, [allPredictionsList, pickemFilter, pickemSearchQuery]);

  const handleSelectTournamentAndJump = (tourName: string) => {
    setSelectedTournament(tourName);
    setActiveView("matches");
    setMatchStatusFilter("upcoming");
  };

  const handleLaunchQuickPicks = (tourName?: string) => {
    if (tourName) setSelectedTournament(tourName);
    setActiveView("matches");
    setMatchDisplayMode("quick");
    setMatchStatusFilter("upcoming");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-r from-[#141824]/90 via-[#0e111a]/95 to-[#141824]/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 uppercase">
              ETHONE Tactical Tracker
            </span>
            <span className="text-neutral-500 font-mono text-xs">•</span>
            <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Pick&apos;ems V2
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-white tracking-tight">
            VCT Competitions & Esports Pick&apos;ems
          </h2>
          <p className="text-xs font-mono text-neutral-400 max-w-xl">
            {isEn
              ? "Official Riot Games & VLR.gg calendar. Predict match winners and exact scores, accumulate points, and progress up the competitive predictor ladder."
              : "Calendrier officiel Riot Games & VLR.gg. Pronostiquez les vainqueurs et scores exacts, gagnez des points et progressez dans le classement esport."}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={handleToggleReminders}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-mono font-semibold transition-all cursor-pointer",
              remindersEnabled
                ? "border-amber-400/40 bg-amber-500/15 text-amber-300"
                : "border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
            )}
            title={remindersEnabled ? (isEn ? "Disable reminders" : "Désactiver les alertes") : (isEn ? "Enable reminders" : "Activer les alertes")}
          >
            {remindersEnabled ? <Bell className="h-3.5 w-3.5 text-amber-400" /> : <BellOff className="h-3.5 w-3.5 text-neutral-400" />}
            <span>{remindersEnabled ? (isEn ? "Reminders: Active" : "Rappels : Actifs") : (isEn ? "Reminders: Off" : "Rappels : Désactivés")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleLaunchQuickPicks()}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/50 bg-rose-600 px-3.5 py-2 text-xs font-mono font-bold text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] active:scale-95 transition-all cursor-pointer"
          >
            <Zap className="h-3.5 w-3.5 text-white" />
            <span>{isEn ? "Quick Picks Mode" : "Mode Pick'ems Rapides"}</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-xs font-mono font-bold text-emerald-300 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{saveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-3.5 sm:p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              {tr.vctScorePickems}
            </span>
            <p className="text-xl sm:text-2xl font-mono font-bold text-amber-300 mt-1 tabular-nums">
              <AnimatedNumber value={pickEmStats.scoreTotal} suffix=" pts" />
            </p>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate">
              {pickEmStats.correct} {isEn ? (pickEmStats.correct > 1 ? "correct picks" : "correct pick") : (pickEmStats.correct > 1 ? "bons pronostics" : "bon pronostic")} ({pickEmStats.exactScores} {isEn ? "exact" : "exacts"})
            </p>
          </div>
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-3.5 sm:p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              {tr.vctAccuracy}
            </span>
            <p className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 mt-1 tabular-nums">
              <AnimatedNumber value={pickEmStats.accuracy} suffix={isEn ? "%" : " %"} locale={isEn ? "en" : "fr"} />
            </p>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate">
              {pickEmStats.evaluated} {isEn ? "evaluated" : "évalués"} ({pickEmStats.missedCount} {isEn ? "missed" : "manqués"})
            </p>
          </div>
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Target className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-3.5 sm:p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              {isEn ? "Pending Picks" : "Pronos en attente"}
            </span>
            <p className="text-xl sm:text-2xl font-mono font-bold text-rose-400 mt-1 tabular-nums">
              <AnimatedNumber value={pickEmStats.pendingCount} />
            </p>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate">
              {pickEmStats.activeCount} {isEn ? "saved total" : "enregistrés au total"}
            </p>
          </div>
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#10131B]/90 p-3.5 sm:p-4 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              {isEn ? "Predictor Rank" : "Rang Prono"}
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={cn("rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold truncate max-w-[130px]", rankTier.badge)}>
                {rankTier.title}
              </span>
            </div>
            <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
              {rankTier.next - pickEmStats.scoreTotal > 0
                ? `${rankTier.next - pickEmStats.scoreTotal} pts ${isEn ? "to next tier" : "pour le palier suivant"}`
                : isEn ? "Max tier reached" : "Palier max atteint"}
            </p>
          </div>
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-2.5 sm:p-3 backdrop-blur-xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 overflow-x-auto os-scroll pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setActiveView("overview")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                activeView === "overview" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {activeView === "overview" && (
                <motion.div
                  layoutId="vct-active-view-tab"
                  className="absolute inset-0 rounded-xl bg-rose-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Zap className="relative z-10 h-3.5 w-3.5 text-rose-300" />
              <span className="relative z-10">{isEn ? "Overview" : "Vue d'ensemble"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("events")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                activeView === "events" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {activeView === "events" && (
                <motion.div
                  layoutId="vct-active-view-tab"
                  className="absolute inset-0 rounded-xl bg-rose-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Trophy className="relative z-10 h-3.5 w-3.5 text-amber-300" />
              <span className="relative z-10">{isEn ? "Tournaments" : "Événements"}</span>
              <span className="relative z-10 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px]">
                {tournamentsCatalog.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("matches")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                activeView === "matches" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {activeView === "matches" && (
                <motion.div
                  layoutId="vct-active-view-tab"
                  className="absolute inset-0 rounded-xl bg-rose-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Swords className="relative z-10 h-3.5 w-3.5 text-cyan-300" />
              <span className="relative z-10">{isEn ? "Matches & Calendar" : "Matchs & Calendrier"}</span>
              {liveCount > 0 ? (
                <span className="relative z-10 rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white animate-pulse">
                  {liveCount} {tr.live}
                </span>
              ) : (
                <span className="relative z-10 rounded-full bg-black/40 px-1.5 py-0.2 text-[10px]">
                  {upcomingMatches.length + resultsMatches.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView("pickems")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                activeView === "pickems" ? "text-black font-bold" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {activeView === "pickems" && (
                <motion.div
                  layoutId="vct-active-view-tab"
                  className="absolute inset-0 rounded-xl bg-amber-400 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Target className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{tr.vctMyPickemsTab}</span>
              <span className="relative z-10 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                {pickEmStats.activeCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("leaderboard")}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-xs font-mono font-semibold transition-all cursor-pointer shrink-0",
                activeView === "leaderboard" ? "text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              {activeView === "leaderboard" && (
                <motion.div
                  layoutId="vct-active-view-tab"
                  className="absolute inset-0 rounded-xl bg-purple-600 shadow-sm"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <BarChart3 className="relative z-10 h-3.5 w-3.5 text-purple-300" />
              <span className="relative z-10">{isEn ? "Rank & Analytics" : "Classement & Analyses"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={loadVctData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              title={tr.refresh}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              <span className="font-mono text-[11px]">{tr.refresh}</span>
            </button>
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
            {isEn ? "Retry" : "Réessayer"}
          </button>
        </div>
      ) : activeView === "overview" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-950/30 via-[#131622] to-[#131622] p-4 sm:p-5 backdrop-blur-xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                  {isEn ? "Rapid Prediction Mode" : "Fonctionnalité Prioritaire"}
                </span>
                <span className="text-neutral-400 text-xs font-mono">• 30s</span>
              </div>
              <h3 className="font-mono text-base font-bold text-white">
                {isEn ? "Batch Predict Upcoming Matches in Seconds" : "Remplissez vos pronostics en un clin d'œil"}
              </h3>
              <p className="text-xs font-mono text-neutral-400 max-w-lg">
                {isEn
                  ? "Select match winners and exact scores in a single compact stream without opening multiple popups, then save all with one click."
                  : "Sélectionnez vos vainqueurs et scores exacts dans une liste compacte sans popups superflus, et enregistrez tout en un seul clic."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleLaunchQuickPicks()}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 text-black px-4 py-2.5 text-xs font-mono font-bold hover:bg-amber-300 active:scale-95 transition-all cursor-pointer shrink-0 shadow-md"
            >
              <Zap className="h-4 w-4 text-black" />
              <span>{isEn ? "Start Quick Picks →" : "Lancer les Pick'ems Rapides →"}</span>
            </button>
          </div>

          {urgentUnpredictedMatches.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-[#121520] to-[#121520] p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                      {isEn ? "Urgent Pick'ems — Starting Soon" : "À pronostiquer d'urgence — Début imminent"}
                    </h3>
                    <p className="text-[11px] font-mono text-neutral-400">
                      {isEn ? "Lock in your predictions before match starts (+10 pts winner, +5 pts exact score)" : "Validez vos pronostics avant le coup d'envoi (+10 pts vainqueur, +5 pts score exact)"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("matches");
                    setMatchStatusFilter("upcoming");
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
                >
                  <span>{isEn ? "View all matches →" : "Voir tous les matchs →"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {urgentUnpredictedMatches.map((m) => {
                  const team1 = m.teams?.[0];
                  const team2 = m.teams?.[1];
                  const pred = predictions[m.id];
                  const isLive = m.status?.toLowerCase() === "live";
                  const format = detectMatchFormat(m);

                  return (
                    <div
                      key={m.id}
                      className="rounded-xl border border-white/[0.08] bg-[#0c0f17]/90 p-3.5 space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-neutral-400 truncate max-w-[140px]" title={m.tournament}>
                          {m.tournament}
                        </span>
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-bold animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            {isEn ? "LIVE" : "DIRECT"}
                          </span>
                        ) : (
                          <span className="text-amber-400 font-medium">
                            {m.in || (isEn ? "Starting soon" : "Bientôt")}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => team1?.name && savePrediction(m.id, team1.name)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer text-center",
                            pred?.winner?.toLowerCase() === team1?.name?.toLowerCase()
                              ? "border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400/50"
                              : "border-white/[0.08] bg-black/40 hover:border-white/20 text-neutral-200"
                          )}
                        >
                          <div className="h-8 w-8 mb-1 flex items-center justify-center overflow-hidden">
                            {team1?.logo ? (
                              <img src={team1.logo} alt={team1.name} className="h-full w-full object-contain" />
                            ) : (
                              <span className="font-mono text-xs font-bold text-neutral-400">{team1?.name?.[0] || "1"}</span>
                            )}
                          </div>
                          <span className="font-mono text-xs font-bold truncate max-w-full">{team1?.name || "TBD"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => team2?.name && savePrediction(m.id, team2.name)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-lg border transition-all cursor-pointer text-center",
                            pred?.winner?.toLowerCase() === team2?.name?.toLowerCase()
                              ? "border-amber-400 bg-amber-500/20 text-white ring-1 ring-amber-400/50"
                              : "border-white/[0.08] bg-black/40 hover:border-white/20 text-neutral-200"
                          )}
                        >
                          <div className="h-8 w-8 mb-1 flex items-center justify-center overflow-hidden">
                            {team2?.logo ? (
                              <img src={team2.logo} alt={team2.name} className="h-full w-full object-contain" />
                            ) : (
                              <span className="font-mono text-xs font-bold text-neutral-400">{team2?.name?.[0] || "2"}</span>
                            )}
                          </div>
                          <span className="font-mono text-xs font-bold truncate max-w-full">{team2?.name || "TBD"}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-mono">
                        <span className="text-neutral-500">{format}</span>
                        {pred?.winner ? (
                          <span className="text-amber-400 font-bold truncate">
                            ✓ {isEn ? "Picks:" : "Choisi:"} {pred.winner}
                          </span>
                        ) : (
                          <span className="text-neutral-400">{isEn ? "Click team to pick" : "Cliquez pour choisir"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                  {isEn ? "Featured Competitions" : "Compétitions Majeures en cours"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("events")}
                className="text-xs font-mono text-amber-400 hover:text-amber-300 underline underline-offset-4 transition-colors cursor-pointer"
              >
                {isEn ? "View tournament catalog →" : "Catalogue complet des tournois →"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {featuredTournaments.map((tour) => {
                const totalTourUpcoming = tour.upcomingMatches.length;
                const predictedInTour = tour.upcomingMatches.filter((m) => predictions[m.id]).length;
                const progressPct = totalTourUpcoming > 0 ? Math.round((predictedInTour / totalTourUpcoming) * 100) : 100;

                return (
                  <div
                    key={tour.name}
                    className="group rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 backdrop-blur-xl shadow-md hover:border-white/20 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {tour.img && (
                            <img
                              src={tour.img}
                              alt={tour.name}
                              className="h-6 w-6 object-contain shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className={cn("rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase shrink-0 border", tour.meta.tierBadgeColor)}>
                            {tour.meta.tierLabel}
                          </span>
                        </div>
                        {tour.status === "live" ? (
                          <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono font-bold animate-pulse shrink-0">
                            {isEn ? "LIVE" : "EN DIRECT"}
                          </span>
                        ) : tour.status === "upcoming" ? (
                          <span className="rounded bg-white/[0.06] text-neutral-300 px-2 py-0.5 text-[10px] font-mono shrink-0">
                            {tour.upcomingMatches.length} {isEn ? "upcoming" : "à venir"}
                          </span>
                        ) : (
                          <span className="rounded bg-white/[0.04] text-neutral-500 px-2 py-0.5 text-[10px] font-mono shrink-0">
                            {isEn ? "Finished" : "Terminé"}
                          </span>
                        )}
                      </div>

                      <h4 className="font-mono font-bold text-white text-sm mt-2.5 truncate" title={tour.name}>
                        {tour.name}
                      </h4>

                      <div className="flex items-center gap-1.5 mt-2 overflow-hidden h-6">
                        {tour.teams.slice(0, 6).map((tm) => (
                          <div
                            key={tm.name}
                            className="h-5 w-5 rounded-md border border-white/10 bg-black/40 flex items-center justify-center p-0.5 overflow-hidden"
                            title={tm.name}
                          >
                            {tm.logo ? (
                              <img src={tm.logo} alt={tm.name} className="h-full w-full object-contain" />
                            ) : (
                              <span className="text-[9px] font-mono text-neutral-400">{tm.name[0]}</span>
                            )}
                          </div>
                        ))}
                        {tour.teams.length > 6 && (
                          <span className="text-[10px] font-mono text-neutral-500 pl-1">
                            +{tour.teams.length - 6}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-neutral-400">{isEn ? "Pick'ems progress:" : "Pronostics validés :"}</span>
                        <span className="font-bold text-amber-300">
                          {predictedInTour}/{totalTourUpcoming} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSelectTournamentAndJump(tour.name)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white py-1.5 text-[11px] font-mono font-semibold text-neutral-300 transition-all cursor-pointer text-center truncate"
                        >
                          {isEn ? "Matches" : "Matchs"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchQuickPicks(tour.name)}
                          className="rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 py-1.5 text-[11px] font-mono font-bold transition-all cursor-pointer text-center truncate"
                        >
                          ⚡ {isEn ? "Quick" : "Rapide"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                  {isEn ? "Recent Match Outcomes" : "Derniers Résultats Enregistrés"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveView("matches");
                  setMatchStatusFilter("results");
                }}
                className="text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {isEn ? "All results →" : "Tous les résultats →"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {resultsMatches.slice(0, 4).map((m) => {
                const team1 = m.teams?.[0];
                const team2 = m.teams?.[1];
                const t1Won = team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0));
                const t2Won = team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0));
                const pred = predictions[m.id];
                const actualWinner = t1Won ? team1?.name : t2Won ? team2?.name : null;
                const isPredCorrect = pred && actualWinner && pred.winner.toLowerCase() === actualWinner.toLowerCase();

                return (
                  <div
                    key={m.id}
                    className="rounded-xl border border-white/[0.06] bg-black/40 p-3 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-neutral-500 truncate block">{m.tournament}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn("font-bold truncate", t1Won ? "text-emerald-400" : "text-neutral-400")}>
                          {team1?.name} ({team1?.score ?? "0"})
                        </span>
                        <span className="text-neutral-600 font-bold">vs</span>
                        <span className={cn("font-bold truncate", t2Won ? "text-emerald-400" : "text-neutral-400")}>
                          {team2?.name} ({team2?.score ?? "0"})
                        </span>
                      </div>
                    </div>
                    {pred ? (
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-[10px] font-bold shrink-0 border",
                          isPredCorrect
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border-rose-500/40 bg-rose-500/15 text-rose-300"
                        )}
                      >
                        {isPredCorrect ? (isEn ? "WON +10" : "GAGNÉ +10") : (isEn ? "MISSED 0" : "MANQUÉ 0")}
                      </span>
                    ) : (
                      <span className="rounded bg-white/[0.04] text-neutral-500 px-2 py-0.5 text-[10px] shrink-0">
                        {isEn ? "No pick" : "Pas de prono"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeView === "events" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 backdrop-blur-xl shadow-md space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-2 flex-1 max-w-md focus-within:border-amber-400/40 transition-all">
                <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={tournamentSearch}
                  onChange={(e) => setTournamentSearch(e.target.value)}
                  placeholder={isEn ? "Search tournaments, teams or circuits..." : "Rechercher un tournoi, une équipe, un circuit..."}
                  className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto os-scroll">
                {[
                  { id: "all", label: isEn ? "All Circuits" : "Tous les circuits" },
                  { id: "champions", label: "Champions" },
                  { id: "masters", label: "Masters" },
                  { id: "international", label: "VCT Leagues" },
                  { id: "challengers", label: "Challengers" },
                  { id: "game_changers", label: "Game Changers" },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTierFilter(tier.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-mono transition-all cursor-pointer shrink-0",
                      selectedTierFilter === tier.id
                        ? "bg-rose-600 text-white font-bold shadow-xs"
                        : "bg-white/[0.04] text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                    )}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
              <span className="text-neutral-500">{isEn ? "Status:" : "Statut :"}</span>
              {[
                { id: "all", label: isEn ? "All" : "Tous" },
                { id: "live", label: isEn ? "Live" : "En direct" },
                { id: "upcoming", label: isEn ? "Upcoming" : "À venir" },
                { id: "finished", label: isEn ? "Finished" : "Terminés" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStatusFilter(st.id)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] font-mono transition-all cursor-pointer",
                    selectedStatusFilter === st.id
                      ? "bg-white/20 text-white font-bold"
                      : "text-neutral-400 hover:text-neutral-200"
                  )}
                >
                  {st.label}
                </button>
              ))}
              <span className="text-neutral-500 ml-auto">
                {filteredTournaments.length} {isEn ? (filteredTournaments.length > 1 ? "tournaments found" : "tournament found") : (filteredTournaments.length > 1 ? "tournois trouvés" : "tournoi trouvé")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTournaments.length > 0 ? (
              filteredTournaments.map((tour, idx) => {
                const totalUpcoming = tour.upcomingMatches.length;
                const totalResults = tour.resultsMatches.length;
                const predictedInTour = tour.upcomingMatches.filter((m) => predictions[m.id]).length;
                const progressPct = totalUpcoming > 0 ? Math.round((predictedInTour / totalUpcoming) * 100) : 100;

                return (
                  <motion.div
                    key={tour.name}
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2), ease: EASE_OUT }}
                    className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {tour.img && (
                            <img
                              src={tour.img}
                              alt={tour.name}
                              className="h-6 w-6 object-contain shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className={cn("rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase shrink-0 border", tour.meta.tierBadgeColor)}>
                            {tour.meta.tierLabel}
                          </span>
                        </div>

                        {tour.status === "live" ? (
                          <span className="rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono font-bold animate-pulse shrink-0">
                            {isEn ? "LIVE" : "EN DIRECT"}
                          </span>
                        ) : tour.status === "upcoming" ? (
                          <span className="rounded bg-white/[0.06] text-neutral-300 px-2 py-0.5 text-[10px] font-mono shrink-0">
                            {totalUpcoming} {isEn ? "upcoming" : "à venir"}
                          </span>
                        ) : (
                          <span className="rounded bg-white/[0.04] text-neutral-500 px-2 py-0.5 text-[10px] font-mono shrink-0">
                            {isEn ? "Finished" : "Terminé"}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="font-mono font-bold text-white text-base leading-snug">
                          {tour.name}
                        </h4>
                        <p className="text-[11px] font-mono text-neutral-400 mt-1">
                          VALORANT Esports • {totalUpcoming} {isEn ? "upcoming" : "à venir"} • {totalResults} {isEn ? "finished" : "terminés"}
                        </p>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                          {isEn ? "Competing Teams" : "Équipes engagées"} ({tour.teams.length})
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {tour.teams.slice(0, 8).map((tm) => (
                            <div
                              key={tm.name}
                              className="h-6 w-6 rounded-md border border-white/10 bg-black/50 flex items-center justify-center p-0.5 overflow-hidden"
                              title={tm.name}
                            >
                              {tm.logo ? (
                                <img src={tm.logo} alt={tm.name} className="h-full w-full object-contain" />
                              ) : (
                                <span className="text-[9px] font-mono text-neutral-300 font-bold">{tm.name[0]}</span>
                              )}
                            </div>
                          ))}
                          {tour.teams.length > 8 && (
                            <span className="text-[11px] font-mono text-neutral-400 pl-1">
                              +{tour.teams.length - 8}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-neutral-400">{isEn ? "Pick'em progress" : "Pronostics enregistrés"}</span>
                        <span className="font-bold text-amber-300">
                          {predictedInTour}/{totalUpcoming} ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectTournamentAndJump(tour.name)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white py-2 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>{isEn ? "Matches" : "Matchs"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLaunchQuickPicks(tour.name)}
                          className="w-full rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 py-2 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          <span>{isEn ? "Quick Picks" : "Pronos Rapides"}</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-2">
                <Trophy className="h-7 w-7 text-neutral-500 mx-auto mb-1" />
                <p className="text-sm font-mono font-bold text-white uppercase">
                  {isEn ? "No tournaments match your criteria" : "Aucun tournoi ne correspond aux filtres"}
                </p>
                <p className="text-xs text-neutral-400">
                  {isEn ? "Try clearing search filters or selecting 'All Circuits'." : "Essayez d'effacer la recherche ou de sélectionner 'Tous les circuits'."}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : activeView === "matches" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-3.5 sm:p-4 backdrop-blur-xl shadow-md space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-mono font-medium text-neutral-400 shrink-0">
                  {tr.vctEditionLabel}
                </span>
                <div className="relative w-full sm:w-72">
                  <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 pr-8 text-xs font-mono font-medium text-white outline-none focus:border-amber-400/50 transition-all cursor-pointer truncate"
                    aria-label={tr.vctEditionLabel}
                  >
                    <option value="all" className="bg-[#10131B] text-white">
                      {tr.vctAllCompetitions} ({upcomingMatches.length + resultsMatches.length})
                    </option>
                    {tournamentsCatalog.map((t) => (
                      <option key={t.name} value={t.name} className="bg-[#10131B] text-white">
                        {t.name} ({t.totalMatches})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/50 p-1">
                  <button
                    type="button"
                    onClick={() => setMatchDisplayMode("detailed")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer",
                      matchDisplayMode === "detailed" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>{isEn ? "Detailed" : "Détaillée"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchDisplayMode("quick")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer",
                      matchDisplayMode === "quick" ? "bg-amber-400 text-black font-bold shadow-xs" : "text-neutral-400 hover:text-amber-300"
                    )}
                  >
                    <Zap className="h-3 w-3" />
                    <span>{isEn ? "Quick Picks" : "Mode Rapide"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatchDisplayMode("calendar")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer",
                      matchDisplayMode === "calendar" ? "bg-white/15 text-white" : "text-neutral-400 hover:text-white"
                    )}
                  >
                    <CalendarDays className="h-3 w-3" />
                    <span>{isEn ? "Calendar" : "Calendrier"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 focus-within:border-amber-400/40 transition-all flex-1 max-w-xs">
                  <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    placeholder={tr.vctSearchPlaceholder}
                    className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMatchStatusFilter("all")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer",
                    matchStatusFilter === "all"
                      ? "bg-amber-400 text-black font-bold shadow-xs"
                      : "bg-white/[0.04] text-neutral-300 hover:text-white"
                  )}
                >
                  {isEn ? "All Matches" : "Tous les matchs"} ({allScopedMatches.upcoming.length + allScopedMatches.results.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchStatusFilter("upcoming")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer",
                    matchStatusFilter === "upcoming"
                      ? "bg-rose-600 text-white font-bold shadow-xs"
                      : "bg-white/[0.04] text-neutral-300 hover:text-white"
                  )}
                >
                  {isEn ? "Upcoming & Live" : "À venir & En direct"} ({allScopedMatches.upcoming.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMatchStatusFilter("results")}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer",
                    matchStatusFilter === "results"
                      ? "bg-white text-black font-bold shadow-xs"
                      : "bg-white/[0.04] text-neutral-300 hover:text-white"
                  )}
                >
                  {isEn ? "Finished Results" : "Scores terminés"} ({allScopedMatches.results.length})
                </button>
              </div>

              {selectedTournament !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedTournament("all")}
                  className="text-neutral-400 hover:text-white underline underline-offset-4 text-[11px] cursor-pointer"
                >
                  {isEn ? "Reset tournament filter" : "Réinitialiser le filtre tournoi"}
                </button>
              )}
            </div>
          </div>

          {matchDisplayMode === "quick" ? (
            <div className="space-y-3">
              <div className="sticky top-2 z-20 rounded-xl border border-amber-400/40 bg-[#10131B]/95 p-3.5 backdrop-blur-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="font-mono text-xs font-bold text-white">
                    {isEn ? "Quick Picks Stream" : "Flux Pick'ems Rapides"}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono text-neutral-300">
                    {allScopedMatches.upcoming.length} {isEn ? "matches" : "rencontres"}
                  </span>
                  {unsavedCount > 0 && (
                    <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-mono font-bold animate-pulse">
                      {unsavedCount} {isEn ? "unsaved changes" : "modifications non enregistrées"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unsavedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleResetDrafts}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-all cursor-pointer"
                    >
                      {isEn ? "Cancel" : "Annuler"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAllDrafts}
                    disabled={unsavedCount === 0}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 text-black px-4 py-1.5 text-xs font-mono font-bold hover:bg-amber-300 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  >
                    <CheckCheck className="h-4 w-4 text-black" />
                    <span>{isEn ? "Save All Picks" : "Enregistrer tous les choix"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {allScopedMatches.upcoming.map((m) => {
                  const team1 = m.teams?.[0];
                  const team2 = m.teams?.[1];
                  const currentPred = draftPredictions[m.id];
                  const isLocked = isMatchLocked(m);
                  const isT1Picked = currentPred?.winner?.toLowerCase() === team1?.name?.toLowerCase();
                  const isT2Picked = currentPred?.winner?.toLowerCase() === team2?.name?.toLowerCase();
                  const format = detectMatchFormat(m);
                  const scoreOptions = format === "BO5" ? ["3-0", "3-1", "3-2"] : format === "BO3" ? ["2-0", "2-1"] : [];

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        "rounded-xl border p-3 bg-[#0d1017]/90 backdrop-blur-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-3",
                        currentPred?.winner ? "border-amber-400/40 bg-amber-500/[0.03]" : "border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 md:w-56 shrink-0">
                        <span className="text-[10px] font-mono text-neutral-400 truncate block">
                          {m.tournament}
                        </span>
                        <span className="rounded bg-white/[0.05] border border-white/10 px-1.5 py-0.2 text-[9px] font-mono text-neutral-300 uppercase shrink-0">
                          {format}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500 shrink-0">
                          {formatMatchLocalTime(m, isEn)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 flex-1 max-w-lg">
                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => team1?.name && handleDraftPick(m.id, team1.name)}
                          className={cn(
                            "flex items-center justify-between gap-2 p-2 rounded-lg border transition-all cursor-pointer text-left",
                            isT1Picked
                              ? "border-amber-400 bg-amber-500/20 text-white shadow-xs"
                              : "border-white/[0.08] bg-black/40 hover:border-white/20 text-neutral-200",
                            isLocked && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded bg-black/50 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                              {team1?.logo ? (
                                <img src={team1.logo} alt={team1.name} className="h-full w-full object-contain" />
                              ) : (
                                <span className="font-mono text-[10px] text-neutral-400">{team1?.name?.[0] || "1"}</span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold truncate">{team1?.name || "TBD"}</span>
                          </div>
                          {isT1Picked && <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        </button>

                        <button
                          type="button"
                          disabled={isLocked}
                          onClick={() => team2?.name && handleDraftPick(m.id, team2.name)}
                          className={cn(
                            "flex items-center justify-between gap-2 p-2 rounded-lg border transition-all cursor-pointer text-left",
                            isT2Picked
                              ? "border-amber-400 bg-amber-500/20 text-white shadow-xs"
                              : "border-white/[0.08] bg-black/40 hover:border-white/20 text-neutral-200",
                            isLocked && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-6 w-6 rounded bg-black/50 p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                              {team2?.logo ? (
                                <img src={team2.logo} alt={team2.name} className="h-full w-full object-contain" />
                              ) : (
                                <span className="font-mono text-[10px] text-neutral-400">{team2?.name?.[0] || "2"}</span>
                              )}
                            </div>
                            <span className="font-mono text-xs font-bold truncate">{team2?.name || "TBD"}</span>
                          </div>
                          {isT2Picked && <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto">
                        {currentPred?.winner && scoreOptions.length > 0 && (
                          <div className="flex items-center gap-1">
                            {scoreOptions.map((sc) => (
                              <button
                                key={sc}
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleDraftScore(m.id, sc)}
                                className={cn(
                                  "rounded px-2 py-0.5 text-[10px] font-mono transition-all cursor-pointer",
                                  currentPred.score === sc
                                    ? "bg-amber-400 text-black font-bold shadow-xs scale-105"
                                    : "bg-white/[0.05] text-neutral-300 hover:bg-white/10"
                                )}
                              >
                                {sc}
                              </button>
                            ))}
                          </div>
                        )}

                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500">
                            <Lock className="h-3 w-3" />
                            {isEn ? "Locked" : "Verrouillé"}
                          </span>
                        ) : currentPred?.winner ? (
                          <span className="text-[10px] font-mono text-emerald-400 font-bold">✓ {isEn ? "Ready" : "Prêt"}</span>
                        ) : (
                          <span className="text-[10px] font-mono text-neutral-500">{isEn ? "Pending" : "À choisir"}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : matchDisplayMode === "calendar" ? (
            <div className="space-y-5">
              {matchesByDateGroups.map(([dateTitle, groupMatches]) => (
                <div key={dateTitle} className="space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
                    <CalendarDays className="h-4 w-4 text-rose-400" />
                    <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      {dateTitle}
                    </h3>
                    <span className="rounded bg-white/[0.05] px-2 py-0.2 text-[10px] font-mono text-neutral-400">
                      {groupMatches.length} {isEn ? (groupMatches.length > 1 ? "matches" : "match") : (groupMatches.length > 1 ? "matchs" : "match")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupMatches.map(({ match: m, isUpcoming }) => {
                      const team1 = m.teams?.[0];
                      const team2 = m.teams?.[1];
                      const pred = predictions[m.id];
                      const isLive = m.status?.toLowerCase() === "live";
                      const format = detectMatchFormat(m);
                      const isLocked = isMatchLocked(m);
                      const isT1Picked = pred?.winner?.toLowerCase() === team1?.name?.toLowerCase();
                      const isT2Picked = pred?.winner?.toLowerCase() === team2?.name?.toLowerCase();

                      const t1Won = !isUpcoming && (team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0)));
                      const t2Won = !isUpcoming && (team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0)));

                      return (
                        <div
                          key={m.id}
                          className="rounded-xl border border-white/[0.08] bg-[#0d1017]/95 p-3.5 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-neutral-400 truncate max-w-[200px]" title={m.tournament}>
                              {m.tournament}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[9px] text-neutral-300 uppercase">{format}</span>
                              {isLive ? (
                                <span className="text-rose-400 font-bold animate-pulse">● {isEn ? "LIVE" : "DIRECT"}</span>
                              ) : (
                                <span className="text-neutral-400">{formatMatchLocalTime(m, isEn)}</span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => team1?.name && savePrediction(m.id, team1.name)}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer",
                                isT1Picked
                                  ? "border-amber-400 bg-amber-500/20 text-white"
                                  : t1Won
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                                  : "border-white/[0.06] bg-black/40 text-neutral-300 hover:border-white/20",
                                isLocked && !isT1Picked && "opacity-70"
                              )}
                            >
                              <span className="font-mono text-xs font-bold truncate">{team1?.name || "TBD"}</span>
                              {!isUpcoming && <span className="font-mono text-xs font-bold tabular-nums">{team1?.score ?? "0"}</span>}
                            </button>

                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={() => team2?.name && savePrediction(m.id, team2.name)}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer",
                                isT2Picked
                                  ? "border-amber-400 bg-amber-500/20 text-white"
                                  : t2Won
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-white"
                                  : "border-white/[0.06] bg-black/40 text-neutral-300 hover:border-white/20",
                                isLocked && !isT2Picked && "opacity-70"
                              )}
                            >
                              <span className="font-mono text-xs font-bold truncate">{team2?.name || "TBD"}</span>
                              {!isUpcoming && <span className="font-mono text-xs font-bold tabular-nums">{team2?.score ?? "0"}</span>}
                            </button>
                          </div>

                          {pred?.winner && (
                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-mono">
                              <span className="text-amber-400 font-bold">
                                {isEn ? "Pick:" : "Prono :"} {pred.winner} {pred.score ? `(${pred.score})` : ""}
                              </span>
                              {!isUpcoming ? (
                                <span className={cn("font-bold", (pred.winner.toLowerCase() === (t1Won ? team1?.name : team2?.name)?.toLowerCase()) ? "text-emerald-400" : "text-rose-400")}>
                                  {(pred.winner.toLowerCase() === (t1Won ? team1?.name : team2?.name)?.toLowerCase()) ? "+10 pts" : "0 pt"}
                                </span>
                              ) : isLocked ? (
                                <span className="text-neutral-500">🔒 {isEn ? "Locked" : "Verrouillé"}</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => deletePrediction(m.id)}
                                  className="text-neutral-400 hover:text-rose-400 cursor-pointer"
                                >
                                  {isEn ? "Clear" : "Effacer"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredMatchesList.length > 0 ? (
                filteredMatchesList.map(({ match: m, isUpcoming }, idx) => {
                  const team1 = m.teams?.[0];
                  const team2 = m.teams?.[1];
                  const pred = predictions[m.id];
                  const isLive = m.status?.toLowerCase() === "live";
                  const isLocked = isMatchLocked(m);
                  const isT1Picked = pred?.winner?.toLowerCase() === team1?.name?.toLowerCase();
                  const isT2Picked = pred?.winner?.toLowerCase() === team2?.name?.toLowerCase();
                  const format = detectMatchFormat(m);
                  const tourMeta = classifyTournament(m.tournament);

                  const t1Won = !isUpcoming && (team1?.won ?? (Number(team1?.score || 0) > Number(team2?.score || 0)));
                  const t2Won = !isUpcoming && (team2?.won ?? (Number(team2?.score || 0) > Number(team1?.score || 0)));
                  const actualWinner = t1Won ? team1?.name : t2Won ? team2?.name : null;
                  const isPredCorrect = Boolean(!isUpcoming && pred && actualWinner && pred.winner.toLowerCase() === actualWinner.toLowerCase());
                  const actualScore = `${team1?.score}-${team2?.score}`;
                  const actualScoreInv = `${team2?.score}-${team1?.score}`;
                  const isScoreExact = Boolean(!isUpcoming && pred?.score && (pred.score === actualScore || pred.score === actualScoreInv));

                  const scoreOptions = format === "BO5" ? ["3-0", "3-1", "3-2"] : format === "BO3" ? ["2-0", "2-1"] : [];

                  return (
                    <motion.div
                      key={m.id || idx}
                      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2), ease: EASE_OUT }}
                      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#131722]/95 to-[#0e1119]/95 p-4 sm:p-5 backdrop-blur-xl shadow-lg space-y-3.5 hover:border-white/20 transition-all"
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
                          <span className={cn("rounded px-2 py-0.2 text-[10px] font-mono font-bold uppercase shrink-0 border", tourMeta.tierBadgeColor)}>
                            {tourMeta.tierLabel}
                          </span>
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
                          <span className="rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 font-mono text-[10px] font-bold text-neutral-300 uppercase">
                            {format}
                          </span>

                          {isLive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-0.5 font-mono text-[11px] font-bold text-rose-300 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                              {isEn ? "LIVE" : "EN DIRECT"}
                            </span>
                          ) : isUpcoming ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] text-neutral-300">
                              <Clock className="h-3 w-3 text-neutral-400" />
                              {m.in || m.utcDate || (isEn ? "Upcoming" : "À venir")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] text-neutral-400">
                              <History className="h-3 w-3 text-neutral-500" />
                              {m.ago || (isEn ? "Finished" : "Terminé")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                        {isUpcoming ? (
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (!team1?.name || isLocked) return;
                              if (isT1Picked) {
                                deletePrediction(m.id);
                              } else {
                                savePrediction(m.id, team1.name);
                              }
                            }}
                            className={cn(
                              "group relative flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all text-left",
                              isT1Picked
                                ? "border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.18)]"
                                : "border-white/[0.08] bg-[#0c0f17]/90 hover:border-white/20 hover:bg-[#121622] text-neutral-200",
                              isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 shadow-inner overflow-hidden">
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
                                  {isT1Picked ? (isEn ? "Selected as Winner" : "Vainqueur sélectionné") : (isEn ? "Click to pick" : "Cliquer pour pronostiquer")}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isT1Picked ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 text-black px-2.5 py-1 text-[11px] font-mono font-bold shadow-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                                  {isEn ? "MY PICK" : "MON CHOIX"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] text-neutral-400 px-2.5 py-1 text-[11px] font-mono group-hover:text-white group-hover:border-white/20 transition-all">
                                  {isEn ? "Pick" : "Choisir"}
                                </span>
                              )}
                            </div>
                          </button>
                        ) : (
                          <div
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all",
                              t1Won
                                ? "border-emerald-500/40 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                                : "border-white/[0.06] bg-[#0c0f17]/60 text-neutral-400 opacity-80"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 overflow-hidden">
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
                                <span className={cn("font-bold text-sm sm:text-base truncate block", t1Won ? "text-white" : "text-neutral-400")}>
                                  {team1?.name || "TBD"}
                                </span>
                                <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                                  {t1Won ? (isEn ? "Match Winner" : "Vainqueur du match") : (isEn ? "Defeated Team" : "Équipe défaite")}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {t1Won ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {isEn ? "Victory" : "Victoire"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-white/[0.04] text-neutral-400 px-2 py-0.5 text-[10px] font-mono uppercase">
                                  {isEn ? "Defeat" : "Défaite"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col items-center justify-center py-1 sm:py-0">
                          {isUpcoming ? (
                            <>
                              <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-neutral-800 to-neutral-900 shadow-md">
                                <span className="font-mono text-xs sm:text-sm font-black text-rose-400 tracking-wider">VS</span>
                              </div>
                              <span className="text-[10px] font-mono text-neutral-400 uppercase mt-1 tracking-wider">{format}</span>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 px-4 py-2 rounded-xl border border-white/10 bg-black/70 shadow-inner font-mono">
                                <span className={cn("text-2xl sm:text-3xl font-black tabular-nums", t1Won ? "text-emerald-400" : "text-neutral-400")}>
                                  {team1?.score ?? "0"}
                                </span>
                                <span className="text-neutral-600 font-bold text-xl">:</span>
                                <span className={cn("text-2xl sm:text-3xl font-black tabular-nums", t2Won ? "text-emerald-400" : "text-neutral-400")}>
                                  {team2?.score ?? "0"}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-neutral-400 uppercase mt-1">{isEn ? "Final Score" : "Score Final"}</span>
                            </>
                          )}
                        </div>

                        {isUpcoming ? (
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => {
                              if (!team2?.name || isLocked) return;
                              if (isT2Picked) {
                                deletePrediction(m.id);
                              } else {
                                savePrediction(m.id, team2.name);
                              }
                            }}
                            className={cn(
                              "group relative flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all text-left",
                              isT2Picked
                                ? "border-amber-400 bg-amber-500/15 text-white ring-1 ring-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.18)]"
                                : "border-white/[0.08] bg-[#0c0f17]/90 hover:border-white/20 hover:bg-[#121622] text-neutral-200",
                              isLocked ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 shadow-inner overflow-hidden">
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
                                  {isT2Picked ? (isEn ? "Selected as Winner" : "Vainqueur sélectionné") : (isEn ? "Click to pick" : "Cliquer pour pronostiquer")}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {isT2Picked ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-400 text-black px-2.5 py-1 text-[11px] font-mono font-bold shadow-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-black" />
                                  {isEn ? "MY PICK" : "MON CHOIX"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] text-neutral-400 px-2.5 py-1 text-[11px] font-mono group-hover:text-white group-hover:border-white/20 transition-all">
                                  {isEn ? "Pick" : "Choisir"}
                                </span>
                              )}
                            </div>
                          </button>
                        ) : (
                          <div
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl border p-3.5 sm:p-4 transition-all",
                              t2Won
                                ? "border-emerald-500/40 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                                : "border-white/[0.06] bg-[#0c0f17]/60 text-neutral-400 opacity-80"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/50 p-1.5 overflow-hidden">
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
                                <span className={cn("font-bold text-sm sm:text-base truncate block", t2Won ? "text-white" : "text-neutral-400")}>
                                  {team2?.name || "TBD"}
                                </span>
                                <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                                  {t2Won ? (isEn ? "Match Winner" : "Vainqueur du match") : (isEn ? "Defeated Team" : "Équipe défaite")}
                                </p>
                              </div>
                            </div>
                            <div className="shrink-0">
                              {t2Won ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {isEn ? "Victory" : "Victoire"}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-white/[0.04] text-neutral-400 px-2 py-0.5 text-[10px] font-mono uppercase">
                                  {isEn ? "Defeat" : "Défaite"}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {isUpcoming && pred?.winner && scoreOptions.length > 0 && !isLocked && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-xs">
                          <div className="flex items-center gap-2">
                            <Target className="h-3.5 w-3.5 text-amber-400" />
                            <span className="font-mono text-neutral-300">
                              {isEn ? "Exact score" : "Score exact"} <span className="text-amber-300">({isEn ? "+5 pts bonus" : "+5 pts bonus"})</span> :
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {scoreOptions.map((sc) => (
                              <button
                                key={sc}
                                type="button"
                                onClick={() => {
                                  if (pred.score === sc) {
                                    savePrediction(m.id, pred.winner, undefined);
                                  } else {
                                    savePrediction(m.id, pred.winner, sc);
                                  }
                                }}
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
                            <button
                              type="button"
                              onClick={() => deletePrediction(m.id)}
                              className="rounded px-2 py-1 text-[10px] font-mono text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                            >
                              {isEn ? "Clear pick" : "Effacer"}
                            </button>
                          </div>
                        </div>
                      )}

                      {isLocked && isUpcoming && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06] text-[11px] font-mono text-neutral-400">
                          <Lock className="h-3.5 w-3.5 text-amber-400" />
                          <span>{isEn ? "Pick'ems locked (Match started or starting immediately)" : "Pronostics verrouillés (Match commencé ou imminent)"}</span>
                        </div>
                      )}

                      {!isUpcoming && pred && (
                        <div
                          className={cn(
                            "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs font-mono",
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
                              {isEn ? "Your pick:" : "Votre prono :"} <strong>{pred.winner}</strong> {pred.score ? `(${pred.score})` : ""}
                            </span>
                          </div>
                          <span className="font-bold">
                            {isPredCorrect
                              ? isScoreExact
                                ? (isEn ? "+15 pts (Exact score bonus!)" : "+15 pts (Score exact bonus !)")
                                : (isEn ? "+10 pts (Correct winner)" : "+10 pts (Vainqueur correct)")
                              : (isEn ? "0 pts (Missed pick)" : "0 pt (Prono manqué)")}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-2">
                  <Clock className="h-7 w-7 text-neutral-500 mx-auto mb-1" />
                  <p className="text-sm font-mono font-bold text-white uppercase">
                    {isEn ? "No matches found for this filter" : "Aucun match ne correspond aux filtres"}
                  </p>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto">
                    {isEn ? "Try switching tournament selection or clearing search query." : "Essayez de changer de tournoi ou d'effacer les mots-clés de recherche."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeView === "pickems" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                  {isEn ? "My Competitive Pick'em Ledger" : "Journal de mes Pronostics Compétitifs"}
                </h3>
                <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                  {allPredictionsList.length} {isEn ? "total predictions saved in local storage" : "pronostics enregistrés localement"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 focus-within:border-amber-400/40 transition-all flex-1 sm:w-64">
                  <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <input
                    type="text"
                    value={pickemSearchQuery}
                    onChange={(e) => setPickemSearchQuery(e.target.value)}
                    placeholder={isEn ? "Filter your picks..." : "Filtrer vos pronostics..."}
                    className="w-full bg-transparent text-xs font-medium text-white outline-none placeholder:text-neutral-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto os-scroll pt-2 border-t border-white/[0.06]">
              {[
                { id: "all", label: isEn ? "All" : "Tous", count: allPredictionsList.length },
                { id: "pending", label: isEn ? "Pending" : "En cours", count: pickEmStats.pendingCount },
                { id: "won", label: isEn ? "Won" : "Gagnés", count: pickEmStats.correct },
                { id: "missed", label: isEn ? "Missed" : "Manqués", count: pickEmStats.missedCount },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPickemFilter(f.id as PickemStatusFilter)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-mono transition-all cursor-pointer shrink-0",
                    pickemFilter === f.id
                      ? "bg-amber-400 text-black font-bold shadow-xs"
                      : "bg-white/[0.04] text-neutral-300 hover:text-white"
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredPredictionsList.length > 0 ? (
              filteredPredictionsList.map(({ pred, match, isCompleted, isLocked, isPredCorrect, isScoreExact, team1, team2 }, idx) => {
                return (
                  <motion.div
                    key={pred.matchId || idx}
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(idx * 0.03, 0.2), ease: EASE_OUT }}
                    className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-white font-bold truncate">
                          {match?.tournament || (isEn ? "VCT Competition" : "Compétition VCT")}
                        </span>
                        {match?.event && (
                          <>
                            <span className="text-neutral-600 font-mono">/</span>
                            <span className="font-mono text-[11px] text-neutral-400 truncate">{match.event}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isCompleted ? (
                          <span className="rounded bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-neutral-400">
                            {match?.ago || (isEn ? "Finished" : "Terminé")}
                          </span>
                        ) : (
                          <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 font-mono text-[10px] font-bold">
                            {match?.in || (isEn ? "Upcoming" : "À venir")}
                          </span>
                        )}
                        {!isLocked && (
                          <button
                            type="button"
                            onClick={() => deletePrediction(pred.matchId)}
                            className="rounded border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[11px] text-neutral-400 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
                          >
                            {isEn ? "Cancel pick" : "Annuler"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-neutral-400 font-mono">{isEn ? "Winner pick:" : "Vainqueur choisi :"}</span>
                        <span className="rounded-md bg-amber-400 text-black px-2.5 py-0.5 text-xs font-mono font-bold">
                          {pred.winner}
                        </span>
                        {pred.score && (
                          <span className="rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 font-mono text-xs text-white">
                            {isEn ? `Exact: ${pred.score}` : `Exact : ${pred.score}`}
                          </span>
                        )}
                      </div>

                      {isCompleted ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-neutral-400 font-mono">
                            {isEn ? `Final: ${team1?.score ?? "0"} - ${team2?.score ?? "0"}` : `Final : ${team1?.score ?? "0"} - ${team2?.score ?? "0"}`}
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
                                {isScoreExact
                                  ? (isEn ? "+15 pts (Exact score)" : "+15 pts (Score exact)")
                                  : (isEn ? "+10 pts (Winner)" : "+10 pts (Vainqueur)")}
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                {isEn ? "0 pt (Missed)" : "0 pt (Manqué)"}
                              </>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-mono">
                          <Clock className="h-3.5 w-3.5" />
                          {isEn ? "Pending match completion" : "En attente du résultat"}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center space-y-2">
                <Trophy className="h-7 w-7 text-neutral-500 mx-auto mb-1" />
                <p className="text-sm font-mono font-bold text-white uppercase">
                  {isEn ? "No predictions matching this view" : "Aucun pronostic dans cette catégorie"}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("matches");
                    setMatchStatusFilter("upcoming");
                  }}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-rose-500 transition-all cursor-pointer mt-2"
                >
                  {isEn ? "Make Predictions Now →" : "Faire des pronostics maintenant →"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {isEn ? "Predictor Profile" : "Profil Pronostiqueur"}
                </span>
                <Award className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <span className={cn("inline-block rounded-md border px-2.5 py-1 font-mono text-xs font-bold", rankTier.badge)}>
                  {rankTier.title}
                </span>
                <p className="text-2xl font-mono font-bold text-white mt-2 tabular-nums">
                  {pickEmStats.scoreTotal} <span className="text-xs font-normal text-neutral-400">PTS</span>
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
                  <span>{isEn ? "Progress to next rank" : "Progression rang"}</span>
                  <span>{rankTier.next} pts</span>
                </div>
                <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round(((pickEmStats.scoreTotal - rankTier.min) / Math.max(1, rankTier.next - rankTier.min)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {isEn ? "Win Streaks" : "Séries de Réussite"}
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3">
                  <span className="text-[10px] font-mono text-neutral-400 block">{isEn ? "Active Streak" : "Série active"}</span>
                  <p className="text-xl font-mono font-bold text-emerald-400 mt-1 tabular-nums">
                    {pickEmStats.currentStreak} 🔥
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3">
                  <span className="text-[10px] font-mono text-neutral-400 block">{isEn ? "Best Streak" : "Record série"}</span>
                  <p className="text-xl font-mono font-bold text-amber-300 mt-1 tabular-nums">
                    {pickEmStats.bestStreak} 🏆
                  </p>
                </div>
              </div>
              <p className="text-[11px] font-mono text-neutral-500">
                {isEn ? "Calculated on consecutively evaluated official matches" : "Calculé sur les matchs officiels évalués consécutivement"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  {isEn ? "Exact Score Conversion" : "Précision Score Exact"}
                </span>
                <Target className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                  {pickEmStats.exactScores}{" "}
                  <span className="text-xs font-normal text-neutral-400">
                    / {pickEmStats.correct} {isEn ? "correct picks" : "bons pronos"}
                  </span>
                </p>
                <p className="text-[11px] font-mono text-neutral-400 mt-1">
                  {pickEmStats.correct > 0
                    ? `${Math.round((pickEmStats.exactScores / pickEmStats.correct) * 100)}% ${isEn ? "of wins had exact score bonus" : "des victoires ont eu le bonus exact"}`
                    : isEn ? "No evaluated wins yet" : "Aucun prono gagné pour le moment"}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-black/40 p-2.5 text-[10px] font-mono text-neutral-400">
                {isEn ? "Win bonus: +10 pts • Exact score: +5 pts bonus" : "Victoire : +10 pts • Score exact : +5 pts bonus"}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#10131B]/95 p-4 sm:p-5 backdrop-blur-xl shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wide">
                  {isEn ? "Performance Breakdown by Competition Circuit" : "Analyse de Précision par Circuit Compétitif"}
                </h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {pickEmStats.evaluated} {isEn ? "total evaluated matches" : "matchs officiels évalués"}
              </span>
            </div>

            <div className="space-y-3">
              {[
                { key: "champions" as VctTier, label: "VALORANT Champions", color: "bg-amber-400", border: "border-amber-400/40" },
                { key: "masters" as VctTier, label: "Masters & Premier Events", color: "bg-purple-500", border: "border-purple-500/40" },
                { key: "international" as VctTier, label: "VCT Leagues (Americas, EMEA, Pacific, China)", color: "bg-rose-500", border: "border-rose-500/40" },
                { key: "challengers" as VctTier, label: "Challengers & Regional Ascension", color: "bg-cyan-500", border: "border-cyan-500/40" },
                { key: "game_changers" as VctTier, label: "Game Changers Championship", color: "bg-fuchsia-500", border: "border-fuchsia-500/40" },
              ].map((tier) => {
                const data = pickEmStats.tierBreakdown[tier.key];
                const pct = data.evaluated > 0 ? Math.round((data.correct / data.evaluated) * 100) : null;

                return (
                  <div key={tier.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-white font-medium">{tier.label}</span>
                      <span className="text-neutral-400 tabular-nums">
                        {pct !== null ? `${pct}% (${data.correct}/${data.evaluated})` : isEn ? "No matches yet" : "Aucun match évalué"}
                      </span>
                    </div>
                    <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-300", tier.color)}
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-black/40 p-3.5 text-xs font-mono text-neutral-400 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
              <p>
                {isEn
                  ? "Leaderboard tracking uses official VLR.gg match data and your verified local predictions. Pending matches are strictly excluded from accuracy calculation to preserve analytical integrity."
                  : "Le suivi de performance utilise les données officielles de VLR.gg et vos pronostics vérifiés. Les matchs en attente sont strictement exclus du calcul de précision afin de garantir une intégrité analytique totale."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
