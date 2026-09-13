import { groupTftMatchesByDate } from "./useGamingAnalytics";
import type { TftMatch } from "../tft-tracker";

function tftMatch(overrides: { placement: number; playedAt: string }): TftMatch {
  return {
    id: "m1",
    mode: "Ranked",
    setNumber: 13,
    playedAt: overrides.playedAt,
    durationSeconds: 1800,
    me: { placement: overrides.placement, level: 8, playersEliminated: 0, damage: 100, goldLeft: 0, lastRound: 30, traits: [], units: [] },
    players: [],
  };
}

describe("groupTftMatchesByDate", () => {
  it("groups by day and computes top-4 rate and average placement", () => {
    const matches = [
      tftMatch({ placement: 1, playedAt: "2026-09-01T10:00:00.000Z" }),
      tftMatch({ placement: 8, playedAt: "2026-09-01T14:00:00.000Z" }),
      tftMatch({ placement: 3, playedAt: "2026-09-02T09:00:00.000Z" }),
    ];
    const groups = groupTftMatchesByDate(matches);
    expect(groups).toHaveLength(2);
    // sorted most-recent day first
    expect(groups[0].rawDate).toBe("2026-09-02");
    expect(groups[0]).toMatchObject({ count: 1, top4: 1, avgPlacement: 3 });
    expect(groups[1]).toMatchObject({ count: 2, top4: 1, avgPlacement: 4.5 });
  });

  it("returns an empty array for no matches", () => {
    expect(groupTftMatchesByDate([])).toEqual([]);
  });
});
