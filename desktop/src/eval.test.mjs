import assert from "node:assert/strict";
import test from "node:test";
import { lastSession, matchSummary, modeName, rankName, scoreboard, splitRiotId, statsFor } from "./eval.ts";

const player = (puuid, team, score, extra = {}) => ({ puuid, name: puuid, tag: "EUW", team, agent: "Jett", agentId: "a", tier: 12, card: "", level: 1, party: "", score, kills: 10, deaths: 5, assists: 2, hs: 5, bs: 4, ls: 1, dmg: 2000, ...extra });
const match = (id, startedAt, red, blue, players) => ({ id, map: "Ascent", mapId: "m", mode: "Competitive", queue: "competitive", startedAt, lengthSec: 1800, teams: { Red: { won: red > blue, rounds: red }, Blue: { won: blue > red, rounds: blue } }, players });

test("le résumé suit l'équipe du joueur", () => {
  const game = match("1", "2026-11-02T20:00:00Z", 8, 13, [player("me", "Blue", 6000), player("ally", "Blue", 5000), player("foe", "Red", 7000)]);
  const summary = matchSummary(game, "me");
  assert.equal(summary.won, true);
  assert.deepEqual(summary.score, [13, 8]);
  assert.equal(summary.mvp, "team");
  assert.equal(summary.acs, 286);
  assert.equal(summary.hs, 50);
  assert.equal(matchSummary(game, "absent"), null);
});

test("le MVP du match prime sur celui de l'équipe", () => {
  const game = match("1", null, 13, 8, [player("me", "Red", 9000), player("foe", "Blue", 7000)]);
  assert.equal(matchSummary(game, "me").mvp, "match");
});

test("les statistiques additionnent les vrais matchs", () => {
  const games = [match("1", null, 13, 8, [player("me", "Red", 1)]), match("2", null, 8, 13, [player("me", "Red", 1)]), match("3", null, 12, 12, [player("me", "Red", 1)])];
  const stats = statsFor(games, "me");
  assert.equal(stats.count, 3);
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 1);
  assert.equal(stats.kd, 2);
  assert.equal(statsFor([], "me").count, 0);
});

test("une session s'arrête après trois heures de pause", () => {
  const games = [match("1", "2026-11-02T20:00:00Z", 1, 0, []), match("2", "2026-11-02T18:00:00Z", 1, 0, []), match("3", "2026-11-02T10:00:00Z", 1, 0, [])];
  assert.deepEqual(lastSession(games).map(({ id }) => id), ["1", "2"]);
});

test("le tableau affiche l'équipe du joueur en premier, triée par score", () => {
  const game = match("1", null, 1, 2, [player("foe", "Red", 9), player("low", "Blue", 1), player("me", "Blue", 5)]);
  const [first, second] = scoreboard(game, "me");
  assert.equal(first.team, "Blue");
  assert.deepEqual(first.players.map(({ puuid }) => puuid), ["me", "low"]);
  assert.equal(second.team, "Red");
});

test("noms et identifiants Riot", () => {
  assert.equal(rankName(27), "Radiant");
  assert.equal(rankName(0), "Non classé");
  assert.equal(modeName("Team Deathmatch"), "Combat en équipe");
  assert.deepEqual(splitRiotId(" Rub # EUW "), { name: "Rub", tag: "EUW" });
  assert.equal(splitRiotId("Rub"), null);
  assert.equal(splitRiotId("a#b#c"), null);
});
