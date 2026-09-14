// Shared Spaces Phase 2 — Discord guild link. Coverage: the permission-bit
// check against the already-stored ethone_user_data (kind=discord) blob
// (owner bit, Administrator bit, Manage Guild bit each individually
// sufficient), a guild missing from that blob is rejected, a non-owner
// caller gets the same 404 the rest of this route family uses to hide
// existence, and unlink (both fields null) needs no permission check at all.
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache, clearSessionRevocationCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

const OTHER_USER_ID = "b2c3d4e5-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const SPACE_ID = "11111111-1111-4111-8111-111111111111";
const GUILD_ID = "123456789012345678";
const CHANNEL_ID = "987654321098765432";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
  clearSessionRevocationCache();
});

function createStore({ space, discordGuilds = null } = {}) {
  const spacesMap = new Map([[space.id, { ...space }]]);

  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method || "GET").toUpperCase();
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });

    if (url.pathname === "/rest/v1/ethone_shared_spaces") {
      const params = new URLSearchParams(url.search);
      if (method === "GET" || method === "PATCH") {
        const id = params.get("id")?.replace("eq.", "");
        const ownerId = params.get("owner_id")?.replace("eq.", "");
        const row = spacesMap.get(id);
        if (!row || (ownerId && row.owner_id !== ownerId)) return json([]);
        if (method === "PATCH") {
          const body = JSON.parse(String(init.body || "{}"));
          Object.assign(row, body);
        }
        return json([row]);
      }
    }

    if (url.pathname === "/rest/v1/ethone_user_data") {
      if (discordGuilds === null) return json([]);
      return json([{ id: "row-1", user_id: USER_ID, kind: "discord", slug: "discord-oauth", data: { guilds: discordGuilds } }]);
    }

    return json([]);
  };

  return { spacesMap, fetchImpl };
}

test("Discord link: owner with the Administrator bit can link a guild", async () => {
  const { spacesMap, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" },
    discordGuilds: [{ id: GUILD_ID, name: "My Server", owner: false, permissions: "8" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 200);
  const body = (await payload(res)).data;
  assert.equal(body.discord_guild_id, GUILD_ID);
  assert.equal(body.discord_channel_id, CHANNEL_ID);
  assert.equal(spacesMap.get(SPACE_ID).discord_guild_id, GUILD_ID);
});

test("Discord link: the Manage Guild bit alone is also sufficient", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" },
    discordGuilds: [{ id: GUILD_ID, name: "My Server", owner: false, permissions: "32" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 200);
});

test("Discord link: guild owner flag is sufficient even with no permission bits set", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" },
    discordGuilds: [{ id: GUILD_ID, name: "My Server", owner: true, permissions: "0" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 200);
});

test("Discord link: a plain member permission bit (no admin/manage-guild) is rejected", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" },
    discordGuilds: [{ id: GUILD_ID, name: "My Server", owner: false, permissions: "1024" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 403);
});

test("Discord link: a guild missing from the caller's stored OAuth blob is rejected", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" },
    discordGuilds: [{ id: "999999999999999999", name: "Other Server", owner: true, permissions: "0" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 403);
});

test("Discord link: no stored Discord connection at all is rejected, not a 500", async () => {
  const { fetchImpl } = createStore({ space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" }, discordGuilds: null });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 403);
});

test("Discord link: a non-owner caller gets the same 404 used elsewhere to hide space existence", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" },
    discordGuilds: [{ id: GUILD_ID, name: "My Server", owner: true, permissions: "0" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "other@example.com" });

  const res = await invoke("/api/shared-spaces", {
    env, token: tokenB, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 404);
});

test("Discord link: unlinking (both fields null) needs no permission check", async () => {
  const { spacesMap, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team", discord_guild_id: GUILD_ID, discord_channel_id: CHANNEL_ID },
    discordGuilds: null
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: null, discord_channel_id: null })
  });
  assert.equal(res.status, 200);
  assert.equal(spacesMap.get(SPACE_ID).discord_guild_id, null);
});

test("Discord link: mismatched null (one set, one missing) is rejected as invalid", async () => {
  const { fetchImpl } = createStore({ space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" }, discordGuilds: null });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: GUILD_ID, discord_channel_id: null })
  });
  assert.equal(res.status, 400);
});

test("Discord link: a malformed guild id is rejected before any permission check", async () => {
  const { fetchImpl } = createStore({ space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" }, discordGuilds: null });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces", {
    env, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_ID, discord_guild_id: "not-a-snowflake", discord_channel_id: CHANNEL_ID })
  });
  assert.equal(res.status, 400);
});
