"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Zap,
  Info,
} from "@/components/icons/ph";
import type { ValorantMatch } from "@/lib/valorant-tracker";
import { cn } from "@/lib/utils";

export interface ValorantWeaponStatsCardProps {
  matches: ValorantMatch[];
  isEn?: boolean;
  className?: string;
}

const WEAPON_ICONS: Record<string, string> = {
  Vandal: "https://media.valorant-api.com/weapons/9c82e19d-4575-0200-1a81-3eacf00cf872/displayicon.png",
  Phantom: "https://media.valorant-api.com/weapons/ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a/displayicon.png",
  Operator: "https://media.valorant-api.com/weapons/a03b24d3-4319-996d-0f8c-94bbfba1dfc7/displayicon.png",
  Sheriff: "https://media.valorant-api.com/weapons/e336c6b8-418d-9340-d77f-7a9e4cfe0702/displayicon.png",
  Spectre: "https://media.valorant-api.com/weapons/462080d1-4035-2937-7c09-27aa2a5c27a7/displayicon.png",
  Ghost: "https://media.valorant-api.com/weapons/1baa85b4-4c70-1284-64bb-6481dfc3bb4e/displayicon.png",
  Classic: "https://media.valorant-api.com/weapons/29a0cfab-485b-f5d5-779a-b59f85e204a8/displayicon.png",
  Marshal: "https://media.valorant-api.com/weapons/c4883e50-4494-202c-3ec3-6b8a9284f00b/displayicon.png",
  Outlaw: "https://media.valorant-api.com/weapons/5f0aaf7a-4289-3998-d5ff-eb9a5cf7ef5c/displayicon.png",
  Odin: "https://media.valorant-api.com/weapons/63e6c2b6-4a8e-869c-3d4c-e38355226584/displayicon.png",
  Ares: "https://media.valorant-api.com/weapons/55d8a0f4-4274-ca67-fe2c-06ab45efdf58/displayicon.png",
  Guardian: "https://media.valorant-api.com/weapons/4ade7faa-4cf1-8376-95ef-39884480959b/displayicon.png",
  Bulldog: "https://media.valorant-api.com/weapons/ae3de142-4d85-2547-dd26-4e90bed35cf7/displayicon.png",
  Judge: "https://media.valorant-api.com/weapons/ec845bf4-4f79-ddda-a3da-0db3774b2794/displayicon.png",
  Bucky: "https://media.valorant-api.com/weapons/910be174-449b-c412-ab22-d0873436b21b/displayicon.png",
  Frenzy: "https://media.valorant-api.com/weapons/44d4e95c-4157-0037-81b2-17841bf2e8e3/displayicon.png",
  Shorty: "https://media.valorant-api.com/weapons/42da8ccc-40d5-affc-beec-15aa47b42eda/displayicon.png",
  Stinger: "https://media.valorant-api.com/weapons/f7e1b454-4ad4-1063-ec0a-159e56b58941/displayicon.png",
};

export default function ValorantWeaponStatsCard({
  matches = [],
  isEn = false,
  className,
}: ValorantWeaponStatsCardProps) {
  const telemetry = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalTrackedKills = 0;
    let hasWeaponTelemetry = false;

    const list = Array.isArray(matches) ? matches : [];
    list.forEach((m) => {
      if (!m) return;
      const wStats = m.scoreboard?.weaponStats;
      if (Array.isArray(wStats) && wStats.length > 0) {
        hasWeaponTelemetry = true;
        wStats.forEach((w) => {
          if (!w) return;
          const name = w.weapon || "Unknown";
          counts[name] = (counts[name] || 0) + (w.kills || 0);
          totalTrackedKills += w.kills || 0;
        });
      }
    });

    const entries = Object.entries(counts)
      .map(([weapon, kills]) => ({
        weapon,
        kills,
        pct: totalTrackedKills > 0 ? Math.round((kills / totalTrackedKills) * 100) : 0,
        icon: WEAPON_ICONS[weapon] || null,
      }))
      .sort((a, b) => b.kills - a.kills);

    const vandalKills = counts["Vandal"] || 0;
    const phantomKills = counts["Phantom"] || 0;
    const operatorKills = counts["Operator"] || 0;
    const sheriffKills = counts["Sheriff"] || 0;

    const totalRifles = vandalKills + phantomKills;
    const vandalRatio = totalRifles > 0 ? Math.round((vandalKills / totalRifles) * 100) : 50;
    const phantomRatio = totalRifles > 0 ? Math.round((phantomKills / totalRifles) * 100) : 50;

    let tacticalVerdict = "";
    if (hasWeaponTelemetry) {
      if (vandalKills > phantomKills * 2) {
        tacticalVerdict = isEn
          ? "Heavy Vandal Reliance: You strongly favor one-tap precision and high first-bullet kill conversion over spray control."
          : "Profil Vandal Dominant : Vous privilégiez nettement la précision une-balle et les têtes nettes plutôt que le contrôle de spray.";
      } else if (phantomKills > vandalKills * 1.5) {
        tacticalVerdict = isEn
          ? "Phantom Specialist: Clean smoke spam, rapid multi-target transfers, and aggressive close-to-medium dueling."
          : "Spécialiste Phantom : Excellent jeu à travers les smokes, transferts rapides de cibles et duels agressifs à mi-distance.";
      } else if (totalRifles > 0) {
        tacticalVerdict = isEn
          ? "Balanced Rifle Arsenal: Adaptable loadout shifting naturally between Vandal and Phantom depending on site sightlines."
          : "Arsenal Polyvalent : Adaptation fluide entre Vandal et Phantom selon les lignes et la physionomie des sites.";
      } else if (operatorKills > 0) {
        tacticalVerdict = isEn
          ? "Sniper Influence: Substantial defensive space control with heavy sniper positioning."
          : "Impact Sniper : Contrôle d'espace défensif significatif et verrouillage des longues lignes à l'Operator.";
      }
    }

    return {
      hasWeaponTelemetry,
      totalTrackedKills,
      entries,
      vandalKills,
      phantomKills,
      operatorKills,
      sheriffKills,
      totalRifles,
      vandalRatio,
      phantomRatio,
      tacticalVerdict,
    };
  }, [matches, isEn]);

  return (
    <div
      className={cn(
        "rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-2xl shadow-xl space-y-5 relative overflow-hidden",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-inner">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
              {isEn ? "Weapon Efficiency & Arsenal Telemetry" : "Efficacité des Armes & Télémétrie"}
            </h3>
            <p className="text-[11px] font-mono text-neutral-400">
              {isEn
                ? "Kill distribution across Vandal, Phantom, Operator & Sheriff"
                : "Répartition des éliminations Vandal, Phantom, Operator et Sheriff"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] border border-white/10 px-2.5 py-1 text-[10px] font-mono font-medium text-neutral-300">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                telemetry.hasWeaponTelemetry ? "bg-emerald-400" : "bg-amber-400"
              )}
            />
            {telemetry.hasWeaponTelemetry
              ? isEn
                ? `${telemetry.totalTrackedKills} weapon kills logged`
                : `${telemetry.totalTrackedKills} éliminations analysées`
              : isEn
              ? "Summary Mode"
              : "Mode Synthèse"}
          </span>
        </div>
      </div>

      {telemetry.hasWeaponTelemetry ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                id: "vandal",
                name: "Vandal",
                kills: telemetry.vandalKills,
                desc: isEn ? "One-Tap Rifle" : "Fusil One-Tap",
                color: "rose",
                borderColor: "border-rose-500/30",
                bgGradient: "from-rose-500/10 to-transparent",
                icon: WEAPON_ICONS.Vandal,
              },
              {
                id: "phantom",
                name: "Phantom",
                kills: telemetry.phantomKills,
                desc: isEn ? "Silenced Rifle" : "Fusil Silencieux",
                color: "sky",
                borderColor: "border-sky-500/30",
                bgGradient: "from-sky-500/10 to-transparent",
                icon: WEAPON_ICONS.Phantom,
              },
              {
                id: "operator",
                name: "Operator",
                kills: telemetry.operatorKills,
                desc: isEn ? "Heavy Sniper" : "Sniper Lourd",
                color: "amber",
                borderColor: "border-amber-500/30",
                bgGradient: "from-amber-500/10 to-transparent",
                icon: WEAPON_ICONS.Operator,
              },
              {
                id: "sheriff",
                name: "Sheriff",
                kills: telemetry.sheriffKills,
                desc: isEn ? "High-Impact Pistol" : "Pistolet Lourd",
                color: "purple",
                borderColor: "border-purple-500/30",
                bgGradient: "from-purple-500/10 to-transparent",
                icon: WEAPON_ICONS.Sheriff,
              },
            ].map((w) => {
              const pct =
                telemetry.totalTrackedKills > 0
                  ? Math.round((w.kills / telemetry.totalTrackedKills) * 100)
                  : 0;

              return (
                <div
                  key={w.id}
                  className={cn(
                    "rounded-2xl border bg-gradient-to-b p-3.5 backdrop-blur-xl relative flex flex-col justify-between transition-all hover:border-white/25",
                    w.borderColor,
                    w.bgGradient
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-mono font-bold text-white tracking-wide">
                      {w.name}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {pct}%
                    </span>
                  </div>

                  <div className="h-10 w-full flex items-center justify-center my-1">
                    {w.icon ? (
                      <img
                        src={w.icon}
                        alt={w.name}
                        className="max-h-8 max-w-[90%] object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                      />
                    ) : (
                      <Target className="h-6 w-6 text-neutral-500" />
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-neutral-400">{w.desc}</span>
                    <span className="text-xs font-mono font-bold text-white">
                      {w.kills} <span className="text-[10px] text-neutral-500 font-normal">frags</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {telemetry.totalRifles > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="font-bold text-rose-300">Vandal {telemetry.vandalRatio}%</span>
                </div>
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider">
                  {isEn ? "Rifle Preference Ratio" : "Ratio de Préférence Fusils"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sky-300">Phantom {telemetry.phantomRatio}%</span>
                  <span className="h-2 w-2 rounded-full bg-sky-400" />
                </div>
              </div>

              <div className="relative h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${telemetry.vandalRatio}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-400"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${telemetry.phantomRatio}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-500"
                />
              </div>

              {telemetry.tacticalVerdict && (
                <div className="flex items-start gap-2 pt-1 text-[11px] font-mono text-neutral-300">
                  <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{telemetry.tacticalVerdict}</span>
                </div>
              )}
            </div>
          )}

          {telemetry.entries.length > 4 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">
                {isEn ? "Other Weapons Tracked" : "Autres Armes Utilisées"}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {telemetry.entries.slice(4).map((w) => (
                  <div
                    key={w.weapon}
                    className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 flex items-center justify-between gap-2"
                  >
                    <span className="text-[11px] font-mono font-medium text-neutral-300 truncate">
                      {w.weapon}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                      {w.kills} frags
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 opacity-60">
            {[
              { name: "Vandal", icon: WEAPON_ICONS.Vandal, role: isEn ? "One-Tap" : "One-Tap" },
              { name: "Phantom", icon: WEAPON_ICONS.Phantom, role: isEn ? "Silenced" : "Silencieux" },
              { name: "Operator", icon: WEAPON_ICONS.Operator, role: isEn ? "Sniper" : "Sniper" },
              { name: "Sheriff", icon: WEAPON_ICONS.Sheriff, role: isEn ? "High-Impact" : "Lourd" },
            ].map((w) => (
              <div
                key={w.name}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 flex flex-col items-center justify-center text-center space-y-2"
              >
                <img
                  src={w.icon}
                  alt={w.name}
                  className="h-7 max-w-[85%] object-contain filter grayscale opacity-75"
                />
                <span className="text-xs font-mono font-semibold text-neutral-300">
                  {w.name}
                </span>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-3.5 flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs font-mono space-y-1">
              <p className="font-semibold text-amber-200">
                {isEn ? "Detailed Weapon Telemetry" : "Télémétrie d'armes round-par-round"}
              </p>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                {isEn
                  ? "The loaded matches are in fast summary mode without individual kill weapon logs. Detailed weapon efficiency (Vandal, Phantom, Operator, Sheriff) displays automatically when live match round-by-round events or full Henrik API details are received."
                  : "Les parties actuellement chargées sont en mode résumé sans journal d'armes round-par-round. L'efficacité détaillée par arme (Vandal, Phantom, Operator, Sheriff) s'affichera automatiquement dès que des parties complètes avec événements de tir ou clé API Henrik sont synchronisées."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
