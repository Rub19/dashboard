import assert from "node:assert/strict";
import test from "node:test";
import { agentPortrait, lastSession, matchAnalysis, matchSummary, modeName, rankName, roundsFor, scoreboard, splitRiotId, statsFor } from "./eval.ts";

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

test("les cartes de match utilisent le portrait complet de l'agent", () => {
  assert.equal(agentPortrait("agent-id"), "https://media.valorant-api.com/agents/agent-id/fullportraitv2.png");
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

test("les manches comptent les éliminations du joueur", () => {
  const game = { ...match("1", null, 1, 0, [player("me", "Red", 1), player("foe", "Blue", 1)]), rounds: [{ n: 0, winner: "Red", end: "Eliminated", plant: "", site: "", defuse: "" }, { n: 1, winner: "Blue", end: "Bomb", plant: "foe", site: "A", defuse: "" }], kills: [{ r: 0, t: 1, k: "me", v: "foe", w: "x", a: [] }, { r: 1, t: 2, k: "foe", v: "me", w: "x", a: [] }] };
  const [first, second] = roundsFor(game, "me");
  assert.deepEqual([first.won, first.kills, first.died], [true, 1, false]);
  assert.deepEqual([second.won, second.kills, second.died], [false, 0, true]);
  assert.deepEqual(roundsFor({ ...game, rounds: undefined }, "me"), []);
});

test("l'analyse calcule le KAST et les premières éliminations", () => {
  const game = { ...match("1", null, 2, 1, [player("me", "Red", 1), player("ally", "Red", 1), player("foe", "Blue", 1)]), rounds: [{ n: 1, winner: "Red", end: "", plant: "me", site: "A", defuse: "" }, { n: 2, winner: "Blue", end: "", plant: "", site: "", defuse: "" }, { n: 3, winner: "Red", end: "", plant: "", site: "", defuse: "me" }], kills: [{ r: 1, t: 10, k: "me", v: "foe", w: "", a: [] }, { r: 2, t: 10, k: "foe", v: "me", w: "", a: [] }, { r: 3, t: 10, k: "foe", v: "me", w: "", a: [] }, { r: 3, t: 3000, k: "ally", v: "foe", w: "", a: [] }] };
  assert.deepEqual(matchAnalysis(game, "me"), { kast: 67, firstKills: 1, firstDeaths: 2, plants: 1, defuses: 1 });
  assert.equal(matchAnalysis({ ...game, rounds: [] }, "me").kast, 0);
});

test("noms et identifiants Riot", () => {
  assert.equal(rankName(27), "Radiant");
  assert.equal(rankName(0), "Non classé");
  assert.equal(modeName("Team Deathmatch"), "Combat en équipe");
  assert.deepEqual(splitRiotId(" Rub # EUW "), { name: "Rub", tag: "EUW" });
  assert.equal(splitRiotId("Rub"), null);
  assert.equal(splitRiotId("a#b#c"), null);
});
