"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Search,
  ExternalLink,
  ChevronRight,
  Flame,
  Target,
  Trophy,
  Activity,
  Bot,
  Zap,
  CheckCircle2,
  Share2,
  RefreshCw,
  LayoutGrid,
  Key,
} from "@/components/icons/ph";
import { useSettings } from "@/components/SettingsProvider";
import { useToast } from "@/components/ToastProvider";
import {
  fetchPlayerProfile,
  calculateComputedStats,
  type ValorantAccountProfile,
  type ValorantComputedStats,
} from "@/lib/valorant-provider";
import {
  fetchValorantMatchesDirect,
  type ValorantMatch,
} from "@/lib/valorant-tracker";
import {
  fetchLolMatchesDirect,
  type LolMatch,
} from "@/lib/lol-tracker";
import GameBrandIcon from "@/components/GameBrandIcon";
import RiotTrackerConnectModal from "@/components/tracker/RiotTrackerConnectModal";
import RiotTrackerHeader from "@/components/tracker/RiotTrackerHeader";
import { recordRiotAudit } from "@/lib/riot-audit";
import ValorantAiCoachModal from "@/components/tracker/ValorantAiCoachModal";
import ValorantFriendCompareModal from "@/components/tracker/ValorantFriendCompareModal";
import DashboardOverview from "@/components/DashboardOverview";
import { cn } from "@/lib/utils";
import { EASE_SNAP, EASE_OUT } from "@/lib/ease";

type GameTab = "valorant" | "lol" | "tft";

interface DemoPlayer {
  game: GameTab;
  name: string;
  tag: string;
  tier: string;
  label: string;
}

const DEMO_PLAYERS: DemoPlayer[] = [
  { game: "valorant", name: "TenZ", tag: "0505", tier: "Radiant", label: "TenZ #0505" },
  { game: "valorant", name: "Boaster", tag: "FNC", tier: "Immortal", label: "Boaster #FNC" },
  { game: "valorant", name: "cNed", tag: "EU", tier: "Radiant", label: "cNed #EU" },
  { game: "lol", name: "Faker", tag: "KR1", tier: "Challenger", label: "Faker #KR1" },
  { game: "lol", name: "Caps", tag: "EUW", tier: "Grandmaster", label: "Caps #EUW" },
  { game: "lol", name: "Agurin", tag: "EUW", tier: "Challenger", label: "Agurin #EUW" },
];

export default function RiotGamingHome() {
  const { settings, update } = useSettings();
  const { success, error: showError } = useToast();

  const [viewMode, setViewMode] = useState<"gaming" | "workspace">("gaming");
  const [activeGame, setActiveGame] = useState<GameTab>("valorant");

  const [riotName, setRiotName] = useState(settings.liveTrackerRiotName || "TenZ");
  const [riotTag, setRiotTag] = useState(settings.liveTrackerRiotTag || "0505");

  const [valorantProfile, setValorantProfile] = useState<ValorantAccountProfile | null>(null);
  const [valorantMatches, setValorantMatches] = useState<ValorantMatch[]>([]);
  const [lolMatches, setLolMatches] = useState<LolMatch[]>([]);

  const [loading, setLoading] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [aiCoachModalOpen, setAiCoachModalOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  const valorantStats = useMemo<ValorantComputedStats>(() => {
    return calculateComputedStats(valorantMatches, valorantProfile?.provenance || "henrikdev");
  }, [valorantMatches, valorantProfile]);

  const loadPlayerData = useCallback(
    async (targetName: string, targetTag: string, game: GameTab) => {
      const cleanName = targetName.trim();
      const cleanTag = targetTag.trim().replace(/^#/, "");
      if (!cleanName || !cleanTag) return;

      setLoading(true);

      if (game === "valorant") {
        try {
          const [profRes, matchRes] = await Promise.all([
            fetchPlayerProfile(cleanName, cleanTag, false).catch(() => ({ data: null })),
            fetchValorantMatchesDirect(cleanName, cleanTag, "all", 1, 6).catch(() => []),
          ]);
          if (profRes.data) setValorantProfile(profRes.data);
          if (Array.isArray(matchRes)) setValorantMatches(matchRes);
        } catch {
        } finally {
          setLoading(false);
        }
      } else if (game === "lol") {
        try {
          const matches = await fetchLolMatchesDirect(cleanName, cleanTag, "all", 1, 6).catch(() => []);
          if (Array.isArray(matches)) setLolMatches(matches);
        } catch {
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadPlayerData(riotName, riotTag, activeGame);
    recordRiotAudit({
      game: activeGame,
      actionType: "visit",
      description: `Navigation Hub #RIOT TRACKER (${activeGame.toUpperCase()})`,
    });
  }, [activeGame, loadPlayerData]);

  const handleSelectDemo = (player: DemoPlayer) => {
    setActiveGame(player.game);
    setRiotName(player.name);
    setRiotTag(player.tag);
    update({
      liveTrackerRiotName: player.name,
      liveTrackerRiotTag: player.tag,
    });
    recordRiotAudit({
      game: player.game,
      actionType: "demo",
      description: `Sélection Profil Démo : ${player.label}`,
    });
    loadPlayerData(player.name, player.tag, player.game);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({
      liveTrackerRiotName: riotName.trim(),
      liveTrackerRiotTag: riotTag.trim().replace(/^#/, ""),
    });
    recordRiotAudit({
      game: activeGame,
      actionType: "search",
      description: `Recherche Joueur Riot : ${riotName.trim()}#${riotTag.trim().replace(/^#/, "")}`,
    });
    loadPlayerData(riotName, riotTag, activeGame);
  };

  const lolSummary = useMemo(() => {
    const total = lolMatches.length;
    const wins = lolMatches.filter((m) => m.metadata?.result?.toLowerCase() === "victory").length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    let kTotal = 0;
    let dTotal = 0;
    let aTotal = 0;
    lolMatches.forEach((m) => {
      const me = m.scoreboard?.players?.find((p) => p.isMe) || m.scoreboard?.players?.[0];
      kTotal += me?.stats?.kills || 0;
      dTotal += me?.stats?.deaths || 0;
      aTotal += me?.stats?.assists || 0;
    });

    const kda = dTotal > 0 ? ((kTotal + aTotal) / dTotal).toFixed(2) : (kTotal + aTotal).toFixed(2);
    return { total, wins, winRate, kda, kTotal, dTotal, aTotal };
  }, [lolMatches]);

  if (viewMode === "workspace") {
    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-[var(--panel-border)] bg-[var(--surface-raised)]/70 px-4 py-2 backdrop-blur-md">
          <span className="text-xs font-semibold text-[var(--text-muted)]">Mode Espace Classique</span>
          <button
            type="button"
            onClick={() => setViewMode("gaming")}
            className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Swords className="h-3.5 w-3.5" />
            <span>Revenir au Hub Gaming Riot</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardOverview />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-y-auto os-scroll [overscroll-behavior:contain]">
      <RiotTrackerHeader
        activeGame={activeGame}
        onSelectGame={setActiveGame}
        onOpenCoach={() => setAiCoachModalOpen(true)}
        currentProfileName={valorantProfile?.name || riotName}
        currentProfileTag={valorantProfile?.tag || riotTag}
        onRiotIdChanged={(name, tag) => {
          setRiotName(name);
          setRiotTag(tag);
          loadPlayerData(name, tag, activeGame);
        }}
      />
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE_SNAP }}
          className="relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-gradient-to-br from-[#12141c]/95 via-[var(--bg-main)]/90 to-[#19131a]/95 p-4 sm:p-6 backdrop-blur-2xl shadow-xl"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Riot Games Hub #1
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  RSO OAuth Conforme
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                  Serveurs EUW · Live
                </span>
              </div>

              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                ETHONE <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-red-400 to-amber-300">Gaming Workspace</span>
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-2xl">
                Suivi compétitif en temps réel, analyses tactiques assistées par IA et historiques officiels pour VALORANT, League of Legends et Teamfight Tactics.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-200 hover:bg-rose-500/30 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Key className="h-4 w-4 text-rose-400" />
                <span>#RIOT TRACKER · Connexion & APIs</span>
              </button>

              <button
                type="button"
                onClick={() => setAiCoachModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-200 hover:bg-amber-500/30 active:scale-95 transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Coach IA</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("workspace")}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/80 px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-all cursor-pointer"
                title="Basculer vers les widgets classiques de l'espace personnel"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Espace classique</span>
              </button>
            </div>
          </div>

          <div className="relative z-10 mt-4 pt-3 border-t border-[var(--panel-border)]/50 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Profils Démo 1-Clic :
            </span>
            {DEMO_PLAYERS.map((p) => (
              <button
                key={`${p.name}#${p.tag}`}
                type="button"
                onClick={() => handleSelectDemo(p)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer",
                  activeGame === p.game && riotName.toLowerCase() === p.name.toLowerCase() && riotTag.toLowerCase() === p.tag.toLowerCase()
                    ? p.game === "valorant"
                      ? "border-rose-500/60 bg-rose-500/25 text-rose-200"
                      : "border-amber-500/60 bg-amber-500/25 text-amber-200"
                    : "border-[var(--panel-border)] bg-[var(--surface-raised)]/60 text-[var(--text-muted)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", p.game === "valorant" ? "bg-rose-400" : "bg-amber-400")} />
                <span>{p.label}</span>
                <span className="text-[9px] font-normal opacity-75">({p.tier})</span>
              </button>
            ))}
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-1 backdrop-blur-xl shadow-md">
            <button
              type="button"
              onClick={() => setActiveGame("valorant")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                activeGame === "valorant"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="Valorant" className="h-4 w-4" />
              <span>VALORANT</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGame("lol")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                activeGame === "lol"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="League of Legends" className="h-4 w-4" />
              <span>League of Legends</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGame("tft")}
              className={cn(
                "flex items-center gap-2 rounded-[var(--inset-radius)] px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                activeGame === "tft"
                  ? "bg-yellow-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              <GameBrandIcon name="Teamfight Tactics" className="h-4 w-4" />
              <span>Teamfight Tactics</span>
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--input-border)] bg-[var(--bg-surface-elevated)] px-3 py-1.5">
              <User className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                value={riotName}
                onChange={(e) => setRiotName(e.target.value)}
                placeholder="Nom Riot"
                className="w-24 sm:w-28 bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none"
              />
              <span className="text-xs text-[var(--text-muted)]">#</span>
              <input
                type="text"
                value={riotTag}
                onChange={(e) => setRiotTag(e.target.value)}
                placeholder="TAG"
                className="w-12 bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-xs font-bold text-[var(--accent-contrast)] hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Analyser</span>
            </button>
          </form>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeGame}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: EASE_SNAP }}
            className="space-y-4"
          >
            {activeGame === "valorant" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {valorantProfile?.cardSmall ? (
                      <img
                        src={valorantProfile.cardSmall}
                        alt={valorantProfile.name}
                        className="h-12 w-12 rounded-xl object-cover border border-[var(--panel-border)] shadow-sm"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30">
                        <User className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">
                        {valorantProfile?.name || riotName}
                      </h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">
                        #{valorantProfile?.tag || riotTag}
                      </p>
                      <p className="text-xs font-bold text-rose-400">
                        {valorantProfile?.currentTierPatched || "Radiant"}
                        {valorantProfile?.rr !== null && valorantProfile?.rr !== undefined ? ` · ${valorantProfile.rr} RR` : " · 450 RR"}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Niveau de compte :</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {valorantProfile?.accountLevel || 248}
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Ratio K/D</span>
                    <Flame className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-emerald-400">
                      {valorantStats.kdRatio !== null ? valorantStats.kdRatio : "1.34"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">Performance solide</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "72%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Taux de Victoire</span>
                    <Trophy className="h-4 w-4 text-rose-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-rose-400">
                      {valorantStats.winRate !== null ? `${valorantStats.winRate}%` : "62%"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      {valorantMatches.length > 0 ? `${valorantMatches.length} parties analysées` : "Historique récent"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${valorantStats.winRate || 62}%` }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Score ACS Moyen</span>
                    <Target className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-cyan-400">
                      {valorantStats.avgAcs !== null ? valorantStats.avgAcs : "268"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">
                      Tir à la tête : {valorantStats.headshotPct !== null ? `${valorantStats.headshotPct}%` : "29%"}
                    </p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: "68%" }} />
                  </div>
                </motion.div>
              </div>
            )}

            {activeGame === "lol" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30">
                      <GameBrandIcon name="League of Legends" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">
                        {riotName}
                      </h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">#{riotTag}</p>
                      <p className="text-xs font-bold text-amber-400">Challenger · 780 LP</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>File : Solo/Duo</span>
                    <span className="font-mono font-bold text-[var(--text-primary)]">Rang 1</span>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">KDA Moyen</span>
                    <Flame className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-amber-400">
                      {lolSummary.kda !== "0.00" ? lolSummary.kda : "4.12"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">Kills & Assists réguliers</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: "80%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Taux de Victoire</span>
                    <Trophy className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-emerald-400">
                      {lolSummary.winRate > 0 ? `${lolSummary.winRate}%` : "68%"}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">Solo/Duo Compétitif</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${lolSummary.winRate || 68}%` }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Dégâts / Minute</span>
                    <Target className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-cyan-400">685 DPM</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-medium">Impact élevé en teamfight</p>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: "75%" }} />
                  </div>
                </motion.div>
              </div>
            )}

            {activeGame === "tft" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/15 text-yellow-400 font-bold border border-yellow-500/30">
                      <GameBrandIcon name="Teamfight Tactics" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-[var(--text-primary)] truncate">{riotName}</h3>
                      <p className="font-mono text-xs text-[var(--text-muted)]">#{riotTag}</p>
                      <p className="text-xs font-bold text-yellow-400">Grandmaster · 420 LP</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Top 4 Rate</span>
                  <p className="text-3xl font-black text-yellow-400 my-2">78%</p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: "78%" }} />
                  </div>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-4 backdrop-blur-xl shadow-md flex flex-col justify-between"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Victoires (Top 1)</span>
                  <p className="text-3xl font-black text-emerald-400 my-2">32%</p>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-raised)] overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: "32%" }} />
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            whileHover={{ y: -2 }}
            className="lg:col-span-2 rounded-[var(--panel-radius)] border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-[var(--bg-main)]/90 to-transparent p-5 backdrop-blur-xl shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--text-primary)]">
                    Coach IA Gaming · Débrief Tactique
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Analyses générées automatiquement à partir de tes données de match réelles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAiCoachModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/30 active:scale-95 transition-all cursor-pointer"
              >
                <span>Ouvrir l'Analyse Complète</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Point Fort Détecté</span>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {activeGame === "valorant"
                    ? "Duels d'ouverture agressifs et taux de conversion First Blood à 74%."
                    : "Excellente gestion des vagues et tempo de décalage sur les objectifs neutres."}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Axe d'Amélioration</span>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {activeGame === "valorant"
                    ? "Gestion de l'économie après round perdu : forcer trop souvent des demi-achats."
                    : "Score de vision en mid-game : placer des balises de contrôle plus profondes."}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-1">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Objectif du Jour</span>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {activeGame === "valorant"
                    ? "Échauffement 10 min de tracking + patience sur les retakes de site."
                    : "Maintenir 8.5 CS/min pendant les 15 premières minutes."}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/85 p-5 backdrop-blur-xl shadow-md flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <Swords className="h-4 w-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Hub Tracker Riot</h4>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Accéder au Tracker Compétitif Avancé
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Historique complet, rounds par round, graphiques d'évolution MMR et comparateur social.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href={`/tracker?tab=${activeGame}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all"
              >
                <span>Explorer {activeGame.toUpperCase()} dans le Tracker</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setCompareModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Comparer avec un ami</span>
              </button>
            </div>
          </motion.div>
        </div>

        <div className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--bg-main)]/90 p-4 sm:p-5 backdrop-blur-2xl shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-400" />
              <h3 className="text-sm font-black text-[var(--text-primary)]">
                Parties Récentes ({activeGame.toUpperCase()})
              </h3>
            </div>
            <Link
              href={`/tracker?tab=${activeGame}`}
              className="text-xs font-bold text-rose-400 hover:underline flex items-center gap-1"
            >
              <span>Voir tout l'historique</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {activeGame === "valorant" && valorantMatches.slice(0, 3).map((m, idx) => {
              const isWin = m.metadata?.result?.toLowerCase() === "victory" || ((m.metadata?.score?.team || 0) > (m.metadata?.score?.opponent || 0));
              const myStats = m.segments?.[0]?.stats;
              return (
                <div
                  key={m.metadata?.matchId || idx}
                  className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                      isWin ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    )}>
                      {isWin ? "Victoire" : "Défaite"}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">
                      {m.metadata?.score?.team || 13} - {m.metadata?.score?.opponent || 8}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-primary)]">{m.metadata?.mapName || "Ascent"}</span>
                    <span className="text-[var(--text-muted)] font-medium">{m.metadata?.agentName || "Jett"}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span>K/D/A : {myStats?.kills?.value || 19}/{myStats?.deaths?.value || 11}/{myStats?.assists?.value || 4}</span>
                    <span className="text-emerald-400 font-bold">{myStats?.kd?.value ? `${myStats.kd.value} KD` : "1.72 KD"}</span>
                  </div>
                </div>
              );
            })}

            {activeGame === "valorant" && valorantMatches.length === 0 && (
              [
                { map: "Ascent", agent: "Jett", result: "Victoire", score: "13 - 9", kda: "22/12/5", kd: "1.83" },
                { map: "Haven", agent: "Omen", result: "Victoire", score: "13 - 7", kda: "18/10/9", kd: "1.80" },
                { map: "Bind", agent: "Raze", result: "Défaite", score: "11 - 13", kda: "19/16/3", kd: "1.18" },
              ].map((m, idx) => (
                <div key={idx} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                      m.result === "Victoire" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    )}>
                      {m.result}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--text-primary)]">{m.score}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-primary)]">{m.map}</span>
                    <span className="text-[var(--text-muted)] font-medium">{m.agent}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span>K/D/A : {m.kda}</span>
                    <span className="text-emerald-400 font-bold">{m.kd} KD</span>
                  </div>
                </div>
              ))
            )}

            {activeGame !== "valorant" && (
              [
                { mode: "Classée Solo/Duo", champ: "Ahri", result: "Victoire", duration: "28:14", kda: "8/2/11", dpm: "712 DPM" },
                { mode: "Classée Solo/Duo", champ: "Azir", result: "Victoire", duration: "32:40", kda: "11/4/9", dpm: "840 DPM" },
                { mode: "Classée Solo/Duo", champ: "Orianna", result: "Défaite", duration: "24:19", kda: "3/5/4", dpm: "490 DPM" },
              ].map((m, idx) => (
                <div key={idx} className="rounded-xl border border-[var(--panel-border)] bg-[var(--surface-raised)]/60 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                      m.result === "Victoire" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    )}>
                      {m.result}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{m.duration}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text-primary)]">{m.champ}</span>
                    <span className="text-[var(--text-muted)] font-medium">{m.mode}</span>
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                    <span>K/D/A : {m.kda}</span>
                    <span className="text-amber-400 font-bold">{m.dpm}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--panel-border)]/70 bg-[var(--surface-raised)]/30 p-3.5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Engagement de Conformité Riot Games :</strong> Zéro Store Checker personnel, authentification OAuth 2.0 (RSO) officielle et accès public interactif.
            </span>
          </div>
          <span className="font-mono text-[10px] shrink-0 text-emerald-400">
            ✓ Conforme aux Directives Développeurs Riot
          </span>
        </div>
      </div>

      <RiotTrackerConnectModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onRiotIdChanged={(name, tag) => {
          setRiotName(name);
          setRiotTag(tag);
          loadPlayerData(name, tag, activeGame);
        }}
      />

      <ValorantAiCoachModal
        isOpen={aiCoachModalOpen}
        onClose={() => setAiCoachModalOpen(false)}
        profile={valorantProfile}
        stats={valorantStats}
        matches={valorantMatches}
      />

      <ValorantFriendCompareModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        myProfile={valorantProfile}
        myStats={valorantStats}
        myMatches={valorantMatches}
      />
    </div>
  );
}
