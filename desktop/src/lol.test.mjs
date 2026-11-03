import assert from "node:assert/strict";
import test from "node:test";
import { addLpPoint, lpScore, parseLolAssets } from "./lol.ts";

test("spells, runes and champions are found by their identifier", () => {
  const assets = parseLolAssets(
    { version: "1.2.3", data: { SummonerFlash: { key: "4", name: "Saut", image: { full: "SummonerFlash.png" } } } },
    [{ id: 8000, name: "Précision", icon: "p.png", slots: [{ runes: [{ id: 8008, name: "Tempo", icon: "t.png" }] }] }],
    { version: "1.2.3", data: { Yone: { key: "777", name: "Yone", image: { full: "Yone.png" } } } },
  );
  assert.equal(assets.spells["4"].image, "https://ddragon.leagueoflegends.com/cdn/1.2.3/img/spell/SummonerFlash.png");
  assert.equal(assets.runes["8008"].name, "Tempo");
  assert.equal(assets.runes["8000"].image, "https://ddragon.leagueoflegends.com/cdn/img/p.png");
  assert.equal(assets.champions["777"].name, "Yone");
});

test("the LP history only keeps real changes", () => {
  assert.equal(lpScore("BRONZE I (52 LP)"), 752);
  assert.equal(lpScore("IRON IV (0 LP)"), 0);
  assert.equal(lpScore("MASTER (10 LP)"), 2810);
  assert.equal(lpScore("Non classé"), null);
  let points = addLpPoint([], "BRONZE I (52 LP)", 1);
  points = addLpPoint(points, "BRONZE I (52 LP)", 2);
  assert.equal(points.length, 1);
  points = addLpPoint(points, "BRONZE I (70 LP)", 3);
  assert.equal(points.at(-1).score, 770);
  assert.equal(addLpPoint(points, undefined, 4).length, 2);
});
import { championSplash, lolLine, lolMode, lolRank, lolSession, lolStats, lolTeams, topChampions } from "./lol.ts";

const stats = (kills, deaths, assists) => ({ kills, deaths, assists, kda: 0, cs: 100, csPerMin: 6, damage: 1000, damagePerMin: 500, gold: 1000, goldPerMin: 300 });
const match = (id, result, at, champion = "Yone", mode = "Ranked Solo", line = stats(4, 2, 6)) => ({
  id,
  metadata: { agentName: champion, agentImageUrl: `https://x/cdn/16.15.1/img/champion/${champion}.png`, modeName: mode, result, score: { team: 7, opponent: 21 }, timestamp: at },
  scoreboard: { duration: 960, players: [{ isMe: true, team: "Blue", win: result === "Victory", stats: line, items: [{ image: "a.png" }, { image: "" }] }, { team: "Red", win: result !== "Victory", stats: stats(9, 1, 1) }] },
});

test("le rang se lit avec ou sans division", () => {
  assert.deepEqual({ name: lolRank("BRONZE I (52 LP)").name, lp: lolRank("BRONZE I (52 LP)").lp }, { name: "Bronze I", lp: 52 });
  assert.equal(lolRank("MASTER (120 LP)").name, "Maître");
  assert.equal(lolRank("MASTER (120 LP)").lp, 120);
  assert.equal(lolRank(undefined).name, "Non classé");
  assert.equal(lolRank("").emblem, "");
});

test("une ligne de match résume le joueur et ignore les objets vides", () => {
  const line = lolLine(match("a", "Victory", "2026-11-02T21:00:00Z"));
  assert.equal(line.won, true);
  assert.equal(line.kda, 5);
  assert.equal(line.items.length, 1);
  assert.equal(line.minutes, 16);
  assert.deepEqual(line.score, [7, 21]);
});

test("une ligne sans tableau lit les statistiques du segment", () => {
  const line = lolLine({ id: "x", metadata: { result: "Defeat" }, segments: [{ stats: { kills: { value: 3 }, deaths: { value: 0 }, assists: { value: 1 } } }] });
  assert.equal(line.kills, 3);
  assert.equal(line.kda, 4);
});

test("le résumé exclut les parties personnalisées", () => {
  const result = lolStats([match("a", "Victory", "2026-11-02T21:00:00Z"), match("b", "Defeat", "2026-11-02T20:00:00Z"), match("c", "Victory", "2026-11-02T19:00:00Z", "Ahri", "Custom")]);
  assert.equal(result.count, 2);
  assert.equal(result.winRate, 50);
  assert.equal(result.kda, 5);
});

test("la session s'arrête après deux heures de pause", () => {
  const session = lolSession([match("a", "Victory", "2026-11-02T21:00:00Z"), match("b", "Defeat", "2026-11-02T20:00:00Z"), match("c", "Victory", "2026-11-02T10:00:00Z")]);
  assert.deepEqual(session.map((row) => row.id), ["a", "b"]);
});

test("les champions les plus joués passent en premier, même en personnalisée", () => {
  const top = topChampions([match("a", "Victory", "2026-11-02T21:00:00Z"), match("b", "Victory", "2026-11-02T20:00:00Z"), match("c", "Victory", "2026-11-02T19:00:00Z", "Ahri", "Custom")]);
  assert.deepEqual(top.map((row) => [row.name, row.games, row.winRate]), [["Yone", 2, 100], ["Ahri", 1, 100]]);
});

test("mon équipe arrive en premier dans le tableau", () => {
  const teams = lolTeams(match("a", "Defeat", "2026-11-02T21:00:00Z"));
  assert.deepEqual(teams.map((team) => [team.team, team.won, team.kills]), [["Blue", false, 4], ["Red", true, 9]]);
});

test("le mode et l'illustration du champion", () => {
  assert.equal(lolMode("Ranked Solo"), "Classée Solo");
  assert.equal(lolMode("ARAM"), "ARAM");
  assert.equal(championSplash("https://x/cdn/16.15.1/img/champion/Yone.png"), "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yone_0.jpg");
  assert.equal(championSplash(""), "");
});
