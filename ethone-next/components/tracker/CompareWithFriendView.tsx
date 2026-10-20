"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Swords,
  User,
  Users,
  Target,
  Trophy,
  Zap,
  Copy,
  Check,
  RotateCcw,
  RefreshCw,
  Award,
  Percent,
  Flame,
  Share2,
} from "@/components/icons/ph";
import {
  fetchPlayerProfile,
  calculateComputedStats,
  calculateAgentStats,
  type ValorantAccountProfile,
  type ValorantComputedStats,
} from "@/lib/valorant-provider";
import { fetchWorker } from "@/lib/api";
import { fetchValorantMatchesDirect, type ValorantMatch } from "@/lib/valorant-tracker";
import { useToast } from "@/components/ToastProvider";
import { useSettings } from "@/components/SettingsProvider";
import PlayerCardExportModal from "@/components/tracker/PlayerCardExportModal";
import ValorantWeaponStatsCard from "@/components/tracker/ValorantWeaponStatsCard";
import { cn } from "@/lib/utils";

export interface CompareWithFriendViewProps {
  myProfile?: ValorantAccountProfile | null;
  myStats?: ValorantComputedStats | null;
  myMatches?: ValorantMatch[];
  myRiotName?: string;
  myRiotTag?: string;
  isEn?: boolean;
}

interface StoredFriend {
  name: string;
  tag: string;
  tier?: string;
  avatar?: string;
}

function getAgentRole(agentName?: string | null, isEn: boolean = false): string {
  if (!agentName) return "Agent";
  const n = agentName.toLowerCase();
  if (["jett", "reyna", "raze", "phoenix", "yoru", "neon", "iso"].includes(n)) return isEn ? "Duelist" : "Duelliste";
  if (["sova", "fade", "breach", "skye", "kay/o", "kayo", "gekko"].includes(n)) return isEn ? "Initiator" : "Initiateur";
  if (["omen", "brimstone", "viper", "astra", "clove", "harbor"].includes(n)) return isEn ? "Controller" : "Contrôleur";
  if (["killjoy", "cypher", "sage", "chamber", "deadlock", "vyse"].includes(n)) return isEn ? "Sentinel" : "Sentinelle";
  return "Agent";
}

function computeTelemetry(matches?: ValorantMatch[] | null, stats?: ValorantComputedStats | null) {
  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    const hs = stats?.headshotPercentage ? Math.round(Number(stats.headshotPercentage)) : 0;
    const bs = hs > 0 ? Math.max(0, 100 - hs - 10) : 0;
    const ls = hs > 0 ? Math.max(0, 100 - hs - bs) : 0;
    return {
      totalKills: 0,
      totalDeaths: 0,
      totalShots: 0,
      hsPct: hs,
      bsPct: bs,
      lsPct: ls,
      duelWinrate: 0,
      adr: stats?.adr ? Math.round(Number(stats.adr)) : 0,
      acs: stats?.averageScore ? Math.round(Number(stats.averageScore)) : 0,
    };
  }

  let totalKills = 0;
  let totalDeaths = 0;
  let totalHeadshots = 0;
  let totalBodyshots = 0;
  let totalLegshots = 0;
  let totalDamage = 0;
  let totalRounds = 0;
  let totalScore = 0;
  let scoreMatches = 0;

  matches.forEach((m) => {
    if (!m) return;
    const me = m.scoreboard?.players?.find((p) => p?.isMe) || m.scoreboard?.players?.[0];
    const seg = m.segments?.[0]?.stats;
    const k = me?.stats?.kills ?? seg?.kills?.value ?? 0;
    const d = me?.stats?.deaths ?? seg?.deaths?.value ?? 0;
    totalKills += k;
    totalDeaths += d;

    const hs = me?.stats?.headshots ?? 0;
    const bs = me?.stats?.bodyshots ?? 0;
    const ls = me?.stats?.legshots ?? 0;
    if (hs + bs + ls > 0) {
      totalHeadshots += hs;
      totalBodyshots += bs;
      totalLegshots += ls;
    }

    const rounds =
      m.metadata?.score?.roundsPlayed ||
      (m.metadata?.score?.team ?? 0) + (m.metadata?.score?.opponent ?? 0) ||
      0;
    const dmg = me?.stats?.damageMade ?? 0;
    if (dmg > 0 && rounds > 0) {
      totalDamage += dmg;
      totalRounds += rounds;
    }

    const s = me?.stats?.score ?? seg?.performanceScore?.value ?? 0;
    if (s > 0) {
      totalScore += s;
      scoreMatches += 1;
    }
  });

  const totalShots = totalHeadshots + totalBodyshots + totalLegshots;
  let hsPct = 0;
  let bsPct = 0;
  let lsPct = 0;

  if (totalShots > 0) {
    hsPct = Math.round((totalHeadshots / totalShots) * 100);
    bsPct = Math.round((totalBodyshots / totalShots) * 100);
    lsPct = Math.max(0, 100 - hsPct - bsPct);
  } else if (stats?.headshotPercentage) {
    hsPct = Math.min(100, Math.max(0, Math.round(Number(stats.headshotPercentage))));
    bsPct = Math.max(0, 100 - hsPct - 10);
    lsPct = Math.max(0, 100 - hsPct - bsPct);
  }

  const duelWinrate =
    totalKills + totalDeaths > 0
      ? Math.round((totalKills / (totalKills + totalDeaths)) * 100)
      : 0;

  const adr =
    totalRounds > 0
      ? Math.round(totalDamage / totalRounds)
      : stats?.adr
      ? Math.round(Number(stats.adr))
      : 0;

  const acs =
    scoreMatches > 0
      ? Math.round(totalScore / scoreMatches)
      : stats?.averageScore
      ? Math.round(Number(stats.averageScore))
      : 0;

  return {
    totalKills,
    totalDeaths,
    totalShots,
    hsPct,
    bsPct,
    lsPct,
    duelWinrate,
    adr,
    acs,
  };
}

export default function CompareWithFriendView({
  myProfile: initialProfile,
  myStats: initialStats,
  myMatches: initialMatches = [],
  myRiotName = "",
  myRiotTag = "",
  isEn: propIsEn,
}: CompareWithFriendViewProps) {
  const { success, error: showError } = useToast();
  const isEn =
    typeof propIsEn === "boolean"
      ? propIsEn
      : typeof window !== "undefined"
      ? (localStorage.getItem("ethone:tracker:language") ?? "en") !== "fr"
      : true;

  const { settings } = useSettings();

  const [p1Profile, setP1Profile] = useState<ValorantAccountProfile | null>(initialProfile || null);
  const [p1Stats, setP1Stats] = useState<ValorantComputedStats | null>(initialStats || null);
  const [p1Matches, setP1Matches] = useState<ValorantMatch[]>(initialMatches || []);
  const [p1InputName, setP1InputName] = useState(() => {
    return myRiotName || settings?.liveTrackerRiotName || (typeof window !== "undefined" ? localStorage.getItem("ethone:tracker:riotName") || "" : "");
  });
  const [p1InputTag, setP1InputTag] = useState(() => {
    return myRiotTag || settings?.liveTrackerRiotTag || (typeof window !== "undefined" ? localStorage.getItem("ethone:tracker:riotTag") || "" : "");
  });
  const [p1Loading, setP1Loading] = useState(false);
  const [p1Editing, setP1Editing] = useState(false);

  const [p2InputName, setP2InputName] = useState("");
  const [p2InputTag, setP2InputTag] = useState("");
  const [p2Profile, setP2Profile] = useState<ValorantAccountProfile | null>(null);
  const [p2Stats, setP2Stats] = useState<ValorantComputedStats | null>(null);
  const [p2Matches, setP2Matches] = useState<ValorantMatch[]>([]);
  const [p2Loading, setP2Loading] = useState(false);

  const hasPlayer1 = Boolean(p1Profile || (p1Matches && p1Matches.length > 0));
  const hasPlayer2 = Boolean(p2Profile || (p2Matches && p2Matches.length > 0));
  const hasBothPlayers = hasPlayer1 && hasPlayer2;

  const [playerCardExportOpen, setPlayerCardExportOpen] = useState(false);
  const [playerCardTarget, setPlayerCardTarget] = useState<1 | 2>(1);

  const [recentFriends, setRecentFriends] = useState<StoredFriend[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("ethone:tracker:recent_compares");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    if (initialProfile) setP1Profile(initialProfile);
    if (initialStats) setP1Stats(initialStats);
    if (initialMatches && initialMatches.length > 0) setP1Matches(initialMatches);
  }, [initialProfile, initialStats, initialMatches]);

  const p1Telemetry = useMemo(() => computeTelemetry(p1Matches, p1Stats), [p1Matches, p1Stats]);
  const p2Telemetry = useMemo(() => computeTelemetry(p2Matches, p2Stats), [p2Matches, p2Stats]);

  const p1Agents = useMemo(() => calculateAgentStats(p1Matches).slice(0, 3), [p1Matches]);
  const p2Agents = useMemo(() => calculateAgentStats(p2Matches).slice(0, 3), [p2Matches]);

  const handleFetchPlayer1 = useCallback(
    async (name: string, tag: string) => {
      const cleanName = name.trim();
      const cleanTag = tag.trim().replace(/^#/, "");

      if (!cleanName || !cleanTag) {
        showError(
          isEn
            ? "Please provide Player 1's Riot name and tag"
            : "Veuillez renseigner le nom et le tag du joueur 1"
        );
        return;
      }

      setP1Loading(true);

      try {
        const [profRes, matchRes] = await Promise.all([
          fetchPlayerProfile(cleanName, cleanTag, true).catch(() => ({ data: null })),
          fetchWorker(
            `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
          )
            .then((res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
            .catch(async () => {
              const localKey =
                typeof window !== "undefined"
                  ? localStorage.getItem("ethone:cred:riot:henrikApiKey") ||
                    localStorage.getItem("ethone:cred:valorant:apiKey") ||
                    localStorage.getItem("HENRIK_API_KEY")
                  : null;
              if (localKey) {
                return fetchValorantMatchesDirect(cleanName, cleanTag, "all", localKey, 0).catch(
                  () => []
                );
              }
              return [];
            }),
        ]);

        if (profRes.data) {
          setP1Profile(profRes.data);
        } else {
          setP1Profile({
            name: cleanName,
            tag: cleanTag,
            puuid: null,
            accountLevel: null,
            cardSmall: null,
            cardLarge: null,
            currentTierPatched: isEn ? "Unranked" : "Non classé",
            tier: 0,
            rr: null,
            lastUpdated: new Date().toISOString(),
            provenance: "henrikdev",
          });
        }

        const validMatches = Array.isArray(matchRes) ? matchRes : [];
        setP1Matches(validMatches);
        const computed = calculateComputedStats(validMatches, "henrikdev");
        setP1Stats(computed);
        setP1Editing(false);
        success(isEn ? `Player 1 loaded: ${cleanName}#${cleanTag}` : `Joueur 1 chargé : ${cleanName}#${cleanTag}`);
      } catch (err: any) {
        showError(err?.message || (isEn ? "Failed to load Player 1" : "Échec du chargement du Joueur 1"));
      } finally {
        setP1Loading(false);
      }
    },
    [isEn, showError, success]
  );

  useEffect(() => {
    if (!initialProfile && !p1Profile && p1InputName && p1InputTag && !p1Loading) {
      handleFetchPlayer1(p1InputName, p1InputTag);
    }
  }, [initialProfile, p1Profile, p1InputName, p1InputTag, p1Loading, handleFetchPlayer1]);

  const handleFetchFriend = useCallback(
    async (name: string, tag: string) => {
      const cleanName = name.trim();
      const cleanTag = tag.trim().replace(/^#/, "");

      if (!cleanName || !cleanTag) {
        showError(
          isEn
            ? "Please provide your friend's Riot name and tag"
            : "Veuillez renseigner le nom et le tag de votre ami(e)"
        );
        return;
      }

      setP2Loading(true);

      try {
        const [profRes, matchRes] = await Promise.all([
          fetchPlayerProfile(cleanName, cleanTag, true).catch(() => ({ data: null })),
          fetchWorker(
            `/api/stats/valorant-matches?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
          )
            .then((res) => (Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []))
            .catch(async () => {
              const localKey =
                typeof window !== "undefined"
                  ? localStorage.getItem("ethone:cred:riot:henrikApiKey") ||
                    localStorage.getItem("ethone:cred:valorant:apiKey") ||
                    localStorage.getItem("HENRIK_API_KEY")
                  : null;
              if (localKey) {
                return fetchValorantMatchesDirect(cleanName, cleanTag, "all", localKey, 0).catch(
                  () => []
                );
              }
              return [];
            }),
        ]);

        if (profRes.data) {
          setP2Profile(profRes.data);
        } else {
          setP2Profile({
            name: cleanName,
            tag: cleanTag,
            puuid: null,
            accountLevel: null,
            cardSmall: null,
            cardLarge: null,
            currentTierPatched: isEn ? "Unranked" : "Non classé",
            tier: 0,
            rr: null,
            lastUpdated: new Date().toISOString(),
            provenance: "henrikdev",
          });
        }

        const validMatches = Array.isArray(matchRes) ? matchRes : [];
        setP2Matches(validMatches);
        const computed = calculateComputedStats(validMatches, "henrikdev");
        setP2Stats(computed);

        setRecentFriends((prev) => {
          const filtered = prev.filter(
            (f) =>
              !(
                f.name.toLowerCase() === cleanName.toLowerCase() &&
                f.tag.toLowerCase() === cleanTag.toLowerCase()
              )
          );
          const updated = [
            {
              name: cleanName,
              tag: cleanTag,
              tier: profRes.data?.currentTierPatched || "Unrated",
              avatar: profRes.data?.cardSmall || undefined,
            },
            ...filtered,
          ].slice(0, 6);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("ethone:tracker:recent_compares", JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });

        success(
          isEn
            ? `Comparison ready with ${cleanName}#${cleanTag}`
            : `Comparaison prête avec ${cleanName}#${cleanTag}`
        );
      } catch (err) {
        showError(
          err instanceof Error
            ? err.message
            : isEn
            ? "Failed to fetch friend data"
            : "Impossible de récupérer les données de l'ami"
        );
      } finally {
        setP2Loading(false);
      }
    },
    [isEn, showError, success]
  );

  const handleSwapPlayers = () => {
    if (!p2Profile && p2Matches.length === 0) return;
    const tempProfile = p1Profile;
    const tempStats = p1Stats;
    const tempMatches = p1Matches;

    setP1Profile(p2Profile);
    setP1Stats(p2Stats);
    setP1Matches(p2Matches);

    setP2Profile(tempProfile);
    setP2Stats(tempStats);
    setP2Matches(tempMatches);

    success(isEn ? "Players swapped" : "Joueurs inversés");
  };

  const duoSynergy = useMemo(() => {
    const p1Agent = p1Agents[0];
    const p2Agent = p2Agents[0];

    if (!p1Agent || !p2Agent) {
      return {
        available: false,
        score: null,
        title: isEn ? "Insufficient Match History" : "Données de Parties Insuffisantes",
        desc: isEn
          ? "Both players need recorded match telemetry to identify signature agents and determine duo synergy."
          : "Les deux joueurs doivent avoir des parties enregistrées pour identifier leurs agents signatures et calculer la synergie.",
        p1Role: p1Agent ? getAgentRole(p1Agent.agentName, isEn) : "—",
        p2Role: p2Agent ? getAgentRole(p2Agent.agentName, isEn) : "—",
        p1Main: p1Agent?.agentName || (isEn ? "Not enough matches" : "Parties insuffisantes"),
        p2Main: p2Agent?.agentName || (isEn ? "Not enough matches" : "Parties insuffisantes"),
      };
    }

    const p1Main = p1Agent.agentName;
    const p2Main = p2Agent.agentName;

    const p1Role = getAgentRole(p1Main, isEn);
    const p2Role = getAgentRole(p2Main, isEn);

    let score = 88;
    let title = isEn ? "High Tactical Chemistry" : "Excellente Alchimie Tactique";
    let desc = isEn
      ? "Both players balance tactical duties with positive map presence."
      : "Les deux joueurs se complètent bien sur les phases d'ouverture et d'ancrage.";

    if (
      (p1Role.includes("Duel") && p2Role.includes("Control")) ||
      (p1Role.includes("Control") && p2Role.includes("Duel"))
    ) {
      score = 96;
      title = isEn ? "Radiant Entry & Smoke Combo" : "Duo Royal : Entrée & Fumigènes";
      desc = isEn
        ? "Perfect synergy: the Controller covers site sightlines while the Duelist dashes in for first picks."
        : "Synergie parfaite : le Contrôleur sécurise les angles pendant que le Duelliste prend l'espace.";
    } else if (
      (p1Role.includes("Duel") && p2Role.includes("Init")) ||
      (p1Role.includes("Init") && p2Role.includes("Duel"))
    ) {
      score = 94;
      title = isEn ? "Flash & Frag Aggressive Synergy" : "Duo Agressif : Reconnaissance & Choc";
      desc = isEn
        ? "Devastating site takes: the Initiator gathers information and flashes while the Duelist capitalizes."
        : "Prise de site redoutable : l'Initiateur flashe et localise, le Duelliste convertit immédiatement.";
    } else if (
      (p1Role.includes("Control") && p2Role.includes("Sentin")) ||
      (p1Role.includes("Sentin") && p2Role.includes("Control"))
    ) {
      score = 92;
      title = isEn ? "Lockdown & Site Anchor Defense" : "Duo Verrouillage : Ancrage & Temporisation";
      desc = isEn
        ? "Unbreakable defense: utility slows attackers to a crawl, enabling easy team rotations."
        : "Défense impénétrable : les pièges et fumigènes bloquent l'ennemi et facilitent la rotation d'équipe.";
    } else if (p1Role === p2Role) {
      score = 78;
      title = isEn ? "Double Role Overlap" : "Double Rôle Identique";
      desc = isEn
        ? "Coordinated aggression, but watch out for lack of utility variety on retakes."
        : "Forte puissance sur ce rôle, mais attention au manque de diversité d'utilitaires sur les retakes.";
    }

    return { available: true, score, title, desc, p1Role, p2Role, p1Main, p2Main };
  }, [p1Agents, p2Agents, isEn]);

  const advantageSummary = useMemo(() => {
    if (!hasBothPlayers) {
      return { p1Points: 0, p2Points: 0, leader: 0, hasData: false };
    }

    const p1HasData = p1Matches.length > 0 || p1Stats?.kdRatio !== null;
    const p2HasData = p2Matches.length > 0 || p2Stats?.kdRatio !== null;

    if (!p1HasData || !p2HasData) {
      return { p1Points: 0, p2Points: 0, leader: 0, hasData: false };
    }

    let p1Points = 0;
    let p2Points = 0;

    const p1Wr = p1Stats?.winRate ?? 0;
    const p2Wr = p2Stats?.winRate ?? 0;
    if (p1Wr > p2Wr) p1Points++;
    else if (p2Wr > p1Wr) p2Points++;

    const p1Kd = Number(p1Stats?.kdRatio ?? 0);
    const p2Kd = Number(p2Stats?.kdRatio ?? 0);
    if (p1Kd > p2Kd) p1Points++;
    else if (p2Kd > p1Kd) p2Points++;

    if (p1Telemetry.hsPct > p2Telemetry.hsPct) p1Points++;
    else if (p2Telemetry.hsPct > p1Telemetry.hsPct) p2Points++;

    if (p1Telemetry.adr > p2Telemetry.adr) p1Points++;
    else if (p2Telemetry.adr > p1Telemetry.adr) p2Points++;

    const p1Tier = p1Profile?.tier ?? 0;
    const p2Tier = p2Profile?.tier ?? 0;
    if (p1Tier > p2Tier) p1Points++;
    else if (p2Tier > p1Tier) p2Points++;

    const leader =
      p1Points > p2Points ? 1 : p2Points > p1Points ? 2 : 0;

    return { p1Points, p2Points, leader, hasData: true };
  }, [hasBothPlayers, p1Matches.length, p2Matches.length, p1Stats, p2Stats, p1Telemetry, p2Telemetry, p1Profile, p2Profile]);

  const handleCopySummary = async () => {
    if (!hasBothPlayers) {
      showError(isEn ? "Load both players to export duel summary" : "Chargez les deux joueurs pour exporter le résumé du duel");
      return;
    }
    const p1Name = p1Profile?.name || p1InputName || (isEn ? "Player 1" : "Joueur 1");
    const p1Tag = p1Profile?.tag ? `#${p1Profile.tag}` : p1InputTag ? `#${p1InputTag}` : "";
    const p2Name = p2Profile?.name || p2InputName || (isEn ? "Player 2" : "Joueur 2");
    const p2Tag = p2Profile?.tag ? `#${p2Profile.tag}` : p2InputTag ? `#${p2InputTag}` : "";

    const text = isEn
      ? `⚔️ VALORANT HEAD-TO-HEAD DUEL on ETHONE TACTICAL:\n` +
        `👤 ${p1Name}${p1Tag} vs 👤 ${p2Name}${p2Tag}\n\n` +
        `• Rank: ${p1Profile?.currentTierPatched || "Unranked"} vs ${p2Profile?.currentTierPatched || "Unranked"}\n` +
        `• Win Rate: ${p1Stats?.winRate ?? "—"}% vs ${p2Stats?.winRate ?? "—"}%\n` +
        `• K/D Ratio: ${p1Stats?.kdRatio ?? "—"} vs ${p2Stats?.kdRatio ?? "—"}\n` +
        `• Headshot %: ${p1Telemetry.hsPct}% vs ${p2Telemetry.hsPct}%\n` +
        `• Damage/Round: ${p1Telemetry.adr} vs ${p2Telemetry.adr} ADR\n` +
        (duoSynergy.available ? `• Duo Synergy: ${duoSynergy.score}% (${duoSynergy.title})\n\n` : "\n") +
        `Analyzed on ETHONE Tactical · 100% Local Fair-Play Vanguard`
      : `⚔️ DUEL VALORANT FACE-À-FACE sur ETHONE TACTICAL :\n` +
        `👤 ${p1Name}${p1Tag} vs 👤 ${p2Name}${p2Tag}\n\n` +
        `• Rang : ${p1Profile?.currentTierPatched || "Non classé"} vs ${p2Profile?.currentTierPatched || "Non classé"}\n` +
        `• Victoires : ${p1Stats?.winRate ?? "—"}% vs ${p2Stats?.winRate ?? "—"}%\n` +
        `• Ratio K/D : ${p1Stats?.kdRatio ?? "—"} vs ${p2Stats?.kdRatio ?? "—"}\n` +
        `• Tirs Tête : ${p1Telemetry.hsPct}% vs ${p2Telemetry.hsPct}%\n` +
        `• Dégâts/Round : ${p1Telemetry.adr} vs ${p2Telemetry.adr} ADR\n` +
        (duoSynergy.available ? `• Synergie Duo : ${duoSynergy.score}% (${duoSynergy.title})\n\n` : "\n") +
        `Analysé sur ETHONE Tactical · 100% Local Fair-Play Vanguard`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      success(
        isEn
          ? "Duel summary copied to clipboard"
          : "Résumé du duel copié dans le presse-papier"
      );
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch {
      showError(
        isEn ? "Failed to copy to clipboard" : "Impossible de copier dans le presse-papier"
      );
    }
  };

  const metricRows = [
    {
      id: "rank",
      label: isEn ? "Competitive Rank" : "Rang Compétitif",
      icon: <Award className="h-4 w-4 text-amber-400" />,
      p1Display: p1Profile?.currentTierPatched || (isEn ? "Unranked" : "Non classé"),
      p2Display: p2Profile?.currentTierPatched || (isEn ? "Unranked" : "Non classé"),
      p1Val: p1Profile?.tier ?? 0,
      p2Val: p2Profile?.tier ?? 0,
      formatDiff: null,
    },
    {
      id: "wr",
      label: isEn ? "Match Win Rate" : "Taux de Victoire",
      icon: <Trophy className="h-4 w-4 text-emerald-400" />,
      p1Display: p1Stats?.winRate !== null && p1Stats?.winRate !== undefined ? `${p1Stats.winRate}%` : "—",
      p2Display: p2Stats?.winRate !== null && p2Stats?.winRate !== undefined ? `${p2Stats.winRate}%` : "—",
      p1Val: Number(p1Stats?.winRate ?? 0),
      p2Val: Number(p2Stats?.winRate ?? 0),
      formatDiff: (diff: number) => `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
    },
    {
      id: "kd",
      label: isEn ? "Kill / Death Ratio" : "Ratio K/D",
      icon: <Swords className="h-4 w-4 text-rose-400" />,
      p1Display: p1Stats?.kdRatio !== null && p1Stats?.kdRatio !== undefined ? String(p1Stats.kdRatio) : "—",
      p2Display: p2Stats?.kdRatio !== null && p2Stats?.kdRatio !== undefined ? String(p2Stats.kdRatio) : "—",
      p1Val: Number(p1Stats?.kdRatio ?? 0),
      p2Val: Number(p2Stats?.kdRatio ?? 0),
      formatDiff: (diff: number) => `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`,
    },
    {
      id: "hs",
      label: isEn ? "Headshot Precision" : "Précision Headshot",
      icon: <Target className="h-4 w-4 text-cyan-400" />,
      p1Display: `${p1Telemetry?.hsPct ?? 0}%`,
      p2Display: `${p2Telemetry?.hsPct ?? 0}%`,
      p1Val: p1Telemetry?.hsPct ?? 0,
      p2Val: p2Telemetry?.hsPct ?? 0,
      formatDiff: (diff: number) => `${diff > 0 ? "+" : ""}${diff}%`,
    },
    {
      id: "adr",
      label: isEn ? "Average Damage / Round (ADR)" : "Dégâts par Round (ADR)",
      icon: <Flame className="h-4 w-4 text-orange-400" />,
      p1Display: (p1Telemetry?.adr ?? 0) > 0 ? `${p1Telemetry.adr}` : "—",
      p2Display: (p2Telemetry?.adr ?? 0) > 0 ? `${p2Telemetry.adr}` : "—",
      p1Val: p1Telemetry?.adr ?? 0,
      p2Val: p2Telemetry?.adr ?? 0,
      formatDiff: (diff: number) => `${diff > 0 ? "+" : ""}${diff} dmg`,
    },
    {
      id: "acs",
      label: isEn ? "Average Combat Score (ACS)" : "Score de Combat Moyen (ACS)",
      icon: <Zap className="h-4 w-4 text-purple-400" />,
      p1Display: (p1Telemetry?.acs ?? 0) > 0 ? `${p1Telemetry.acs}` : "—",
      p2Display: (p2Telemetry?.acs ?? 0) > 0 ? `${p2Telemetry.acs}` : "—",
      p1Val: p1Telemetry?.acs ?? 0,
      p2Val: p2Telemetry?.acs ?? 0,
      formatDiff: (diff: number) => `${diff > 0 ? "+" : ""}${diff} pts`,
    },
    {
      id: "duel",
      label: isEn ? "Opening & 1v1 Duel Win Rate" : "Taux de Victoire en Duel 1v1",
      icon: <Target className="h-4 w-4 text-sky-400" />,
      p1Display: (p1Telemetry?.duelWinrate ?? 0) > 0 ? `${p1Telemetry.duelWinrate}%` : "—",
      p2Display: (p2Telemetry?.duelWinrate ?? 0) > 0 ? `${p2Telemetry.duelWinrate}%` : "—",
      p1Val: p1Telemetry?.duelWinrate ?? 0,
      p2Val: p2Telemetry?.duelWinrate ?? 0,
      formatDiff: (diff: number) => `${diff > 0 ? "+" : ""}${diff}%`,
    },
    {
      id: "matches",
      label: isEn ? "Analyzed Matches" : "Parties Analysées",
      icon: <Percent className="h-4 w-4 text-neutral-400" />,
      p1Display: `${p1Matches?.length || 0}`,
      p2Display: `${p2Matches?.length || 0}`,
      p1Val: p1Matches?.length || 0,
      p2Val: p2Matches?.length || 0,
      formatDiff: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400">
              <Swords className="h-4 w-4" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold font-mono tracking-tight text-white uppercase">
              {isEn ? "Head-to-Head Arena · Compare with Friend" : "Arène Face-à-Face · Comparer avec un ami"}
            </h2>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed font-sans">
            {isEn
              ? "Dual telemetry face-off, shooting precision, tactical role synergy, and side-by-side performance metrics."
              : "Confrontation télémétrique, précision de tir, synergie tactique des rôles et métriques comparatives côte à côte."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSwapPlayers}
            disabled={!p2Profile && p2Matches.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 text-xs font-mono text-neutral-300 hover:text-white transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-sm"
            title={isEn ? "Swap Players" : "Inverser les joueurs"}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{isEn ? "Swap" : "Inverser"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlayerCardTarget(1);
              setPlayerCardExportOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-3.5 py-2 text-xs font-mono text-purple-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <Share2 className="h-3.5 w-3.5 text-purple-400" />
            <span>{isEn ? "Player Card" : "Exporter Carte"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white text-black hover:bg-neutral-200 px-4 py-2 text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer"
          >
            {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{isEn ? (copiedSummary ? "Copied!" : "Share Duel Card") : (copiedSummary ? "Copié !" : "Partager la fiche")}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
        <div className="lg:col-span-5 rounded-3xl border border-white/[0.1] bg-gradient-to-b from-purple-500/[0.07] via-white/[0.03] to-transparent p-5 backdrop-blur-2xl shadow-lg relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider">
              {isEn ? "Player 1 (Left Duelist)" : "Joueur 1 (Dueliste Gauche)"}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-400">
                {p1Profile?.accountLevel ? `Niv. ${p1Profile.accountLevel}` : isEn ? "Searchable" : "Recherchable"}
              </span>
              {initialProfile && p1Profile?.name !== initialProfile.name && (
                <button
                  type="button"
                  onClick={() => {
                    setP1Profile(initialProfile);
                    setP1Stats(initialStats || null);
                    setP1Matches(initialMatches);
                    setP1Editing(false);
                  }}
                  className="text-[10px] font-mono text-purple-300 hover:text-purple-200 underline cursor-pointer"
                >
                  {isEn ? "Reset to me" : "Mon compte"}
                </button>
              )}
            </div>
          </div>

          {p1Profile && !p1Editing ? (
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-300 overflow-hidden shadow-inner">
                {p1Profile.cardSmall ? (
                  <img
                    src={p1Profile.cardSmall}
                    alt={p1Profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-purple-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                    {p1Profile.name}
                    <span className="text-neutral-500 font-mono text-sm ml-1">
                      #{p1Profile.tag}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerCardTarget(1);
                        setPlayerCardExportOpen(true);
                      }}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>{isEn ? "Card" : "Carte"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setP1InputName(p1Profile.name);
                        setP1InputTag(p1Profile.tag);
                        setP1Editing(true);
                      }}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      {isEn ? "Change" : "Modifier"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/10 px-2 py-0.5 text-xs font-mono text-neutral-200">
                    <Award className="h-3 w-3 text-amber-400" />
                    {p1Profile.currentTierPatched || (isEn ? "Unranked" : "Non classé")}
                  </span>
                  {typeof p1Profile.rr === "number" && (
                    <span className="text-[11px] font-mono text-purple-300">
                      {p1Profile.rr} RR
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFetchPlayer1(p1InputName, p1InputTag);
              }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 relative rounded-xl border border-white/10 bg-black/40 px-3 py-2 flex items-center gap-2 focus-within:border-purple-500/50 transition-all">
                  <User className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <input
                    type="text"
                    value={p1InputName}
                    onChange={(e) => setP1InputName(e.target.value)}
                    placeholder={isEn ? "Player 1 Riot ID" : "Riot ID du Joueur 1"}
                    aria-label={isEn ? "Player 1 Riot ID" : "Riot ID du Joueur 1"}
                    className="w-full bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none font-medium"
                  />
                </div>

                <div className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 flex items-center gap-1 focus-within:border-purple-500/50 transition-all shrink-0">
                  <span className="text-xs text-neutral-500 font-mono">#</span>
                  <input
                    type="text"
                    value={p1InputTag}
                    onChange={(e) => setP1InputTag(e.target.value)}
                    placeholder="TAG"
                    aria-label={isEn ? "Tag" : "Tag"}
                    className="w-full bg-transparent text-xs font-mono text-white placeholder:text-neutral-500 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={p1Loading}
                  className="rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-40 px-4 py-2 text-xs font-bold text-white shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  {p1Loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>{isEn ? "Search" : "Rechercher"}</span>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-center">
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2">
              <span className="text-[10px] font-mono text-neutral-400 block">{isEn ? "Win Rate" : "Victoires"}</span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {p1Stats?.winRate !== null && p1Stats?.winRate !== undefined ? `${p1Stats.winRate}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2">
              <span className="text-[10px] font-mono text-neutral-400 block">K/D</span>
              <p className="text-sm font-bold font-mono text-rose-300 mt-0.5">
                {p1Stats?.kdRatio !== null && p1Stats?.kdRatio !== undefined ? String(p1Stats.kdRatio) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2">
              <span className="text-[10px] font-mono text-neutral-400 block">{isEn ? "Headshot" : "Tête"}</span>
              <p className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                {p1Matches.length > 0 && p1Telemetry.hsPct > 0 ? `${p1Telemetry.hsPct}%` : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col items-center justify-center py-2 lg:py-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/15 text-white shadow-xl shadow-purple-500/10 shrink-0">
            <span className="text-sm font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-cyan-400">
              VS
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-3xl border border-white/[0.1] bg-gradient-to-b from-cyan-500/[0.07] via-white/[0.03] to-transparent p-5 backdrop-blur-2xl shadow-lg relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
              {isEn ? "Player 2 (Friend / Rival)" : "Joueur 2 (Ami / Rival)"}
            </span>
            <span className="text-xs font-mono text-neutral-400">
              {p2Profile?.accountLevel ? `Niv. ${p2Profile.accountLevel}` : isEn ? "Searchable" : "Recherchable"}
            </span>
          </div>

          {p2Profile ? (
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 overflow-hidden shadow-inner">
                {p2Profile.cardSmall ? (
                  <img
                    src={p2Profile.cardSmall}
                    alt={p2Profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-7 w-7 text-cyan-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                    {p2Profile.name}
                    <span className="text-neutral-500 font-mono text-sm ml-1">
                      #{p2Profile.tag}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerCardTarget(2);
                        setPlayerCardExportOpen(true);
                      }}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="h-3 w-3" />
                      <span>{isEn ? "Card" : "Carte"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setP2Profile(null)}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white underline cursor-pointer shrink-0"
                    >
                      {isEn ? "Change" : "Modifier"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/10 px-2 py-0.5 text-xs font-mono text-neutral-200">
                    <Award className="h-3 w-3 text-cyan-400" />
                    {p2Profile.currentTierPatched || (isEn ? "Unranked" : "Non classé")}
                  </span>
                  {typeof p2Profile.rr === "number" && (
                    <span className="text-[11px] font-mono text-cyan-300">
                      {p2Profile.rr} RR
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFetchFriend(p2InputName, p2InputTag);
              }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="flex-1 relative rounded-xl border border-white/10 bg-black/40 px-3 py-2 flex items-center gap-2 focus-within:border-cyan-500/50 transition-all">
                  <User className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <input
                    type="text"
                    value={p2InputName}
                    onChange={(e) => setP2InputName(e.target.value)}
                    placeholder={isEn ? "Friend's Riot ID" : "Riot ID de l'ami"}
                    aria-label={isEn ? "Friend's Riot ID" : "Riot ID de l'ami"}
                    className="w-full bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none font-medium"
                  />
                </div>

                <div className="w-24 rounded-xl border border-white/10 bg-black/40 px-3 py-2 flex items-center gap-1 focus-within:border-cyan-500/50 transition-all shrink-0">
                  <span className="text-xs text-neutral-500 font-mono">#</span>
                  <input
                    type="text"
                    value={p2InputTag}
                    onChange={(e) => setP2InputTag(e.target.value)}
                    placeholder="TAG"
                    aria-label="TAG"
                    className="w-full bg-transparent text-xs text-white placeholder:text-neutral-500 outline-none font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={p2Loading}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {p2Loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : isEn ? "Load" : "Charger"}
                </button>
              </div>

              {recentFriends.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-mono text-neutral-500 mr-1">
                    {isEn ? "Recent:" : "Récents :"}
                  </span>
                  {recentFriends.map((f) => (
                    <button
                      key={`${f.name}#${f.tag}`}
                      type="button"
                      onClick={() => handleFetchFriend(f.name, f.tag)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-500/40 px-2 py-0.5 text-[11px] font-mono text-neutral-300 hover:text-white transition-all cursor-pointer"
                    >
                      {f.name}#{f.tag}
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06] text-center">
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2">
              <span className="text-[10px] font-mono text-neutral-400 block">{isEn ? "Win Rate" : "Victoires"}</span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                {p2Stats?.winRate !== null && p2Stats?.winRate !== undefined ? `${p2Stats.winRate}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2">
              <span className="text-[10px] font-mono text-neutral-400 block">K/D</span>
              <p className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                {p2Stats?.kdRatio !== null && p2Stats?.kdRatio !== undefined ? String(p2Stats.kdRatio) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 border border-white/[0.05] p-2">
              <span className="text-[10px] font-mono text-neutral-400 block">{isEn ? "Headshot" : "Tête"}</span>
              <p className="text-sm font-bold font-mono text-cyan-300 mt-0.5">
                {p2Matches.length > 0 && p2Telemetry.hsPct > 0 ? `${p2Telemetry.hsPct}%` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!hasBothPlayers ? (
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10 backdrop-blur-xl shadow-lg text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 via-white/5 to-cyan-500/20 border border-white/10 mx-auto text-white shadow-xl shadow-cyan-500/10">
            <Swords className="h-8 w-8 text-cyan-400" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold font-mono uppercase tracking-wider text-white">
              {isEn ? "1v1 Head-to-Head Arena Standby" : "Arène de Confrontation 1v1 Prête"}
            </h3>
            <p className="text-xs text-neutral-400 font-sans leading-relaxed">
              {isEn
                ? "Enter your friend or rival's Riot ID above to calculate direct duel advantage, bilateral accuracy bars, body hit placement, and duo synergy."
                : "Renseignez le Riot ID d'un(e) ami(e) ou d'un rival ci-dessus pour calculer l'avantage du duel, les jauges de précision bilatérales, la répartition des tirs et la synergie de duo."}
            </p>
          </div>

          {recentFriends.length > 0 && (
            <div className="pt-4 border-t border-white/[0.06] max-w-lg mx-auto">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-2.5">
                {isEn ? "Quick Compare with Recent Players:" : "Comparer rapidement avec un joueur récent :"}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {recentFriends.map((f) => (
                  <button
                    key={`${f.name}#${f.tag}`}
                    type="button"
                    onClick={() => {
                      setP2InputName(f.name);
                      setP2InputTag(f.tag);
                      handleFetchFriend(f.name, f.tag);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-cyan-500/40 px-3 py-1.5 text-xs font-mono text-neutral-200 hover:text-white transition-all cursor-pointer"
                  >
                    <User className="h-3 w-3 text-cyan-400" />
                    <span>{f.name}#{f.tag}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {p1Matches.length > 0 && (
            <div className="pt-6 border-t border-white/[0.06] text-left space-y-2">
              <span className="text-xs font-mono font-bold text-purple-300 block">
                {p1Profile?.name || p1InputName} — {isEn ? "Current Weapon Telemetry" : "Télémétrie de vos Armes"}
              </span>
              <ValorantWeaponStatsCard matches={p1Matches} isEn={isEn} />
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  {isEn ? "Tactical Advantage & Duel Verdict" : "Avantage Tactique & Verdict du Duel"}
                </h3>
              </div>
              <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[10px] font-mono text-neutral-300">
                {!advantageSummary.hasData
                  ? isEn
                    ? "Awaiting Match Data"
                    : "En attente de données"
                  : advantageSummary.leader === 1
                  ? isEn
                    ? `${p1Profile?.name || p1InputName} Advantage`
                    : `Avantage ${p1Profile?.name || p1InputName}`
                  : advantageSummary.leader === 2
                  ? isEn
                    ? `${p2Profile?.name || p2InputName} Advantage`
                    : `Avantage ${p2Profile?.name || p2InputName}`
                  : isEn
                  ? "Equally Matched"
                  : "Équilibre Parfait"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                  {isEn ? "Aim & Headshot" : "Précision & Tête"}
                </span>
                <p className="text-sm font-bold font-mono text-white">
                  {p1Telemetry.hsPct > p2Telemetry.hsPct
                    ? `${p1Profile?.name || p1InputName} (+${p1Telemetry.hsPct - p2Telemetry.hsPct}%)`
                    : p2Telemetry.hsPct > p1Telemetry.hsPct
                    ? `${p2Profile?.name || p2InputName} (+${p2Telemetry.hsPct - p1Telemetry.hsPct}%)`
                    : p1Telemetry.hsPct === 0 && p2Telemetry.hsPct === 0
                    ? "—"
                    : isEn
                    ? "Tie"
                    : "Égalité"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                  {isEn ? "Survival & K/D" : "Survie & K/D"}
                </span>
                <p className="text-sm font-bold font-mono text-white">
                  {Number(p1Stats?.kdRatio ?? 0) > Number(p2Stats?.kdRatio ?? 0)
                    ? `${p1Profile?.name || p1InputName} (${p1Stats?.kdRatio})`
                    : Number(p2Stats?.kdRatio ?? 0) > Number(p1Stats?.kdRatio ?? 0)
                    ? `${p2Profile?.name || p2InputName} (${p2Stats?.kdRatio})`
                    : !p1Stats?.kdRatio && !p2Stats?.kdRatio
                    ? "—"
                    : isEn
                    ? "Tie"
                    : "Égalité"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                  {isEn ? "Combat ADR" : "Impact ADR"}
                </span>
                <p className="text-sm font-bold font-mono text-white">
                  {p1Telemetry.adr > p2Telemetry.adr
                    ? `${p1Profile?.name || p1InputName} (+${p1Telemetry.adr - p2Telemetry.adr} dmg)`
                    : p2Telemetry.adr > p1Telemetry.adr
                    ? `${p2Profile?.name || p2InputName} (+${p2Telemetry.adr - p1Telemetry.adr} dmg)`
                    : p1Telemetry.adr === 0 && p2Telemetry.adr === 0
                    ? "—"
                    : isEn
                    ? "Tie"
                    : "Égalité"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                  {isEn ? "Win Rate %" : "Taux de Victoire"}
                </span>
                <p className="text-sm font-bold font-mono text-white">
                  {(p1Stats?.winRate ?? 0) > (p2Stats?.winRate ?? 0)
                    ? `${p1Profile?.name || p1InputName} (${p1Stats?.winRate}%)`
                    : (p2Stats?.winRate ?? 0) > (p1Stats?.winRate ?? 0)
                    ? `${p2Profile?.name || p2InputName} (${p2Stats?.winRate}%)`
                    : p1Stats?.winRate === null && p2Stats?.winRate === null
                    ? "—"
                    : isEn
                    ? "Tie"
                    : "Égalité"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  {isEn ? "Bilateral Metric Breakdown" : "Comparaison Métrique Bilatérale"}
                </h3>
              </div>
              <span className="text-xs text-neutral-400 font-mono">
                {p1Profile?.name || p1InputName} vs {p2Profile?.name || p2InputName}
              </span>
            </div>

            <div className="space-y-3">
              {metricRows.map((m) => {
                const total = (m.p1Val || 0) + (m.p2Val || 0);
                const p1Pct = total > 0 ? Math.round((m.p1Val / total) * 100) : 50;
                const p2Pct = 100 - p1Pct;

                const isP1Adv = m.p1Val > m.p2Val;
                const isP2Adv = m.p2Val > m.p1Val;

                return (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 sm:p-4 space-y-2.5 transition-all hover:bg-black/40"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "font-mono font-bold text-sm",
                            isP1Adv ? "text-purple-300" : "text-neutral-300"
                          )}
                        >
                          {m.p1Display}
                        </span>
                        {isP1Adv && m.formatDiff && (
                          <span className="rounded bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.2 text-[10px] font-mono text-purple-300">
                            {m.formatDiff(m.p1Val - m.p2Val)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-neutral-300 font-medium">
                        {m.icon}
                        <span className="text-xs font-mono">{m.label}</span>
                      </div>

                      <div className="flex items-center gap-2 justify-end min-w-0">
                        {isP2Adv && m.formatDiff && (
                          <span className="rounded bg-cyan-500/20 border border-cyan-500/30 px-1.5 py-0.2 text-[10px] font-mono text-cyan-300">
                            {m.formatDiff(m.p2Val - m.p1Val)}
                          </span>
                        )}
                        <span
                          className={cn(
                            "font-mono font-bold text-sm",
                            isP2Adv ? "text-cyan-300" : "text-neutral-300"
                          )}
                        >
                          {m.p2Display}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden flex">
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          isP1Adv ? "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]" : "bg-purple-500/60"
                        )}
                        style={{ width: `${p1Pct}%` }}
                      />
                      <div
                        className={cn(
                          "h-full transition-all duration-500",
                          isP2Adv ? "bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "bg-cyan-500/60"
                        )}
                        style={{ width: `${p2Pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-rose-400" />
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    {isEn ? "Anatomical Hit Placement" : "Répartition Anatomique des Tirs"}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  {isEn ? "Crosshair Height" : "Hauteur Réticule"}
                </span>
              </div>

              {(p1Telemetry.totalShots || 0) === 0 && (p2Telemetry.totalShots || 0) === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-6 text-center space-y-2">
                  <Target className="h-6 w-6 text-neutral-500 mx-auto" />
                  <p className="text-xs font-mono text-neutral-300">
                    {isEn ? "Detailed hit placement requires match logs with round kill telemetry." : "La répartition anatomique nécessite des parties avec télémétrie round par round."}
                  </p>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    {isEn ? "Fast summary mode from Riot API only records global K/D and score." : "Le mode résumé de l'API Riot enregistre uniquement le K/D et le score global."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-3.5 space-y-2">
                    <span className="text-xs font-mono font-bold text-purple-300 block truncate">
                      {p1Profile?.name || p1InputName}
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">{isEn ? "Head" : "Tête"}</span>
                        <span className="font-bold text-rose-400">{p1Telemetry.hsPct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${p1Telemetry.hsPct}%` }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-neutral-400">{isEn ? "Body" : "Corps"}</span>
                        <span className="font-bold text-sky-400">{p1Telemetry.bsPct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${p1Telemetry.bsPct}%` }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-neutral-400">{isEn ? "Legs" : "Jambes"}</span>
                        <span className="font-bold text-neutral-400">{p1Telemetry.lsPct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-neutral-500 h-full rounded-full" style={{ width: `${p1Telemetry.lsPct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] p-3.5 space-y-2">
                    <span className="text-xs font-mono font-bold text-cyan-300 block truncate">
                      {p2Profile?.name || p2InputName}
                    </span>
                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">{isEn ? "Head" : "Tête"}</span>
                        <span className="font-bold text-rose-400">{p2Telemetry.hsPct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${p2Telemetry.hsPct}%` }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-neutral-400">{isEn ? "Body" : "Corps"}</span>
                        <span className="font-bold text-sky-400">{p2Telemetry.bsPct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full" style={{ width: `${p2Telemetry.bsPct}%` }} />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-neutral-400">{isEn ? "Legs" : "Jambes"}</span>
                        <span className="font-bold text-neutral-400">{p2Telemetry.lsPct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                        <div className="bg-neutral-500 h-full rounded-full" style={{ width: `${p2Telemetry.lsPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    {isEn ? "Duo Chemistry & Tactical Synergy" : "Synergie & Alchimie du Duo"}
                  </h3>
                </div>
                <span className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold",
                  duoSynergy.available
                    ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                    : "bg-white/[0.06] border-white/10 text-neutral-400"
                )}>
                  {duoSynergy.available ? `${duoSynergy.score}% ${isEn ? "Synergy" : "Synergie"}` : isEn ? "Awaiting Matches" : "En attente de parties"}
                </span>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-black/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      {duoSynergy.title}
                    </h4>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {duoSynergy.available
                        ? `${duoSynergy.p1Main} (${duoSynergy.p1Role}) + ${duoSynergy.p2Main} (${duoSynergy.p2Role})`
                        : duoSynergy.desc}
                    </p>
                  </div>
                  {duoSynergy.available && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-300 font-mono font-bold text-sm">
                      {duoSynergy.score}
                    </div>
                  )}
                </div>

                {duoSynergy.available && (
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans border-t border-white/[0.05] pt-2.5">
                    {duoSynergy.desc}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
                  <span className="text-[10px] text-neutral-400 block">{isEn ? "P1 Signature" : "Signature J1"}</span>
                  <p className="font-bold text-purple-300 mt-0.5 truncate">{duoSynergy.p1Main}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
                  <span className="text-[10px] text-neutral-400 block">{isEn ? "P2 Signature" : "Signature J2"}</span>
                  <p className="font-bold text-cyan-300 mt-0.5 truncate">{duoSynergy.p2Main}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-400" />
                <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                  {isEn ? "Weapon Efficiency & Arsenal Telemetry" : "Efficacité des Armes & Télémétrie"}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase">
                Vandal · Phantom · Operator · Sheriff
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-purple-300 block">
                  {p1Profile?.name || p1InputName} {isEn ? "Arsenal" : "— Arsenal"}
                </span>
                <ValorantWeaponStatsCard matches={p1Matches} isEn={isEn} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-cyan-300 block">
                  {p2Profile?.name || p2InputName} {isEn ? "Arsenal" : "— Arsenal"}
                </span>
                <ValorantWeaponStatsCard matches={p2Matches} isEn={isEn} />
              </div>
            </div>
          </div>
        </>
      )}

      <PlayerCardExportModal
        isOpen={playerCardExportOpen}
        onClose={() => setPlayerCardExportOpen(false)}
        profile={playerCardTarget === 1 ? p1Profile : p2Profile}
        stats={playerCardTarget === 1 ? p1Stats : p2Stats}
        matches={playerCardTarget === 1 ? p1Matches : p2Matches}
        riotName={playerCardTarget === 1 ? p1Profile?.name || p1InputName || "Agent" : p2Profile?.name || p2InputName || "Agent"}
        riotTag={playerCardTarget === 1 ? p1Profile?.tag || p1InputTag || "" : p2Profile?.tag || p2InputTag || ""}
        isEn={isEn}
      />
    </div>
  );
}
