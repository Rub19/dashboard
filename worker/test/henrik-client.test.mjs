import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { getValorantMatches } from "../src/services/henrik-client.js";
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
