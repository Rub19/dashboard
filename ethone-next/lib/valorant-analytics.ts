import type { ValorantMatch } from "@/lib/valorant-tracker";

export type DateFilterRange = "7d" | "14d" | "30d" | "all";

export interface PerformanceTrendPoint {
  date: string;
  timestamp: number;
  matchId: string;
  result: "victory" | "defeat" | "draw";
  kd: number;
  headshotPct: number | null;
  score: number | null;
  mapName: string;
  agentName: string;
}

export interface MapAnalytics {
  mapName: string;
  matchesCount: number;
  wins: number;
  losses: number;
  winRate: number;
  kdRatio: number;
}

export interface InsightItem {
  id: string;
  type: "strength" | "improvement";
  title: string;
  description: string;
  metric: string;
  category: "aim" | "combat" | "map" | "consistency";
}

export interface PerformanceInsights {
  hasSufficientData: boolean;
  sampleSize: number;
  strengths: InsightItem[];
  improvements: InsightItem[];
  summary: string;
}

export function filterMatchesByDateRange(
  matches: ValorantMatch[],
  range: DateFilterRange
): ValorantMatch[] {
  if (!matches || matches.length === 0) return [];
  if (range === "all") return matches;

  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return matches.filter((m) => {
    const rawTime = m.metadata?.timestamp;
    if (!rawTime) return false;
    const timeMs = new Date(rawTime).getTime();
    return Number.isFinite(timeMs) && timeMs >= cutoff;
  });
}

export function calculatePerformanceTrends(matches: ValorantMatch[]): PerformanceTrendPoint[] {
  if (!matches || matches.length === 0) return [];

  const points: PerformanceTrendPoint[] = [];

  const sorted = [...matches].sort((a, b) => {
    const timeA = new Date(a.metadata?.timestamp || 0).getTime();
    const timeB = new Date(b.metadata?.timestamp || 0).getTime();
    return timeA - timeB;
  });

  for (const m of sorted) {
    const res = (m.metadata?.result || "").toLowerCase();
    const teamScore = m.metadata?.score?.team ?? null;
    const oppScore = m.metadata?.score?.opponent ?? null;

    let normalizedResult: "victory" | "defeat" | "draw" = "defeat";
    if (res === "victory" || (teamScore !== null && oppScore !== null && teamScore > oppScore)) {
      normalizedResult = "victory";
    } else if (res === "draw" || (teamScore !== null && oppScore !== null && teamScore === oppScore)) {
      normalizedResult = "draw";
    }

    const seg = m.segments?.[0]?.stats;
    const kills = seg?.kills?.value ?? 0;
    const deaths = seg?.deaths?.value ?? 1;
    const kd = deaths > 0 ? Number((kills / deaths).toFixed(2)) : kills;

    let hsPct: number | null = null;
    if (typeof seg?.headshotsPercentage?.value === "number") {
      hsPct = Math.round(seg.headshotsPercentage.value);
    } else {
      const me = m.scoreboard?.players?.find((p) => p.isMe);
      const hs = me?.stats?.headshots ?? 0;
      const bs = me?.stats?.bodyshots ?? 0;
      const ls = me?.stats?.legshots ?? 0;
      const total = hs + bs + ls;
      if (total > 0) hsPct = Math.round((hs / total) * 100);
    }

    const score = seg?.performanceScore?.value ?? seg?.scorePerRound?.value ?? null;
    const rawTime = m.metadata?.timestamp || new Date().toISOString();
    const timeMs = new Date(rawTime).getTime();

    points.push({
      date: new Date(rawTime).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
      timestamp: timeMs,
      matchId: m.id,
      result: normalizedResult,
      kd,
      headshotPct: hsPct,
      score,
      mapName: m.metadata?.mapName || "Inconnu",
      agentName: m.metadata?.agentName || "Inconnu",
    });
  }

  return points;
}

export function calculateMapAnalytics(matches: ValorantMatch[]): MapAnalytics[] {
  if (!matches || matches.length === 0) return [];

  const mapData = new Map<string, { matches: number; wins: number; kills: number; deaths: number }>();

  for (const m of matches) {
    const map = m.metadata?.mapName || "Inconnu";
    const res = (m.metadata?.result || "").toLowerCase();
    const teamScore = m.metadata?.score?.team ?? null;
    const oppScore = m.metadata?.score?.opponent ?? null;
    const isWin = res === "victory" || (teamScore !== null && oppScore !== null && teamScore > oppScore);

    const seg = m.segments?.[0]?.stats;
    const k = seg?.kills?.value || 0;
    const d = seg?.deaths?.value || 0;

    let curr = mapData.get(map);
    if (!curr) {
      curr = { matches: 0, wins: 0, kills: 0, deaths: 0 };
      mapData.set(map, curr);
    }

    curr.matches += 1;
    if (isWin) curr.wins += 1;
    curr.kills += k;
    curr.deaths += d;
  }

  const result: MapAnalytics[] = [];
  mapData.forEach((val, mapName) => {
    result.push({
      mapName,
      matchesCount: val.matches,
      wins: val.wins,
      losses: val.matches - val.wins,
      winRate: val.matches > 0 ? Math.round((val.wins / val.matches) * 100) : 0,
      kdRatio: val.deaths > 0 ? Number((val.kills / val.deaths).toFixed(2)) : val.kills,
    });
  });

  return result.sort((a, b) => b.matchesCount - a.matchesCount);
}

export function calculateInsights(matches: ValorantMatch[]): PerformanceInsights {
  if (!matches || matches.length < 3) {
    return {
      hasSufficientData: false,
      sampleSize: matches ? matches.length : 0,
      strengths: [],
      improvements: [],
      summary: "Données insuffisantes (minimum 3 parties requises pour dégager des tendances factuelles).",
    };
  }

  let totalKills = 0;
  let totalDeaths = 0;
  let totalHeadshots = 0;
  let totalBodyshots = 0;
  let totalLegshots = 0;
  let totalAdr = 0;
  let adrCount = 0;
  let segHsTotal = 0;
  let segHsCount = 0;
  let wins = 0;

  for (const m of matches) {
    const res = (m.metadata?.result || "").toLowerCase();
    const teamScore = m.metadata?.score?.team ?? null;
    const oppScore = m.metadata?.score?.opponent ?? null;
    if (res === "victory" || (teamScore !== null && oppScore !== null && teamScore > oppScore)) {
      wins += 1;
    }

    const seg = m.segments?.[0]?.stats;
    if (seg) {
      if (typeof seg.kills?.value === "number") totalKills += seg.kills.value;
      if (typeof seg.deaths?.value === "number") totalDeaths += seg.deaths.value;
      if (typeof seg.adr?.value === "number") {
        totalAdr += seg.adr.value;
        adrCount += 1;
      }
      if (typeof seg.headshotsPercentage?.value === "number") {
        segHsTotal += seg.headshotsPercentage.value;
        segHsCount += 1;
      }
    }

    const me = m.scoreboard?.players?.find((p) => p.isMe);
    if (me?.stats) {
      if (typeof me.stats.headshots === "number") totalHeadshots += me.stats.headshots;
      if (typeof me.stats.bodyshots === "number") totalBodyshots += me.stats.bodyshots;
      if (typeof me.stats.legshots === "number") totalLegshots += me.stats.legshots;
    }
  }

  const kd = totalDeaths > 0 ? totalKills / totalDeaths : totalKills;
  const totalShots = totalHeadshots + totalBodyshots + totalLegshots;
  const hsPct = totalShots > 0
    ? Math.round((totalHeadshots / totalShots) * 100)
    : segHsCount > 0
    ? Math.round(segHsTotal / segHsCount)
    : null;
  const avgAdr = adrCount > 0 ? Math.round(totalAdr / adrCount) : null;
  const winRate = Math.round((wins / matches.length) * 100);

  const strengths: InsightItem[] = [];
  const improvements: InsightItem[] = [];

  if (kd >= 1.2) {
    strengths.push({
      id: "kd-high",
      type: "strength",
      title: "Impact d'élimination supérieur",
      description: "Votre différentiel de duels est nettement positif, assurant un avantage numérique régulier.",
      metric: `${kd.toFixed(2)} K/D`,
      category: "combat",
    });
  } else if (kd < 0.9) {
    improvements.push({
      id: "kd-low",
      type: "improvement",
      title: "Différentiel d'éliminations déficitaire",
      description: "Vous subissez plus d'éliminations que vous n'en réalisez. Privilégiez les prises de ligne croisées et le trade avec un coéquipier.",
      metric: `${kd.toFixed(2)} K/D`,
      category: "combat",
    });
  }

  if (hsPct !== null && hsPct >= 22) {
    strengths.push({
      id: "hs-high",
      type: "strength",
      title: "Excellente précision de tir",
      description: "Votre placement de réticule à hauteur de tête convertit efficacement les premiers tirs.",
      metric: `${hsPct}% HS`,
      category: "aim",
    });
  } else if (hsPct !== null && hsPct < 15) {
    improvements.push({
      id: "hs-low",
      type: "improvement",
      title: "Précision de tir perfectible",
      description: "Un taux de tir tête modéré suggère un placement de réticule trop bas ou une dispersion excessive lors des rafales.",
      metric: `${hsPct}% HS`,
      category: "aim",
    });
  }

  if (avgAdr !== null && avgAdr >= 145) {
    strengths.push({
      id: "adr-high",
      type: "strength",
      title: "Contribution élevée en dégâts",
      description: "Vous appliquez une forte pression offensive à chaque manche, facilitant les éliminations pour votre équipe.",
      metric: `${avgAdr} ADR`,
      category: "combat",
    });
  } else if (avgAdr !== null && avgAdr < 115) {
    improvements.push({
      id: "adr-low",
      type: "improvement",
      title: "Volume de dégâts insuffisant",
      description: "Participez plus activement aux prises d'espace initiales et aux échanges d'utilitaires pour augmenter votre présence.",
      metric: `${avgAdr} ADR`,
      category: "combat",
    });
  }

  const mapStats = calculateMapAnalytics(matches);
  const bestMap = mapStats.find((m) => m.matchesCount >= 2 && m.winRate >= 65);
  if (bestMap) {
    strengths.push({
      id: `map-strong-${bestMap.mapName.toLowerCase()}`,
      type: "strength",
      title: `Domination sur ${bestMap.mapName}`,
      description: "Vos prises de position et repères tactiques sur cette carte se traduisent par une excellente régularité.",
      metric: `${bestMap.winRate}% WR (${bestMap.matchesCount} m)`,
      category: "map",
    });
  }

  const weakMap = mapStats.find((m) => m.matchesCount >= 2 && m.winRate <= 35);
  if (weakMap) {
    improvements.push({
      id: `map-weak-${weakMap.mapName.toLowerCase()}`,
      type: "improvement",
      title: `Difficulté tactique sur ${weakMap.mapName}`,
      description: "Analysez vos timings de rotation et zones de contact défavorables sur cette carte.",
      metric: `${weakMap.winRate}% WR (${weakMap.matchesCount} m)`,
      category: "map",
    });
  }

  if (winRate >= 60) {
    strengths.push({
      id: "winrate-positive",
      type: "strength",
      title: "Taux de victoire solide",
      description: "Votre impact global convertit la majorité des parties en victoires.",
      metric: `${winRate}% WR`,
      category: "consistency",
    });
  } else if (winRate < 45) {
    improvements.push({
      id: "winrate-negative",
      type: "improvement",
      title: "Série négative à redresser",
      description: "Recentrez votre jeu sur la communication et la cohésion d'équipe.",
      metric: `${winRate}% WR`,
      category: "consistency",
    });
  }

  const summary = `Échantillon de ${matches.length} parties : ${strengths.length} point${strengths.length > 1 ? "s" : ""} fort${strengths.length > 1 ? "s" : ""} et ${improvements.length} axe${improvements.length > 1 ? "s" : ""} d'amélioration identifié${improvements.length > 1 ? "s" : ""}.`;

  return {
    hasSufficientData: true,
    sampleSize: matches.length,
    strengths,
    improvements,
    summary,
  };
}
