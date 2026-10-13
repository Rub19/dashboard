import {
  calculateComputedStats,
  calculateAgentStats,
} from "./valorant-provider";
import type { ValorantMatch } from "./valorant-tracker";

function createMatchForStats(overrides: {
  result: string;
  agentName: string;
  kills: number;
  deaths: number;
  assists?: number;
  hs?: number;
  bs?: number;
  ls?: number;
  adr?: number;
  score?: number;
}): ValorantMatch {
  return {
    id: `m-${Math.random()}`,
    metadata: {
      modeName: "Competitive",
      result: overrides.result,
      mapName: "Ascent",
      agentName: overrides.agentName,
      score: {
        team: overrides.result === "Victory" ? 13 : 7,
        opponent: overrides.result === "Victory" ? 7 : 13,
        roundsPlayed: 20,
      },
      timestamp: new Date().toISOString(),
    },
    segments: [
      {
        type: "player-summary",
        stats: {
          kills: { value: overrides.kills, displayValue: String(overrides.kills) },
          deaths: { value: overrides.deaths, displayValue: String(overrides.deaths) },
          assists: { value: overrides.assists ?? 2, displayValue: String(overrides.assists ?? 2) },
          adr: overrides.adr !== undefined ? { value: overrides.adr, displayValue: String(overrides.adr) } : undefined,
          performanceScore: overrides.score !== undefined ? { value: overrides.score, displayValue: String(overrides.score) } : undefined,
        },
      },
    ],
    scoreboard: {
      players: [
        {
          isMe: true,
          name: "Me",
          tag: "EUW",
          team: "Blue",
          character: overrides.agentName,
          stats: {
            score: overrides.score ?? 3000,
            kills: overrides.kills,
            deaths: overrides.deaths,
            assists: overrides.assists ?? 2,
            headshots: overrides.hs ?? 10,
            bodyshots: overrides.bs ?? 20,
            legshots: overrides.ls ?? 2,
          },
        },
      ],
    },
  };
}

describe("valorant-provider", () => {
  describe("calculateComputedStats", () => {
    it("distingue les valeurs nulles des zéros sur une liste vide", () => {
      const stats = calculateComputedStats([], "henrikdev");
      expect(stats.matchesCount).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(0);
      expect(stats.winRate).toBeNull();
      expect(stats.kdRatio).toBeNull();
      expect(stats.kdaRatio).toBeNull();
      expect(stats.headshotPercentage).toBeNull();
      expect(stats.adr).toBeNull();
      expect(stats.averageScore).toBeNull();
    });

    it("calcule avec précision les ratios et pourcentages", () => {
      const matches: ValorantMatch[] = [
        createMatchForStats({
          result: "Victory",
          agentName: "Jett",
          kills: 20,
          deaths: 10,
          assists: 5,
          hs: 15,
          bs: 15,
          ls: 0,
          adr: 170,
          score: 350,
        }),
        createMatchForStats({
          result: "Defeat",
          agentName: "Omen",
          kills: 10,
          deaths: 10,
          assists: 5,
          hs: 10,
          bs: 20,
          ls: 0,
          adr: 130,
          score: 250,
        }),
      ];

      const stats = calculateComputedStats(matches, "riot_rso_official");
      expect(stats.matchesCount).toBe(2);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(1);
      expect(stats.winRate).toBe(50);
      expect(stats.kdRatio).toBe(1.5);
      expect(stats.kdaRatio).toBe(2);
      expect(stats.headshotPercentage).toBe(42);
      expect(stats.adr).toBe(150);
      expect(stats.averageScore).toBe(300);
      expect(stats.scoreSystem).toBe("performance");
      expect(stats.provenance).toBe("riot_rso_official");
    });
  });

  describe("calculateAgentStats", () => {
    it("agrège et ordonne par nombre de parties jouées", () => {
      const matches: ValorantMatch[] = [
        createMatchForStats({ result: "Victory", agentName: "Jett", kills: 20, deaths: 10 }),
        createMatchForStats({ result: "Victory", agentName: "Jett", kills: 18, deaths: 12 }),
        createMatchForStats({ result: "Defeat", agentName: "Reyna", kills: 15, deaths: 15 }),
      ];

      const agents = calculateAgentStats(matches);
      expect(agents).toHaveLength(2);
      expect(agents[0].agentName).toBe("Jett");
      expect(agents[0].matches).toBe(2);
      expect(agents[0].wins).toBe(2);
      expect(agents[0].winRate).toBe(100);
      expect(agents[1].agentName).toBe("Reyna");
      expect(agents[1].matches).toBe(1);
      expect(agents[1].wins).toBe(0);
      expect(agents[1].winRate).toBe(0);
    });
  });
});
