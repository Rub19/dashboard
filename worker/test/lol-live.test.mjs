import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLolLive, normalizeLolTeamObjectives } from "../src/services/riot-client.js";

test("team objectives are read from the current Riot format", () => {
  const info = { teams: [{ teamId: 100, win: true, objectives: { baron: { kills: 1 }, dragon: { kills: 3 }, tower: { kills: 9 }, inhibitor: { kills: 2 }, riftHerald: { kills: 1 } } }, { teamId: 200, win: false, objectives: { tower: { kills: 4 } } }] };
  const result = normalizeLolTeamObjectives(info);
  assert.deepEqual(result.Blue, { won: true, barons: 1, dragons: 3, towers: 9, inhibitors: 2, riftHeralds: 1 });
  assert.equal(result.Red.towers, 4);
  assert.equal(result.Red.won, false);
});

test("a live game keeps players, spells and the keystone", () => {
  const live = normalizeLolLive({
    gameMode: "CLASSIC", gameQueueConfigId: 420, gameStartTime: 1000, gameLength: 60,
    participants: [{ puuid: "me", riotId: "Rub19#Boss", teamId: 100, championId: 157, spell1Id: 4, spell2Id: 14, perks: { perkIds: [8008, 9111], perkSubStyle: 8400 } }, { puuid: "x", riotId: "Bob#EUW", teamId: 200, championId: 103, spell1Id: 4, spell2Id: 7 }],
    bannedChampions: [{ championId: 1, teamId: 100 }],
  }, "me");
  assert.equal(live.active, true);
  assert.deepEqual(live.players.map((player) => [player.name, player.tag, player.team, player.isMe, player.keystone]), [["Rub19", "Boss", "Blue", true, 8008], ["Bob", "EUW", "Red", false, 0]]);
  assert.deepEqual(live.players[0].spells, [4, 14]);
  assert.deepEqual(live.bans[0], { championId: 1, team: "Blue" });
});
