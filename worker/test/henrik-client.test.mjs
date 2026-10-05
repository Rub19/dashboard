import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { getValorantMatches, getValorantPlayerMmr } from "../src/services/henrik-client.js";
import { json, providerFetch, testEnv } from "./helpers.mjs";

beforeEach(() => clearCache());

test("Valorant matches keep a usable Henrik agent URL", async () => {
  const data = await getValorantMatches(testEnv({ __TEST_FETCH__: providerFetch() }), "Player#EUW", "all", "test-key");
  assert.equal(data[0].scoreboard.players[0].assets.agent.small, "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png");
});

test("Valorant matches resolve a missing Henrik agent URL from the catalogue", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.includes("/account/")) return json({ data: { region: "eu" } });
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.startsWith("/valorant/v3/matches")) {
      return json({ data: [{ metadata: { matchid: "m1" }, players: { all_players: [{ name: "Player", tag: "EUW", team: "Red", character: "Jett", assets: { agent: {} }, stats: {} }] }, teams: {} }] });
    }
    if (url.hostname === "valorant-api.com") return json({ data: [{ displayName: "Jett", displayIcon: "https://media.valorant-api.com/agents/jett/displayicon.png" }] });
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const data = await getValorantMatches(testEnv({ __TEST_FETCH__: fetch }), "Player#EUW", "all", "test-key");
  assert.equal(data[0].scoreboard.players[0].assets.agent.small, "https://media.valorant-api.com/agents/jett/displayicon.png");
});

test("Valorant matches return no agent URL when the catalogue is unavailable", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.includes("/account/")) return json({ data: { region: "eu" } });
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.startsWith("/valorant/v3/matches")) {
      return json({ data: [{ metadata: { matchid: "m1" }, players: { all_players: [{ name: "Player", tag: "EUW", team: "Red", character: "Jett", assets: { agent: {} }, stats: {} }] }, teams: {} }] });
    }
    if (url.hostname === "valorant-api.com") return json({ error: "unavailable" }, { status: 503 });
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const data = await getValorantMatches(testEnv({ __TEST_FETCH__: fetch }), "Player#EUW", "all", "test-key");
  assert.equal(data[0].scoreboard.players[0].assets.agent.small, "");
});

test("Valorant match mode is sent as Henrik's mode parameter and filtered defensively", async () => {
  let matchesUrl;
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.includes("/account/")) return json({ data: { region: "eu" } });
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.startsWith("/valorant/v3/matches")) {
      matchesUrl = url;
      return json({
        data: [
          { metadata: { matchid: "swift", mode: "Swift Play" }, players: { all_players: [] }, teams: {} },
          { metadata: { matchid: "unrated", mode: "Unrated" }, players: { all_players: [] }, teams: {} }
        ]
      });
    }
    if (url.hostname === "valorant-api.com") return json({ data: [] });
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const data = await getValorantMatches(testEnv({ __TEST_FETCH__: fetch }), "Player#EUW", "swiftplay", "test-key");
  assert.equal(matchesUrl.searchParams.get("mode"), "swiftplay");
  assert.equal(matchesUrl.searchParams.get("filter"), "swiftplay");
  assert.deepEqual(data.map((match) => match.id), ["swift"]);
});

function partyFetch(players) {
  return async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.includes("/account/")) return json({ data: { region: "eu" } });
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.startsWith("/valorant/v3/matches")) {
      return json({ data: [{ metadata: { matchid: "party", mode: "Unrated" }, players: { all_players: players }, teams: {} }] });
    }
    if (url.hostname === "valorant-api.com") return json({ data: [] });
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
}

test("Valorant matches identify duo party members from party_id", async () => {
  const data = await getValorantMatches(testEnv({
    __TEST_FETCH__: partyFetch([
      { name: "Player", tag: "EUW", team: "Red", party_id: "party-1", stats: {} },
      { name: "Duo", tag: "EUW", team: "Red", party_id: "party-1", stats: {} },
      { name: "Enemy", tag: "EUW", team: "Blue", party_id: "party-2", stats: {} }
    ])
  }), "Player#EUW", "all", "test-key");
  assert.deepEqual(data[0].scoreboard.partyMembers, [{ name: "Duo", tag: "EUW" }]);
  assert.equal(data[0].scoreboard.players[1].isPartyMember, true);
  assert.equal(data[0].scoreboard.players[2].isPartyMember, false);
});

test("Valorant matches leave solo players without party members", async () => {
  const data = await getValorantMatches(testEnv({
    __TEST_FETCH__: partyFetch([
      { name: "Player", tag: "EUW", team: "Red", party_id: "party-1", stats: {} },
      { name: "Enemy", tag: "EUW", team: "Blue", party_id: "party-2", stats: {} }
    ])
  }), "Player#EUW", "all", "test-key");
  assert.deepEqual(data[0].scoreboard.partyMembers, []);
  assert.equal(data[0].scoreboard.players[0].isPartyMember, false);
});

test("Valorant matches leave party membership unset when party_id is absent", async () => {
  const data = await getValorantMatches(testEnv({
    __TEST_FETCH__: partyFetch([
      { name: "Player", tag: "EUW", team: "Red", stats: {} },
      { name: "Ally", tag: "EUW", team: "Red", stats: {} }
    ])
  }), "Player#EUW", "all", "test-key");
  assert.deepEqual(data[0].scoreboard.partyMembers, []);
  assert.equal(data[0].scoreboard.players[1].isPartyMember, false);
});

test("Valorant player MMR returns parsed rank and falls back gracefully", async () => {
  const data = await getValorantPlayerMmr(testEnv({ __TEST_FETCH__: providerFetch() }), "eu", "Player", "EUW", "test-key");
  assert.equal(data, "Gold 1");

  const unratedFetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.startsWith("/valorant/v2/mmr")) return json({ data: { current_data: { currenttierpatched: "Unrated" } } });
    throw new Error(`Unexpected: ${url.href}`);
  };
  const unrated = await getValorantPlayerMmr(testEnv({ __TEST_FETCH__: unratedFetch }), "eu", "Nobody", "0000", "test-key");
  assert.equal(unrated, "Unrated");
});

test("Valorant matches enrich me with real MMR rank and preserve gameVersion", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.includes("/account/")) return json({ data: { region: "eu" } });
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.startsWith("/valorant/v2/mmr")) {
      return json({ data: { current_data: { currenttierpatched: "Diamond 2" } } });
    }
    if (url.hostname === "api.henrikdev.xyz" && url.pathname.startsWith("/valorant/v3/matches")) {
      return json({
        data: [{
          metadata: { matchid: "m_enriched", mode: "Swiftplay", rounds_played: 7, game_version: "release-09.08" },
          players: {
            all_players: [
              { name: "Player", tag: "EUW", team: "Red", currenttier_patched: null, stats: { score: 1400, kills: 7, deaths: 3, assists: 2 } },
              { name: "Opponent", tag: "EUW", team: "Blue", currenttier_patched: null, stats: { score: 1200, kills: 5, deaths: 4, assists: 1 } }
            ]
          },
          teams: { red: { rounds_won: 5, has_won: true }, blue: { rounds_won: 2, has_won: false } }
        }]
      });
    }
    if (url.hostname === "valorant-api.com") return json({ data: [] });
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const data = await getValorantMatches(testEnv({ __TEST_FETCH__: fetch }), "Player#EUW", "all", "test-key");
  assert.equal(data[0].metadata.gameVersion, "release-09.08");
  const me = data[0].scoreboard.players.find(p => p.isMe);
  assert.equal(me.currenttier_patched, "Diamond 2");
  const opponent = data[0].scoreboard.players.find(p => !p.isMe);
  assert.equal(opponent.currenttier_patched, "Unrated");
});

