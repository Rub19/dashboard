"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/SettingsProvider";
import { groupLolMatchesByDate, type LolMatch, type LolDayGroup } from "@/lib/lol-tracker";
import { groupMatchesByDate, type ValorantMatch, type ValorantDayGroup } from "@/lib/valorant-tracker";
import { type TftMatch } from "@/lib/tft-tracker";

export interface TftDayGroup {
  dateLabel: string;
  rawDate: string;
  count: number;
  top4: number;
  avgPlacement: number;
}

interface CachedPayload<T> {
  matches: T[];
  timestamp: number;
}

function readCachedMatches<T>(key: string): CachedPayload<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.matches)) return null;
    return parsed as CachedPayload<T>;
  } catch {
    return null;
  }
}

// TFT has no existing per-day aggregation (unlike LoL/Valorant) — placement-based
// result semantics (top 4 = "good") differ from win/loss, so it gets its own
// small grouping function here rather than forcing it into groupLolMatchesByDate's shape.
export function groupTftMatchesByDate(matches: TftMatch[]): TftDayGroup[] {
  const map = new Map<string, TftMatch[]>();
  matches.forEach((m) => {
    const rawDate = m.playedAt ? m.playedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const list = map.get(rawDate) || [];
    list.push(m);
    map.set(rawDate, list);
  });

  const groups: TftDayGroup[] = [];
  map.forEach((dayMatches, rawDate) => {
    const dateObj = new Date(rawDate);
    const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let top4 = 0;
    let sumPlacement = 0;
    let counted = 0;
    dayMatches.forEach((m) => {
      const placement = m.me?.placement;
      if (typeof placement === "number") {
        sumPlacement += placement;
        counted += 1;
        if (placement <= 4) top4 += 1;
      }
    });
    groups.push({
      dateLabel,
      rawDate,
      count: dayMatches.length,
      top4,
      avgPlacement: counted > 0 ? Number((sumPlacement / counted).toFixed(2)) : 0,
    });
  });

  return groups.sort((a, b) => b.rawDate.localeCompare(a.rawDate));
}

export interface GamingAnalyticsSummary {
  configured: boolean;
  lol: { days: LolDayGroup[]; totalGames: number; winRate: number | null; lastSync: number | null };
  valorant: { days: ValorantDayGroup[]; totalGames: number; winRate: number | null; lastSync: number | null };
  tft: { days: TftDayGroup[]; totalGames: number; top4Rate: number | null; lastSync: number | null };
}

function emptySummary(configured: boolean): GamingAnalyticsSummary {
  return {
    configured,
    lol: { days: [], totalGames: 0, winRate: null, lastSync: null },
    valorant: { days: [], totalGames: 0, winRate: null, lastSync: null },
    tft: { days: [], totalGames: 0, top4Rate: null, lastSync: null },
  };
}

// Reads whatever LolTrackerView/ValorantTrackerView/TftTrackerView already
// cached in localStorage the last time the user opened /matches — this is
// deliberately NOT a fresh live fetch: it reuses the same account config
// (settings.liveTrackerRiotName/Tag) and the same cache keys those views
// write, so Analytics never makes its own Riot/HenrikDev API calls. If the
// user hasn't visited /matches recently, the relevant section is just empty.
export function useGamingAnalytics(): GamingAnalyticsSummary {
  const { settings } = useSettings();
  const riotName = (settings.liveTrackerRiotName || "").trim();
  const riotTag = (settings.liveTrackerRiotTag || "").trim().replace(/^#/, "");
  const configured = Boolean(riotName && riotTag);

  const [summary, setSummary] = useState<GamingAnalyticsSummary>(() => emptySummary(false));

  useEffect(() => {
    if (!configured) {
      setSummary(emptySummary(false));
      return;
    }

    const base = `${riotName.toLowerCase()}:${riotTag.toLowerCase()}`;
    const lolCache = readCachedMatches<LolMatch>(`ethone-lol-cache:${base}:all`);
    const valoCache = readCachedMatches<ValorantMatch>(`ethone-valo-cache:${base}:all`);
    const tftCache = readCachedMatches<TftMatch>(`ethone-tft-cache:${base}`);

    const lolMatches = lolCache?.matches || [];
    const valoMatches = valoCache?.matches || [];
    const tftMatches = tftCache?.matches || [];

    const lolDays = groupLolMatchesByDate(lolMatches);
    const valoDays = groupMatchesByDate(valoMatches);
    const tftDays = groupTftMatchesByDate(tftMatches);

    const lolWins = lolDays.reduce((s, d) => s + d.wins, 0);
    const valoWins = valoDays.reduce((s, d) => s + d.wins, 0);
    const tftTop4 = tftDays.reduce((s, d) => s + d.top4, 0);

    setSummary({
      configured: true,
      lol: {
        days: lolDays,
        totalGames: lolMatches.length,
        winRate: lolMatches.length ? Math.round((lolWins / lolMatches.length) * 100) : null,
        lastSync: lolCache?.timestamp ?? null,
      },
      valorant: {
        days: valoDays,
        totalGames: valoMatches.length,
        winRate: valoMatches.length ? Math.round((valoWins / valoMatches.length) * 100) : null,
        lastSync: valoCache?.timestamp ?? null,
      },
      tft: {
        days: tftDays,
        totalGames: tftMatches.length,
        top4Rate: tftMatches.length ? Math.round((tftTop4 / tftMatches.length) * 100) : null,
        lastSync: tftCache?.timestamp ?? null,
      },
    });
  }, [configured, riotName, riotTag]);

  return summary;
}
