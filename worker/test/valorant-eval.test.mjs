import assert from "node:assert/strict";
import test from "node:test";
import { compactMatch, compactMmr } from "../src/services/valorant-eval.js";

const AGENT = "add6443a-41bd-e414-f6ad-e58d267f4e95";
const WEAPON = "9c82e19d-4575-0200-1a81-3eacf00cf872";

const v3 = {
  metadata: { matchid: "11111111-2222-3333-4444-555555555555", map: "Ascent", mode: "Competitive", queue: "Standard", cluster: "Paris", game_start: 1760000000, game_length: 2100 },
  players: {
    all_players: [
      { puuid: "me", name: "Rub19", tag: "Boss", team: "Blue", character: "Jett", currenttier: 24, party_id: "p1",
        assets: { agent: { small: `https://media.valorant-api.com/agents/${AGENT}/displayicon.png` } },
        stats: { score: 4200, kills: 20, deaths: 5, assists: 4, headshots: 30, bodyshots: 60, legshots: 10 },
        damage_made: 3100, damage_received: 1500, economy: { spent: { overall: 40000 }, loadout_value: { overall: 55000 } } },
      { puuid: "foe", name: "Enemy", tag: "1", team: "Red", character: "Sova", stats: {} }
    ]
  },
  teams: { red: { has_won: false, rounds_won: 2 }, blue: { has_won: true, rounds_won: 13 } },
  rounds: [{ winning_team: "Blue", end_type: "Eliminated", plant_events: { planted_by: { puuid: "me" }, plant_site: "A" },
    player_stats: [{ player_puuid: "me", score: 520, kills: 2, damage: 300, economy: { loadout_value: 800, spent: 800, remaining: 0, weapon: { id: WEAPON } } }] }],
  kills: [{ round: 0, kill_time_in_round: 12000, killer_puuid: "me", victim_puuid: "foe", damage_weapon_id: WEAPON, assistants: [{ assistant_puuid: "x" }] }]
};

test("compactMatch garde ce qu'il faut aux onglets du match", () => {
  const m = compactMatch(v3);
  assert.equal(m.id, v3.metadata.matchid);
  assert.equal(m.startedAt, new Date(1760000000 * 1000).toISOString());
  assert.equal(m.lengthSec, 2100);
  assert.equal(m.cluster, "Paris");
  assert.deepEqual(m.teams.Blue, { won: true, rounds: 13 });
  const me = m.players.find((p) => p.puuid === "me");
  assert.equal(me.agentId, AGENT);
  assert.equal(me.dmg, 3100);
  assert.equal(me.loadout, 55000);
  assert.equal(m.players.find((p) => p.puuid === "foe").team, "Red");
  assert.equal(m.rounds[0].n, 1);
  assert.equal(m.rounds[0].plant, "me");
  assert.equal(m.rounds[0].stats[0].weapon, WEAPON);
  assert.deepEqual(m.kills[0], { r: 1, t: 12000, k: "me", v: "foe", w: WEAPON, a: ["x"] });
});

test("compactMatch rejette un match sans identifiant", () => {
  assert.equal(compactMatch({ metadata: {} }), null);
});

test("compactMmr garde rang, pic et actes joués", () => {
  const mmr = compactMmr({
    current: { tier: { id: 26 }, rr: 319, last_change: 18, leaderboard_placement: { rank: 666 } },
    peak: { tier: { id: 27 }, season: { id: "s-peak" } },
    seasonal: [
      { season: { id: "s1", short: "e9a3" }, wins: 19, games: 25, end_tier: { id: 26 }, end_rr: 300 },
      { season: { id: "s0", short: "e9a2" }, wins: 0, games: 0, end_tier: { id: 0 } }
    ]
  });
  assert.equal(mmr.tier, 26);
  assert.equal(mmr.rr, 319);
  assert.equal(mmr.leaderboardRank, 666);
  assert.equal(mmr.peakTier, 27);
  assert.deepEqual(mmr.seasons.map((s) => [s.season, s.wins, s.games]), [["s1", 19, 25]]);
});
