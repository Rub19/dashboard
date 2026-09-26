import {
  calculateMatchRankBadge,
  convertHenrikMatchToValorantMatch,
  getMatchHighlightBadges,
  groupMatchesByDate,
  matchScoreValue,
  readPerformanceScore,
  scoringSystemFor,
  type ValorantMatch,
} from "./valorant-tracker";

function rawMatch(opts: { version?: string; startSec: number; withPerformance?: boolean }) {
  const player = (name: string, team: string, score: number, perf?: number) => ({
    name,
    tag: "EUW",
    team,
    character: "Jett",
    stats: { score, kills: 15, deaths: 10, assists: 3, headshots: 10, bodyshots: 20, legshots: 2, ...(perf !== undefined ? { performance_score: perf } : {}) },
    damage_made: 2500,
    damage_received: 2000,
  });
  return {
    metadata: { matchid: `m-${opts.startSec}`, mode: "Competitive", map: "Ascent", rounds_played: 20, game_start: opts.startSec, game_version: opts.version },
    players: {
      all_players: [
        player("Me", "Blue", 5000, opts.withPerformance ? 310 : undefined),
        player("Other", "Red", 6000, opts.withPerformance ? 280 : undefined),
      ],
    },
    teams: { blue: { rounds_won: 13, has_won: true }, red: { rounds_won: 7, has_won: false } },
  };
}

describe("système de notation (patch 13.06)", () => {
  it("détecte le score de performance à partir de la version du jeu", () => {
    expect(scoringSystemFor("release-13.05-shipping-4-1234")).toBe("acs");
    expect(scoringSystemFor("release-13.06-shipping-4-1234")).toBe("performance");
    expect(scoringSystemFor("release-14.01-shipping-1")).toBe("performance");
    expect(scoringSystemFor("release-12.10-shipping-1")).toBe("acs");
  });

  it("se rabat sur la date du patch quand la version est absente", () => {
    expect(scoringSystemFor(undefined, "2026-09-20T10:00:00.000Z")).toBe("acs");
    expect(scoringSystemFor(undefined, "2026-09-23T10:00:00.000Z")).toBe("performance");
  });

  it("ne lit que des scores de performance valides (0-500)", () => {
    expect(readPerformanceScore({ stats: { performance_score: 312.4 } })).toBe(312);
    expect(readPerformanceScore({ performanceScore: "410" })).toBe(410);
    expect(readPerformanceScore({ stats: { performance_score: 900 } })).toBeNull();
    expect(readPerformanceScore({ stats: { score: 5000 } })).toBeNull();
  });
});

describe("parties d'avant et d'après le patch", () => {
  const before = convertHenrikMatchToValorantMatch(rawMatch({ version: "release-13.05-shipping-1", startSec: 1_790_000_000 }), "Me", "EUW") as ValorantMatch;
  const afterWithout = convertHenrikMatchToValorantMatch(rawMatch({ version: "release-13.06-shipping-1", startSec: 1_790_500_000 }), "Me", "EUW") as ValorantMatch;
  const afterWith = convertHenrikMatchToValorantMatch(rawMatch({ version: "release-13.06-shipping-1", startSec: 1_790_600_000, withPerformance: true }), "Me", "EUW") as ValorantMatch;

  it("garde l'ACS (score / manches) avant le patch", () => {
    expect(matchScoreValue(before)).toEqual({ system: "acs", value: 250 });
  });

  it("n'invente aucun score de performance quand l'API ne le fournit pas", () => {
    expect(matchScoreValue(afterWithout)).toEqual({ system: "performance", value: null });
    expect(afterWithout.segments?.[0]?.stats?.scorePerRound).toBeUndefined();
    expect(calculateMatchRankBadge(afterWithout).label).toBe("—");
    expect(getMatchHighlightBadges(afterWithout).join(" ")).not.toContain("ACS");
  });

  it("utilise le score de performance fourni, sans le diviser par les manches", () => {
    expect(matchScoreValue(afterWith)).toEqual({ system: "performance", value: 310 });
    expect(calculateMatchRankBadge(afterWith).label).toBe("MVP");
  });

  it("agrège séparément ACS et score de performance", () => {
    const groups = groupMatchesByDate([before]);
    expect(groups[0].avgAcs).toBe(250);
    expect(groups[0].avgPerformanceScore).toBeNull();

    const later = groupMatchesByDate([afterWith, afterWithout])[0];
    expect(later.avgPerformanceScore).toBe(310);
    expect(later.avgAcs).toBe(0);
  });
});
