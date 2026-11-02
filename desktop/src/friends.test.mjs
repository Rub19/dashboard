import assert from "node:assert/strict";
import test from "node:test";
import { boardOf, lastOnlineTime, lastSeenText, presenceKind } from "./friends.ts";

const friend = (over) => ({ id: over.name, name: "x", tag: "EUW", online: true, show: "chat", product: "valorant", state: "MENUS", queue: "", tier: 0, partySize: 1, partyMax: 5, partyId: "", partyState: "", allyScore: 0, enemyScore: 0, map: "", idle: false, playing: false, icon: "", card: "", title: "", lastOnline: "", ...over });

test("friends sort into parties, solo players, other games and offline", () => {
  const board = boardOf([
    friend({ name: "a", partyId: "p", partySize: 3, state: "INGAME" }),
    friend({ name: "b", partyId: "p", partySize: 3, state: "INGAME" }),
    friend({ name: "solo" }),
    friend({ name: "lol", product: "league_of_legends", playing: true }),
    friend({ name: "client", product: "" }),
    friend({ name: "old", online: false, lastOnline: "1000000000000" }),
    friend({ name: "recent", online: false, lastOnline: "1700000000000" }),
  ]);
  assert.deepEqual(board.parties.map((party) => [party.members.length, party.others, party.size]), [[2, 1, 3]]);
  assert.deepEqual(board.valorant.map((row) => row.name), ["solo"]);
  assert.deepEqual(board.platforms.map((group) => group.name), ["League of Legends", "Riot Client"]);
  assert.deepEqual(board.offline.map((row) => row.name), ["recent", "old"]);
});

test("search filters on the full Riot ID", () => {
  assert.deepEqual(boardOf([friend({ name: "Jett", tag: "AAA" }), friend({ name: "Sage" })], "jett#a").valorant.map((row) => row.name), ["Jett"]);
});

test("status follows what the player is doing", () => {
  assert.equal(presenceKind(friend({ state: "INGAME" })), "busy");
  assert.equal(presenceKind(friend({ idle: true })), "away");
  assert.equal(presenceKind(friend({ show: "away", product: "" })), "away");
  assert.equal(presenceKind(friend({})), "online");
  assert.equal(presenceKind(friend({ online: false })), "offline");
});

test("last connection reads every format Riot sends", () => {
  const now = lastOnlineTime("2026-11-02 22:00:00.000");
  assert.equal(now, Date.UTC(2026, 10, 2, 22));
  assert.equal(lastOnlineTime("1793656800"), 1793656800000);
  assert.equal(lastSeenText("", now), "Hors ligne");
  assert.equal(lastSeenText(String(now - 30000), now), "Dernière connexion à l'instant");
  assert.equal(lastSeenText(String(now - 68 * 60000), now), "Dernière connexion il y a 1 heure et 8 minutes");
  assert.equal(lastSeenText(String(now - 2 * 86400000), now), "Dernière connexion il y a 2 jours");
});
