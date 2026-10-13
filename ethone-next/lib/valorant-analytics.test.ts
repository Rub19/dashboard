import {
  filterMatchesByDateRange,
  calculatePerformanceTrends,
  calculateMapAnalytics,
  calculateInsights,
} from "./valorant-analytics";
import type { ValorantMatch } from "./valorant-tracker";

function createMockMatch(overrides: {
  id: string;
  result: "Victory" | "Defeat" | "Draw";
  timestamp: string;
  kills: number;
  deaths: number;
  assists?: number;
  hsPct?: number;
  adr?: number;
  mapName?: string;
  agentName?: string;
  perfScore?: number;
}): ValorantMatch {
  return {
    id: overrides.id,
    metadata: {
      modeName: "Competitive",
      result: overrides.result,
      mapName: overrides.mapName || "Ascent",
      agentName: overrides.agentName || "Jett",
      score: {
        team: overrides.result === "Victory" ? 13 : 8,
        opponent: overrides.result === "Victory" ? 8 : 13,
        roundsPlayed: 21,
      },
      timestamp: overrides.timestamp,
    },
    segments: [
      {
        type: "player-summary",
        stats: {
          kills: { value: overrides.kills, displayValue: String(overrides.kills) },
          deaths: { value: overrides.deaths, displayValue: String(overrides.deaths) },
          assists: { value: overrides.assists ?? 3, displayValue: String(overrides.assists ?? 3) },
          headshotsPercentage: overrides.hsPct !== undefined ? { value: overrides.hsPct, displayValue: `${overrides.hsPct}%` } : undefined,
          adr: overrides.adr !== undefined ? { value: overrides.adr, displayValue: String(overrides.adr) } : undefined,
          performanceScore: overrides.perfScore !== undefined ? { value: overrides.perfScore, displayValue: String(overrides.perfScore) } : undefined,
        },
      },
    ],
  };
}

describe("valorant-analytics", () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const mockMatches: ValorantMatch[] = [
    createMockMatch({
      id: "m-1",
      result: "Victory",
      timestamp: new Date(now - 2 * dayMs).toISOString(),
      kills: 22,
      deaths: 12,
      hsPct: 28,
      adr: 165,
      mapName: "Ascent",
      agentName: "Jett",
      perfScore: 340,
    }),
    createMockMatch({
      id: "m-2",
      result: "Victory",
      timestamp: new Date(now - 5 * dayMs).toISOString(),
      kills: 19,
      deaths: 14,
      hsPct: 24,
      adr: 150,
      mapName: "Ascent",
      agentName: "Jett",
      perfScore: 310,
    }),
    createMockMatch({
      id: "m-3",
      result: "Defeat",
      timestamp: new Date(now - 10 * dayMs).toISOString(),
      kills: 15,
      deaths: 16,
      hsPct: 20,
      adr: 130,
      mapName: "Bind",
      agentName: "Omen",
      perfScore: 240,
    }),
    createMockMatch({
      id: "m-4",
      result: "Defeat",
      timestamp: new Date(now - 20 * dayMs).toISOString(),
      kills: 10,
      deaths: 18,
      hsPct: 18,
      adr: 110,
      mapName: "Bind",
      agentName: "Omen",
      perfScore: 210,
    }),
    createMockMatch({
      id: "m-5",
      result: "Victory",
      timestamp: new Date(now - 40 * dayMs).toISOString(),
      kills: 25,
      deaths: 11,
      hsPct: 30,
      adr: 180,
      mapName: "Haven",
      agentName: "Reyna",
      perfScore: 380,
    }),
  ];

  describe("filterMatchesByDateRange", () => {
    it("filtre correctement par intervalle 7j, 14j, 30j et all", () => {
      expect(filterMatchesByDateRange(mockMatches, "7d")).toHaveLength(2);
      expect(filterMatchesByDateRange(mockMatches, "14d")).toHaveLength(3);
      expect(filterMatchesByDateRange(mockMatches, "30d")).toHaveLength(4);
      expect(filterMatchesByDateRange(mockMatches, "all")).toHaveLength(5);
    });

    it("gère une liste vide", () => {
      expect(filterMatchesByDateRange([], "7d")).toEqual([]);
    });
  });

  describe("calculatePerformanceTrends", () => {
    it("génère des points chronologiques cohérents", () => {
      const trends = calculatePerformanceTrends(mockMatches);
      expect(trends).toHaveLength(5);
      expect(trends[0].matchId).toBe("m-5");
      expect(trends[4].matchId).toBe("m-1");
      expect(trends[4].result).toBe("victory");
      expect(trends[4].kd).toBe(1.83);
      expect(trends[4].headshotPct).toBe(28);
      expect(trends[4].score).toBe(340);
    });
  });

  describe("calculateMapAnalytics", () => {
    it("agrège correctement les statistiques par carte", () => {
      const maps = calculateMapAnalytics(mockMatches);
      expect(maps).toHaveLength(3);
      const ascent = maps.find((m) => m.mapName === "Ascent");
      expect(ascent).toBeDefined();
      expect(ascent?.matchesCount).toBe(2);
      expect(ascent?.wins).toBe(2);
      expect(ascent?.winRate).toBe(100);

      const bind = maps.find((m) => m.mapName === "Bind");
      expect(bind).toBeDefined();
      expect(bind?.matchesCount).toBe(2);
      expect(bind?.wins).toBe(0);
      expect(bind?.winRate).toBe(0);
    });
  });

  describe("calculateInsights", () => {
    it("signale un manque de données pour moins de 3 parties", () => {
      const result = calculateInsights(mockMatches.slice(0, 2));
      expect(result.hasSufficientData).toBe(false);
      expect(result.strengths).toHaveLength(0);
      expect(result.improvements).toHaveLength(0);
    });

    it("détecte des forces et faiblesses factuelles sur les données", () => {
      const result = calculateInsights(mockMatches);
      expect(result.hasSufficientData).toBe(true);
      expect(result.sampleSize).toBe(5);

      const hasAimStrength = result.strengths.some((s) => s.category === "aim");
      expect(hasAimStrength).toBe(true);

      const hasMapStrength = result.strengths.some((s) => s.id === "map-strong-ascent");
      expect(hasMapStrength).toBe(true);

      const hasMapWeakness = result.improvements.some((i) => i.id === "map-weak-bind");
      expect(hasMapWeakness).toBe(true);
    });
  });
});
