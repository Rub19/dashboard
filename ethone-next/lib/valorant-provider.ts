import { fetchWorker } from "@/lib/api";
import type { ValorantMatch } from "@/lib/valorant-tracker";

export type ValorantDataProvenance = "riot_rso_official" | "henrikdev" | "unconfigured";

export interface ValorantAccountProfile {
  name: string;
  tag: string;
  puuid: string | null;
  accountLevel: number | null;
  cardSmall: string | null;
  cardLarge: string | null;
  currentTierPatched: string | null;
  tier: number | null;
  rr: number | null;
  lastUpdated: string;
  provenance: ValorantDataProvenance;
}

export interface ValorantComputedStats {
  matchesCount: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
  kdRatio: number | null;
  kdaRatio: number | null;
  headshotPercentage: number | null;
  adr: number | null;
  scoreSystem: "performance" | "acs" | null;
  averageScore: number | null;
  provenance: ValorantDataProvenance;
}

export interface ValorantAgentStat {
  agentName: string;
  agentImageUrl?: string;
  matches: number;
  wins: number;
  winRate: number | null;
  kills: number;
  deaths: number;
  kdRatio: number | null;
  averageScore: number | null;
}

export interface ValorantProviderResult<T> {
  data: T | null;
  provenance: ValorantDataProvenance;
  lastUpdated: number;
  isCached: boolean;
  error?: string;
}

const PROFILE_CACHE_TTL_MS = 15 * 60 * 1000;

export async function fetchPlayerProfile(
  name: string,
  tag: string,
  force = false
): Promise<ValorantProviderResult<ValorantAccountProfile>> {
  const cleanName = name.trim();
  const cleanTag = tag.trim().replace(/^#/, "");

  if (!cleanName || !cleanTag) {
    return {
      data: null,
      provenance: "unconfigured",
      lastUpdated: Date.now(),
      isCached: false,
      error: "Nom Riot et TAG requis",
    };
  }

  const cacheKey = `ethone-valo-profile:${cleanName.toLowerCase()}:${cleanTag.toLowerCase()}`;

  if (!force && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { data: ValorantAccountProfile; timestamp: number };
        if (Date.now() - parsed.timestamp < PROFILE_CACHE_TTL_MS && parsed.data) {
          return {
            data: parsed.data,
            provenance: parsed.data.provenance || "henrikdev",
            lastUpdated: parsed.timestamp,
            isCached: true,
          };
        }
      }
    } catch {}
  }

  try {
    const res = await fetchWorker(
      `/api/stats/valorant-profile?name=${encodeURIComponent(cleanName)}&tag=${encodeURIComponent(cleanTag)}`
    );

    const raw = res?.data || res;
    if (!raw || (!raw.name && !raw.puuid && !raw.account_level && !raw.card)) {
      return {
        data: null,
        provenance: "henrikdev",
        lastUpdated: Date.now(),
        isCached: false,
        error: "Profil introuvable pour ce Riot ID",
      };
    }

    const profile: ValorantAccountProfile = {
      name: raw.name || cleanName,
      tag: raw.tag || cleanTag,
      puuid: raw.puuid || null,
      accountLevel: typeof raw.account_level === "number" ? raw.account_level : null,
      cardSmall: raw.card?.small || null,
      cardLarge: raw.card?.large || null,
      currentTierPatched: raw.current_tier_patched || raw.currenttier_patched || null,
      tier: typeof raw.current_tier === "number" ? raw.current_tier : null,
      rr: typeof raw.ranking_in_tier === "number" ? raw.ranking_in_tier : null,
      lastUpdated: new Date().toISOString(),
      provenance: "henrikdev",
    };

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: profile, timestamp: Date.now() }));
      } catch {}
    }

    return {
      data: profile,
      provenance: "henrikdev",
      lastUpdated: Date.now(),
      isCached: false,
    };
  } catch (err) {
    return {
      data: null,
      provenance: "henrikdev",
      lastUpdated: Date.now(),
      isCached: false,
      error: err instanceof Error ? err.message : "Erreur lors de la récupération du profil",
    };
  }
}

export function calculateComputedStats(
  matches: ValorantMatch[],
  provenance: ValorantDataProvenance = "henrikdev"
): ValorantComputedStats {
  if (!matches || matches.length === 0) {
    return {
      matchesCount: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: null,
      kdRatio: null,
      kdaRatio: null,
      headshotPercentage: null,
      adr: null,
      scoreSystem: null,
      averageScore: null,
      provenance,
    };
  }

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  let totalHeadshots = 0;
  let totalBodyshots = 0;
  let totalLegshots = 0;
  let totalAdr = 0;
  let adrCount = 0;
  let totalScore = 0;
  let scoreCount = 0;
  let hasPerformanceScore = false;

  for (const m of matches) {
    const res = (m.metadata?.result || "").toLowerCase();
    const teamScore = m.metadata?.score?.team ?? null;
    const oppScore = m.metadata?.score?.opponent ?? null;

    if (res === "victory" || (teamScore !== null && oppScore !== null && teamScore > oppScore)) {
      wins += 1;
    } else if (res === "defeat" || (teamScore !== null && oppScore !== null && teamScore < oppScore)) {
      losses += 1;
    } else if (res === "draw" || (teamScore !== null && oppScore !== null && teamScore === oppScore)) {
      draws += 1;
    }

    const segStats = m.segments?.[0]?.stats;
    if (segStats) {
      if (typeof segStats.kills?.value === "number") totalKills += segStats.kills.value;
      if (typeof segStats.deaths?.value === "number") totalDeaths += segStats.deaths.value;
      if (typeof segStats.assists?.value === "number") totalAssists += segStats.assists.value;

      if (typeof segStats.adr?.value === "number") {
        totalAdr += segStats.adr.value;
        adrCount += 1;
      }

      if (typeof segStats.performanceScore?.value === "number") {
        totalScore += segStats.performanceScore.value;
        scoreCount += 1;
        hasPerformanceScore = true;
      } else if (typeof segStats.scorePerRound?.value === "number") {
        totalScore += segStats.scorePerRound.value;
        scoreCount += 1;
      }
    }

    const me = m.scoreboard?.players?.find((p) => p.isMe);
    if (me?.stats) {
      if (typeof me.stats.headshots === "number") totalHeadshots += me.stats.headshots;
      if (typeof me.stats.bodyshots === "number") totalBodyshots += me.stats.bodyshots;
      if (typeof me.stats.legshots === "number") totalLegshots += me.stats.legshots;
      if (!segStats) {
        if (typeof me.stats.kills === "number") totalKills += me.stats.kills;
        if (typeof me.stats.deaths === "number") totalDeaths += me.stats.deaths;
        if (typeof me.stats.assists === "number") totalAssists += me.stats.assists;
      }
    }
  }

  const matchesCount = matches.length;
  const winRate = matchesCount > 0 ? Math.round((wins / matchesCount) * 100) : null;
  const kdRatio = totalDeaths > 0 ? Number((totalKills / totalDeaths).toFixed(2)) : totalKills > 0 ? totalKills : null;
  const kdaRatio = totalDeaths > 0 ? Number(((totalKills + totalAssists) / totalDeaths).toFixed(2)) : null;

  const totalShots = totalHeadshots + totalBodyshots + totalLegshots;
  const headshotPercentage = totalShots > 0 ? Math.round((totalHeadshots / totalShots) * 100) : null;
  const adr = adrCount > 0 ? Math.round(totalAdr / adrCount) : null;
  const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : null;

  return {
    matchesCount,
    wins,
    losses,
    draws,
    winRate,
    kdRatio,
    kdaRatio,
    headshotPercentage,
    adr,
    scoreSystem: hasPerformanceScore ? "performance" : scoreCount > 0 ? "acs" : null,
    averageScore,
    provenance,
  };
}

export function calculateAgentStats(matches: ValorantMatch[]): ValorantAgentStat[] {
  if (!matches || matches.length === 0) return [];

  const map = new Map<
    string,
    {
      matches: number;
      wins: number;
      kills: number;
      deaths: number;
      scoreTotal: number;
      scoreCount: number;
      imageUrl?: string;
    }
  >();

  for (const m of matches) {
    const name = m.metadata?.agentName || "Inconnu";
    const res = (m.metadata?.result || "").toLowerCase();
    const teamScore = m.metadata?.score?.team ?? null;
    const oppScore = m.metadata?.score?.opponent ?? null;
    const isWin = res === "victory" || (teamScore !== null && oppScore !== null && teamScore > oppScore);

    const seg = m.segments?.[0]?.stats;
    const k = seg?.kills?.value || 0;
    const d = seg?.deaths?.value || 0;
    const s = seg?.performanceScore?.value || seg?.scorePerRound?.value || 0;

    let existing = map.get(name);
    if (!existing) {
      existing = {
        matches: 0,
        wins: 0,
        kills: 0,
        deaths: 0,
        scoreTotal: 0,
        scoreCount: 0,
        imageUrl: m.metadata?.agentImageUrl,
      };
      map.set(name, existing);
    }

    existing.matches += 1;
    if (isWin) existing.wins += 1;
    existing.kills += k;
    existing.deaths += d;
    if (s > 0) {
      existing.scoreTotal += s;
      existing.scoreCount += 1;
    }
  }

  const result: ValorantAgentStat[] = [];
  map.forEach((val, agentName) => {
    result.push({
      agentName,
      agentImageUrl: val.imageUrl,
      matches: val.matches,
      wins: val.wins,
      winRate: val.matches > 0 ? Math.round((val.wins / val.matches) * 100) : null,
      kills: val.kills,
      deaths: val.deaths,
      kdRatio: val.deaths > 0 ? Number((val.kills / val.deaths).toFixed(2)) : val.kills,
      averageScore: val.scoreCount > 0 ? Math.round(val.scoreTotal / val.scoreCount) : null,
    });
  });

  return result.sort((a, b) => b.matches - a.matches);
}
