// Shared Spaces Phase 2 — activity notify relay. This route is a
// fire-and-forget best-effort call: the specific regression to pin down is
// that a bot outage, missing secret, or unlinked space all resolve to
// {notified:false} rather than ever propagating an error to the caller (a
// client just fired this after an already-successful Supabase write).
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache, clearSessionRevocationCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

const OTHER_USER_ID = "b2c3d4e5-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const SPACE_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
  clearSessionRevocationCache();
});

function createStore({ space, members = [], botResponse } = {}) {
  const spacesMap = new Map([[space.id, { ...space }]]);
  const membersMap = new Map(members.map((m) => [m.id, { ...m }]));
  const botCalls = [];

  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method || "GET").toUpperCase();

    if (url.hostname === "bot.ethone.test") {
      botCalls.push({ path: url.pathname, headers: init?.headers, body: init?.body ? JSON.parse(String(init.body)) : null });
      if (botResponse === "error") throw new Error("network unreachable");
      if (botResponse === "500") return new Response("upstream error", { status: 500 });
      return json({ notified: true });
    }

    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });

    if (url.pathname === "/rest/v1/ethone_shared_spaces") {
      const params = new URLSearchParams(url.search);
      const id = params.get("id")?.replace("eq.", "");
      const ownerId = params.get("owner_id")?.replace("eq.", "");
      const row = spacesMap.get(id);
      if (!row || (ownerId && row.owner_id !== ownerId)) return json([]);
      return json([row]);
    }

    if (url.pathname === "/rest/v1/ethone_shared_space_members") {
      const params = new URLSearchParams(url.search);
      const spaceId = params.get("space_id")?.replace("eq.", "");
      const userId = params.get("user_id")?.replace("eq.", "");
      const status = params.get("status")?.replace("eq.", "");
      const rows = [...membersMap.values()].filter(
        (m) => m.space_id === spaceId && m.user_id === userId && (!status || m.status === status)
      );
      return json(rows);
    }

    return json([]);
  };

  return { spacesMap, botCalls, fetchImpl };
}

test("notify: no-op (no error, no bot call) when the space has no Discord link", async () => {
  const { botCalls, fetchImpl } = createStore({ space: { id: SPACE_ID, owner_id: USER_ID, name: "Team" } });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "task", action: "created", title: "Buy milk" })
  });
  assert.equal(res.status, 200);
  const body = (await payload(res)).data;
  assert.equal(body.notified, false);
  assert.equal(botCalls.length, 0);
});

test("notify: no-op when DISCORD_BOT_ORIGIN/secret aren't configured, even for a linked space", async () => {
  const { botCalls, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team", discord_guild_id: "1", discord_channel_id: "2" }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "task", action: "created", title: "Buy milk" })
  });
  assert.equal(res.status, 200);
  assert.equal((await payload(res)).data.notified, false);
  assert.equal(botCalls.length, 0);
});

test("notify: relays the correct header and body to the bot for a linked space", async () => {
  const { botCalls, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team", discord_guild_id: "111", discord_channel_id: "222" }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "note", action: "created", title: "Meeting notes" })
  });
  assert.equal(res.status, 200);
  assert.equal((await payload(res)).data.notified, true);
  assert.equal(botCalls.length, 1);
  assert.equal(botCalls[0].path, "/api/internal/shared-spaces/notify");
  assert.equal(botCalls[0].headers["x-internal-key"], "k".repeat(32));
  assert.equal(botCalls[0].body.guildId, "111");
  assert.equal(botCalls[0].body.channelId, "222");
  assert.equal(botCalls[0].body.kind, "note");
  assert.equal(botCalls[0].body.title, "Meeting notes");
});

test("notify: a network error reaching the bot returns {notified:false}, never an error response", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team", discord_guild_id: "111", discord_channel_id: "222" },
    botResponse: "error"
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "task", action: "completed", title: "Buy milk" })
  });
  assert.equal(res.status, 200);
  assert.equal((await payload(res)).data.notified, false);
});

test("notify: a 5xx from the bot also degrades to {notified:false} rather than surfacing", async () => {
  const { fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team", discord_guild_id: "111", discord_channel_id: "222" },
    botResponse: "500"
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "task", action: "created", title: "Buy milk" })
  });
  assert.equal(res.status, 200);
  assert.equal((await payload(res)).data.notified, false);
});

test("notify: a member (not just the owner) of the space can trigger it", async () => {
  const { botCalls, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: OTHER_USER_ID, name: "Team", discord_guild_id: "111", discord_channel_id: "222" },
    members: [{ id: "m1", space_id: SPACE_ID, user_id: USER_ID, status: "active" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "event", action: "created", title: "Standup" })
  });
  assert.equal(res.status, 200);
  assert.equal((await payload(res)).data.notified, true);
  assert.equal(botCalls.length, 1);
});

test("notify: a caller with no relationship to the space gets 404, and the bot is never called", async () => {
  const { botCalls, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: OTHER_USER_ID, name: "Team", discord_guild_id: "111", discord_channel_id: "222" }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "task", action: "created", title: "Buy milk" })
  });
  assert.equal(res.status, 404);
  assert.equal(botCalls.length, 0);
});

test("notify: an invalid kind/action is rejected before touching the space or the bot", async () => {
  const { botCalls, fetchImpl } = createStore({
    space: { id: SPACE_ID, owner_id: USER_ID, name: "Team", discord_guild_id: "111", discord_channel_id: "222" }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl, DISCORD_BOT_ORIGIN: "https://bot.ethone.test", SHARED_SPACES_BOT_KEY: "k".repeat(32) });

  const res = await invoke("/api/shared-spaces/notify", {
    env, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_ID, kind: "wat", action: "created", title: "x" })
  });
  assert.equal(res.status, 400);
  assert.equal(botCalls.length, 0);
});
