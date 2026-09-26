import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { getLolRotation, getValorantFeaturedStore } from "../src/services/game-store-client.js";
import { json, testEnv } from "./helpers.mjs";

beforeEach(() => clearCache());

test("Valorant featured store: bundles enriched with the public catalogue, no invented data", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz" && url.pathname === "/valorant/v2/store-featured") {
      return json({
        data: [
          {
            bundle_uuid: "35815CAB-429D-79E4-43F5-E0AF8FDAC22B",
            bundle_price: 7100,
            whole_sale_only: false,
            expires_at: "2026-10-05T12:00:00.000Z",
            items: [{ name: "RGX 11z Pro Vandal", type: "skin", base_price: 2175, discounted_price: 1740, discount_percent: 0.2, image: "https://media.valorant-api.com/x.png" }]
          }
        ]
      });
    }
    if (url.hostname === "valorant-api.com") {
      return json({ data: [{ uuid: "35815cab-429d-79e4-43f5-e0af8fdac22b", displayName: "RGX 11z Pro", displayIcon: "https://media.valorant-api.com/bundles/a/displayicon.png" }] });
    }
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const bundles = await getValorantFeaturedStore(testEnv({ __TEST_FETCH__: fetch }), "test-key");
  assert.equal(bundles.length, 1);
  assert.equal(bundles[0].name, "RGX 11z Pro");
  assert.equal(bundles[0].price, 7100);
  assert.equal(bundles[0].expiresAt, "2026-10-05T12:00:00.000Z");
  assert.equal(bundles[0].items[0].discountPercent, 20);
  assert.equal(bundles[0].items[0].price, 1740);
});

test("Valorant featured store: catalogue unavailable keeps a generic name and still answers", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "api.henrikdev.xyz") return json({ data: [{ bundle_uuid: "abc", bundle_price: 100, items: [] }] });
    return json({ error: "down" }, { status: 503 });
  };
  const bundles = await getValorantFeaturedStore(testEnv({ __TEST_FETCH__: fetch }), "test-key");
  assert.equal(bundles[0].name, "Bundle");
  assert.equal(bundles[0].image, "");
});

test("LoL rotation: champion ids resolved with Data Dragon names and icons", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "euw1.api.riotgames.com") return json({ freeChampionIds: [266, 103], freeChampionIdsForNewPlayers: [266], maxNewPlayerLevel: 10 });
    if (url.pathname === "/api/versions.json") return json(["16.19.1", "16.18.1"]);
    if (url.pathname.endsWith("/champion.json")) {
      return json({ data: { Aatrox: { key: "266", id: "Aatrox", name: "Aatrox", title: "Épée des Darkin" }, Ahri: { key: "103", id: "Ahri", name: "Ahri", title: "Renarde à neuf queues" } } });
    }
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const rotation = await getLolRotation(testEnv({ __TEST_FETCH__: fetch }), "euw1", "test-key");
  assert.equal(rotation.gameVersion, "16.19.1");
  assert.deepEqual(rotation.free.map((c) => c.name), ["Aatrox", "Ahri"]);
  assert.equal(rotation.free[0].icon, "https://ddragon.leagueoflegends.com/cdn/16.19.1/img/champion/Aatrox.png");
  assert.equal(rotation.freeForNewPlayers.length, 1);
  assert.equal(rotation.maxNewPlayerLevel, 10);
});

test("LoL rotation also reads the { sr, newplayer } response shape", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "euw1.api.riotgames.com") return json({ sr: [266, 103], newplayer: [103] });
    if (url.pathname === "/api/versions.json") return json(["16.19.1"]);
    if (url.pathname.endsWith("/champion.json")) {
      return json({ data: { Aatrox: { key: "266", id: "Aatrox", name: "Aatrox", title: "" }, Ahri: { key: "103", id: "Ahri", name: "Ahri", title: "" } } });
    }
    throw new Error(`Unexpected test destination: ${url.href}`);
  };
  const rotation = await getLolRotation(testEnv({ __TEST_FETCH__: fetch }), "euw1", "test-key");
  assert.deepEqual(rotation.free.map((c) => c.name), ["Aatrox", "Ahri"]);
  assert.deepEqual(rotation.freeForNewPlayers.map((c) => c.name), ["Ahri"]);
});

test("LoL rotation fails loudly (not empty) when the upstream shape is unknown", async () => {
  const fetch = async (input) => {
    const url = new URL(String(input));
    if (url.hostname === "euw1.api.riotgames.com") return json({ other: 1 });
    if (url.pathname === "/api/versions.json") return json(["16.19.1"]);
    return json({ data: {} });
  };
  await assert.rejects(() => getLolRotation(testEnv({ __TEST_FETCH__: fetch }), "euw1", "test-key"));
});

test("LoL rotation refuses an unknown region", async () => {
  await assert.rejects(() => getLolRotation(testEnv({ __TEST_FETCH__: async () => json({}) }), "evil.example", "k"));
});
