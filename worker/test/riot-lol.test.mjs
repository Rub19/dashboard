import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { invoke, json, payload, testEnv } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
});

test("Riot LoL account resolution falls back to the next continent when the account isn't found", async () => {
  const attempted = [];
  const env = testEnv({
    __TEST_FETCH__: async (input) => {
      const url = new URL(String(input));
      attempted.push(url.hostname);
      if (url.hostname === "europe.api.riotgames.com") return json({ status: "not found" }, { status: 404 });
      if (url.hostname === "americas.api.riotgames.com") return json({ puuid: "americas-puuid", gameName: "Player", tagLine: "NA1" });
      throw new Error(`Unexpected destination: ${url.href}`);
    }
  });
  const response = await invoke("/api/riot-lol/account?name=Player&tag=NA1", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.deepEqual(attempted, ["europe.api.riotgames.com", "americas.api.riotgames.com"]);
  assert.equal(body.data.puuid, "americas-puuid");
  assert.equal(body.data.continent, "americas");
});

test("Riot LoL account not found on any continent surfaces a not-found error", async () => {
  const env = testEnv({
    __TEST_FETCH__: async () => json({ status: "not found" }, { status: 404 })
  });
  const response = await invoke("/api/riot-lol/account?name=Ghost&tag=NONE", { env });
  const body = await payload(response);
  assert.equal(response.status, 404);
  assert.equal(body.ok, false);
});

test("Riot LoL rank derives the default platform from the account's continent", async () => {
  const requestedHosts = [];
  const env = testEnv({
    __TEST_FETCH__: async (input) => {
      const url = new URL(String(input));
      requestedHosts.push(url.hostname);
      if (url.pathname.includes("/riot/account/v1/")) return json({ puuid: "kr-puuid", gameName: "Faker", tagLine: "KR1" });
      if (url.pathname.includes("/lol/league/v4/")) return json([{ queueType: "RANKED_SOLO_5x5", tier: "CHALLENGER", rank: "I", leaguePoints: 999, wins: 400, losses: 200 }]);
      throw new Error(`Unexpected destination: ${url.href}`);
    }
  });
  const response = await invoke("/api/riot-lol/rank?name=Faker&tag=KR1", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.tier, "CHALLENGER");
  assert.equal(requestedHosts.includes("euw1.api.riotgames.com"), true);
});
