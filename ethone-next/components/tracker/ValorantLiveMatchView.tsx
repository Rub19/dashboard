"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Activity,
  Swords,
} from "@/components/icons/ph";
import { cn } from "@/lib/utils";
import type { ValorantAccountProfile } from "@/lib/valorant-provider";
import type { ValorantMatch } from "@/lib/valorant-tracker";

export interface ValorantLiveMatchViewProps {
  riotName: string;
  riotTag: string;
  valorantProfile: ValorantAccountProfile | null;
  valorantMatches: ValorantMatch[];
}

interface LivePlayer {
  id: string;
  name: string;
  tag: string;
  agent: string;
  role: string;
  rank: string;
  rankColor: string;
  isMe?: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  damage: number;
  credits: number;
  weapon: string;
  shield: "heavy" | "light" | "none";
  ultimateReady: boolean;
  ultimatePoints: string;
}

const ALLIED_PLAYERS_DEFAULT: LivePlayer[] = [
  {
    id: "me",
    name: "Rub19",
    tag: "boss",
    agent: "Jett",
    role: "Dueliste",
    rank: "Immortel 1",
    rankColor: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    isMe: true,
    kills: 16,
    deaths: 7,
    assists: 4,
    score: 3620,
    damage: 2540,
    credits: 4100,
    weapon: "Vandal",
    shield: "heavy",
    ultimateReady: true,
    ultimatePoints: "7/7",
  },
  {
    id: "p2",
    name: "Krypton",
    tag: "EUW",
    agent: "Omen",
    role: "Contrôleur",
    rank: "Ascendant 3",
    rankColor: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    kills: 9,
    deaths: 9,
    assists: 10,
    score: 2180,
    damage: 1620,
    credits: 2400,
    weapon: "Phantom",
    shield: "heavy",
    ultimateReady: false,
    ultimatePoints: "5/7",
  },
  {
    id: "p3",
    name: "Valkyrie",
    tag: "FR",
    agent: "Killjoy",
    role: "Sentinelle",
    rank: "Immortel 1",
    rankColor: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    kills: 12,
    deaths: 8,
    assists: 6,
    score: 2590,
    damage: 2010,
    credits: 3200,
    weapon: "Guardian",
    shield: "heavy",
    ultimateReady: false,
    ultimatePoints: "6/8",
  },
  {
    id: "p4",
    name: "SovaMaster",
    tag: "1337",
    agent: "Sova",
    role: "Initiateur",
    rank: "Ascendant 2",
    rankColor: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    kills: 7,
    deaths: 10,
    assists: 13,
    score: 1840,
    damage: 1410,
    credits: 1900,
    weapon: "Spectre",
    shield: "light",
    ultimateReady: false,
    ultimatePoints: "4/8",
  },
  {
    id: "p5",
    name: "BreachGod",
    tag: "EU",
    agent: "Breach",
    role: "Initiateur",
    rank: "Ascendant 3",
    rankColor: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    kills: 8,
    deaths: 9,
    assists: 9,
    score: 1950,
    damage: 1530,
    credits: 2500,
    weapon: "Judge",
    shield: "heavy",
    ultimateReady: true,
    ultimatePoints: "7/7",
  },
];

const ENEMY_PLAYERS_DEFAULT: LivePlayer[] = [
  {
    id: "e1",
    name: "Derke",
    tag: "FNC",
    agent: "Raze",
    role: "Dueliste",
    rank: "Radiant",
    rankColor: "text-amber-300 border-amber-400/40 bg-amber-400/10",
    kills: 15,
    deaths: 9,
    assists: 3,
    score: 3350,
    damage: 2490,
    credits: 1200,
    weapon: "Vandal",
    shield: "heavy",
    ultimateReady: true,
    ultimatePoints: "8/8",
  },
  {
    id: "e2",
    name: "Chronicle",
    tag: "EMEA",
    agent: "Fade",
    role: "Initiateur",
    rank: "Immortel 3",
    rankColor: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    kills: 10,
    deaths: 11,
    assists: 6,
    score: 2210,
    damage: 1780,
    credits: 2600,
    weapon: "Phantom",
    shield: "heavy",
    ultimateReady: false,
    ultimatePoints: "5/7",
  },
  {
    id: "e3",
    name: "Boaster",
    tag: "FNC",
    agent: "Astra",
    role: "Contrôleur",
    rank: "Immortel 2",
    rankColor: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    kills: 6,
    deaths: 12,
    assists: 12,
    score: 1710,
    damage: 1240,
    credits: 3800,
    weapon: "Sheriff",
    shield: "light",
    ultimateReady: false,
    ultimatePoints: "6/7",
  },
  {
    id: "e4",
    name: "Alfajer",
    tag: "TUR",
    agent: "Cypher",
    role: "Sentinelle",
    rank: "Radiant",
    rankColor: "text-amber-300 border-amber-400/40 bg-amber-400/10",
    kills: 11,
    deaths: 9,
    assists: 4,
    score: 2380,
    damage: 1920,
    credits: 2100,
    weapon: "Guardian",
    shield: "heavy",
    ultimateReady: true,
    ultimatePoints: "6/6",
  },
  {
    id: "e5",
    name: "Leo",
    tag: "SWE",
    agent: "Gekko",
    role: "Initiateur",
    rank: "Immortel 3",
    rankColor: "text-rose-400 border-rose-500/40 bg-rose-500/10",
    kills: 9,
    deaths: 10,
    assists: 8,
    score: 2040,
    damage: 1650,
    credits: 2800,
    weapon: "Vandal",
    shield: "heavy",
    ultimateReady: false,
    ultimatePoints: "4/7",
  },
];

const RECENT_LIVE_EVENTS = [
  {
    round: 13,
    type: "win",
    winner: "Défense",
    text: "Manche remportée par les Défenseurs · Rub19 (Jett) double kill Vandal sur A Site · Spike désamorcé à 0.38s",
    economy: "Éco pleine Défense (+3 000 ¤)",
  },
  {
    round: 12,
    type: "win",
    winner: "Défense",
    text: "Manche remportée par les Défenseurs · Sova flèche de détection A Main · Clutch 1v1 remporté par Rub19",
    economy: "Bonus manche (+3 000 ¤)",
  },
  {
    round: 11,
    type: "loss",
    winner: "Attaque",
    text: "Manche remportée par les Attaquants · Raze Showstopper sur B Site · Spike explosé",
    economy: "Perte Défense (+1 900 ¤)",
  },
  {
    round: 10,
    type: "win",
    winner: "Défense",
    text: "Manche remportée par les Défenseurs · Killjoy tourelle B Short · 4 éliminations sans perte",
    economy: "Victoire sans perte (+3 000 ¤)",
  },
];

export default function ValorantLiveMatchView({
  riotName,
  riotTag,
  valorantProfile,
  valorantMatches,
}: ValorantLiveMatchViewProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [liveCheckStatus, setLiveCheckStatus] = useState<"active" | "standby">("active");

  const latestMatch = valorantMatches[0];
  const activeMap = latestMatch?.metadata?.map || "Ascent";
  const activeMode = latestMatch?.metadata?.mode || "Compétitif";

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const alliedPlayers = useMemo(() => {
    return ALLIED_PLAYERS_DEFAULT.map((p) => {
      if (p.isMe) {
        return {
          ...p,
          name: valorantProfile?.name || riotName || "Rub19",
          tag: valorantProfile?.tag || riotTag || "boss",
          rank: valorantProfile?.currentTierPatched || "Immortel 1",
        };
      }
      return p;
    });
  }, [valorantProfile, riotName, riotTag]);

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 sm:p-5 backdrop-blur-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.06] pb-3.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[10px] font-medium text-neutral-300 uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Telemetry · Bêta
              </span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                Serveur : EU-Paris (18ms)
              </span>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                Mode : {activeMode}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white uppercase tracking-wide">
              Partie en Direct · {activeMap}
            </h2>
            <p className="text-xs text-neutral-400">
              Télémétrie en cours pour <strong className="text-white font-medium">{valorantProfile?.name || riotName}#{valorantProfile?.tag || riotTag}</strong>. Rafraîchissement automatique de la manche.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setLiveCheckStatus(liveCheckStatus === "active" ? "standby" : "active")}
              className={cn(
                "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
                liveCheckStatus === "active"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.04] text-neutral-400 hover:text-white"
              )}
            >
              {liveCheckStatus === "active" ? "● Session Active Détectée" : "○ En Attente de Session"}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 active:scale-[0.98] transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Activity className={cn("h-3.5 w-3.5 text-black", refreshing && "animate-spin")} />
              <span>{refreshing ? "Actualisation..." : "Actualiser Télémétrie"}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Score Actuel</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-white">8</span>
              <span className="text-sm font-medium text-neutral-500">—</span>
              <span className="text-2xl font-semibold text-white">5</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-normal">Défense en tête (+3)</span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Manche en Cours</span>
            <span className="mt-1 text-xl font-semibold text-white">Manche 14</span>
            <span className="text-[10px] text-neutral-400">Phase d&apos;Achat (0:28)</span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Spike & Objectif</span>
            <span className="mt-1 text-sm font-semibold text-white">Non Posé</span>
            <span className="text-[10px] text-neutral-400">Porteur non identifié</span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col">
            <span className="text-[10px] font-mono uppercase text-neutral-400">Économie d&apos;Équipe</span>
            <span className="mt-1 text-base font-semibold text-white">14 100 ¤</span>
            <span className="text-[10px] text-neutral-400">Achat Vandal + Armure</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/70" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Équipe Défenseurs (Alliés · 8 Victoires)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-medium text-neutral-400">Loadout 100% Complet</span>
          </div>

          <div className="space-y-1.5">
            {alliedPlayers.map((player) => (
              <div
                key={player.id}
                className={cn(
                  "rounded-xl border p-2.5 flex items-center justify-between gap-2 transition-all",
                  player.isMe
                    ? "border-white/20 bg-white/[0.06] shadow-sm"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 font-semibold text-xs text-neutral-200 shrink-0">
                    {player.agent.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-semibold text-white truncate">
                        {player.name}#{player.tag}
                      </span>
                      {player.isMe && (
                        <span className="rounded-full bg-white/15 px-1.5 py-0.2 text-[8px] font-semibold text-white uppercase">
                          Moi
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                      <span className="text-neutral-300 font-medium">{player.agent}</span>
                      <span>·</span>
                      <span>{player.weapon}</span>
                      <span>·</span>
                      <span>{player.credits} ¤</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <div className="text-xs font-mono font-medium text-white">
                      {player.kills}/{player.deaths}/{player.assists}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      {player.damage} dégâts
                    </div>
                  </div>
                  <div className="w-12 text-center">
                    {player.ultimateReady ? (
                      <span className="inline-block rounded-full border border-white/20 bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        ULT PRÊT
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-neutral-400">
                        Ult {player.ultimatePoints}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white/40" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Équipe Attaquants (Adversaires · 5 Victoires)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-medium text-neutral-400">Économie Forcée</span>
          </div>

          <div className="space-y-1.5">
            {ENEMY_PLAYERS_DEFAULT.map((player) => (
              <div
                key={player.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 flex items-center justify-between gap-2 hover:border-white/10 hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 font-semibold text-xs text-neutral-200 shrink-0">
                    {player.agent.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs font-semibold text-white truncate">
                        {player.name}#{player.tag}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                      <span className="text-neutral-300 font-medium">{player.agent}</span>
                      <span>·</span>
                      <span>{player.weapon}</span>
                      <span>·</span>
                      <span>{player.credits} ¤</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <div className="text-xs font-mono font-medium text-white">
                      {player.kills}/{player.deaths}/{player.assists}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      {player.damage} dégâts
                    </div>
                  </div>
                  <div className="w-12 text-center">
                    {player.ultimateReady ? (
                      <span className="inline-block rounded-full border border-white/20 bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        ULT PRÊT
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-neutral-400">
                        Ult {player.ultimatePoints}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#121214]/80 p-4 backdrop-blur-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-neutral-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
              Historique des Manches Récentes de la Partie
            </h3>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">4 dernières manches archivées</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {RECENT_LIVE_EVENTS.map((evt) => (
            <div
              key={evt.round}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex flex-col justify-between gap-1.5"
            >
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className={evt.type === "win" ? "text-emerald-400" : "text-neutral-300"}>
                  Manche #{evt.round} · Victoire {evt.winner}
                </span>
                <span className="font-mono text-[10px] text-neutral-400">{evt.economy}</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {evt.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
