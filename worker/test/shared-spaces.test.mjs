// Shared Spaces — functional coverage for the real invite -> accept -> revoke
// primitive. Each test exercises the route end-to-end through invoke() against
// an in-memory fake of the three new tables, keyed off the exact PostgREST
// filters the route sends (not just "the mock returns something plausible").
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache, clearSessionRevocationCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

const OTHER_USER_ID = "b2c3d4e5-6f70-4a1b-9c2d-3e4f5a6b7c8d";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
  clearSessionRevocationCache();
});

function parseEqFilters(search) {
  const params = new URLSearchParams(search);
  const filters = {};
  for (const [key, value] of params.entries()) {
    if (key === "select" || key === "order") continue;
    if (value.startsWith("eq.")) filters[key] = value.slice(3);
    if (value.startsWith("in.(") && value.endsWith(")")) filters[`${key}__in`] = value.slice(4, -1).split(",");
  }
  return filters;
}

function matchesFilters(row, filters) {
  for (const [key, expected] of Object.entries(filters)) {
    if (key.endsWith("__in")) {
      const field = key.slice(0, -4);
      if (!expected.includes(String(row[field]))) return false;
    } else if (String(row[key] ?? "") !== expected) {
      return false;
    }
  }
  return true;
}

function createSharedSpacesStore({ spaces = [], members = [] } = {}) {
  const spacesMap = new Map(spaces.map((s) => [s.id, { ...s }]));
  const membersMap = new Map(members.map((m) => [m.id, { ...m }]));
  const emailsSent = [];
  const calls = [];

  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method || "GET").toUpperCase();

    if (url.hostname === "api.resend.com") {
      emailsSent.push(JSON.parse(String(init.body || "{}")));
      return json({ id: "email-1" });
    }

    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    calls.push({ method, path: url.pathname, search: url.search });

    if (url.pathname === "/rest/v1/ethone_shared_spaces") {
      const filters = parseEqFilters(url.search);
      if (method === "GET") return json([...spacesMap.values()].filter((s) => matchesFilters(s, filters)));
      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...body };
        spacesMap.set(row.id, row);
        return json([row]);
      }
      if (method === "DELETE") {
        const targets = [...spacesMap.values()].filter((s) => matchesFilters(s, filters));
        targets.forEach((s) => spacesMap.delete(s.id));
        return json(targets);
      }
    }

    if (url.pathname === "/rest/v1/ethone_shared_space_members") {
      const filters = parseEqFilters(url.search);
      if (method === "GET") return json([...membersMap.values()].filter((m) => matchesFilters(m, filters)));
      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = {
          id: crypto.randomUUID(),
          role: "member",
          status: "pending",
          user_id: null,
          invite_token_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          invited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          accepted_at: null,
          ...body
        };
        membersMap.set(row.id, row);
        return json([row]);
      }
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...membersMap.values()].filter((m) => matchesFilters(m, filters));
        targets.forEach((m) => Object.assign(m, body));
        return json(targets);
      }
      if (method === "DELETE") {
        const targets = [...membersMap.values()].filter((m) => matchesFilters(m, filters));
        targets.forEach((m) => membersMap.delete(m.id));
        return json(targets);
      }
    }

    return json([]);
  };

  return { spacesMap, membersMap, emailsSent, calls, fetchImpl };
}

test("shared-spaces: owner creates a space, invites a real member by email, and a real invite email is sent", async () => {
  const { spacesMap, emailsSent, fetchImpl } = createSharedSpacesStore();
  const env = testEnv({ __TEST_FETCH__: fetchImpl, RESEND_API_KEY: "resend-key", RESEND_FROM: "ETHONE <no-reply@ethone.dev>" });
  const token = await accessToken({ sub: USER_ID, email: "owner@ethone.dev" });

  const createRes = await invoke("/api/shared-spaces", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Liste de courses" })
  });
  assert.equal(createRes.status, 200);
  const created = (await payload(createRes)).data;
  assert.equal(created.name, "Liste de courses");
  assert.equal(created.owner_id, USER_ID);
  assert.equal(spacesMap.size, 1);

  const inviteRes = await invoke("/api/shared-spaces/members", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: created.id, email: "friend@example.com" })
  });
  assert.equal(inviteRes.status, 200);
  const inviteBody = (await payload(inviteRes)).data;
  assert.equal(inviteBody.sent, true);
  assert.equal(inviteBody.member.status, "pending");
  assert.match(inviteBody.member.invite_token, /^[0-9a-f]{48}$/);

  assert.equal(emailsSent.length, 1);
  assert.equal(emailsSent[0].to, "friend@example.com");
  assert.match(emailsSent[0].text, /\/spaces\/join\?token=[0-9a-f]{48}/);
});

test("shared-spaces: invitee accepts with a matching email and becomes a real active member", async () => {
  const spaceId = "11111111-1111-4111-8111-111111111111";
  const { membersMap, fetchImpl } = createSharedSpacesStore({
    spaces: [{ id: spaceId, owner_id: USER_ID, name: "Family calendar" }],
    members: [{
      id: "22222222-2222-4222-8222-222222222222", space_id: spaceId, invited_email: "friend@example.com",
      user_id: null, status: "pending", invite_token: "a".repeat(48),
      invite_token_expires_at: new Date(Date.now() + 86400000).toISOString(), invited_by: USER_ID
    }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "friend@example.com" });

  const res = await invoke("/api/shared-spaces/join/accept", {
    env, token: tokenB, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "a".repeat(48) })
  });
  assert.equal(res.status, 200);
  const body = (await payload(res)).data;
  assert.equal(body.accepted, true);
  assert.equal(body.member.status, "active");
  assert.equal(body.member.user_id, OTHER_USER_ID);
  assert.equal(membersMap.get("22222222-2222-4222-8222-222222222222").user_id, OTHER_USER_ID);
});

test("shared-spaces: decline sets status to declined without linking a user_id", async () => {
  const spaceId = "11111111-1111-4111-8111-111111111111";
  const { membersMap, fetchImpl } = createSharedSpacesStore({
    spaces: [{ id: spaceId, owner_id: USER_ID, name: "Family calendar" }],
    members: [{
      id: "22222222-2222-4222-8222-222222222222", space_id: spaceId, invited_email: "friend@example.com",
      user_id: null, status: "pending", invite_token: "b".repeat(48),
      invite_token_expires_at: new Date(Date.now() + 86400000).toISOString(), invited_by: USER_ID
    }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "friend@example.com" });

  const res = await invoke("/api/shared-spaces/join/decline", {
    env, token: tokenB, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "b".repeat(48) })
  });
  assert.equal(res.status, 200);
  assert.equal(membersMap.get("22222222-2222-4222-8222-222222222222").status, "declined");
  assert.equal(membersMap.get("22222222-2222-4222-8222-222222222222").user_id, null);
});

test("shared-spaces: owner can revoke an active member, cutting their access", async () => {
  const spaceId = "11111111-1111-4111-8111-111111111111";
  const { membersMap, fetchImpl } = createSharedSpacesStore({
    spaces: [{ id: spaceId, owner_id: USER_ID, name: "Family calendar" }],
    members: [{ id: "22222222-2222-4222-8222-222222222222", space_id: spaceId, invited_email: "friend@example.com", user_id: OTHER_USER_ID, status: "active", invite_token: "c".repeat(48), invited_by: USER_ID }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID, email: "owner@ethone.dev" });

  const res = await invoke("/api/shared-spaces/members", {
    env, token: tokenA, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "22222222-2222-4222-8222-222222222222", status: "revoked" })
  });
  assert.equal(res.status, 200);
  assert.equal(membersMap.get("22222222-2222-4222-8222-222222222222").status, "revoked");
});

test("shared-spaces: join/resolve is public and never exposes the raw member row", async () => {
  const spaceId = "11111111-1111-4111-8111-111111111111";
  const { fetchImpl } = createSharedSpacesStore({
    spaces: [{ id: spaceId, owner_id: USER_ID, name: "Family calendar" }],
    members: [{ id: "22222222-2222-4222-8222-222222222222", space_id: spaceId, invited_email: "friend@example.com", user_id: null, status: "pending", invite_token: "d".repeat(48), invite_token_expires_at: new Date(Date.now() + 86400000).toISOString(), invited_by: USER_ID }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const res = await invoke(`/api/shared-spaces/join?token=${"d".repeat(48)}`, { env, auth: false });
  assert.equal(res.status, 200);
  const body = (await payload(res)).data;
  assert.equal(body.spaceName, "Family calendar");
  assert.equal(body.invitedEmail, "friend@example.com");
  assert.equal(body.expired, false);
  assert.equal(body.user_id, undefined);
  assert.equal(body.invite_token, undefined);
  assert.equal(body.invited_by, undefined);
});

test("shared-spaces: expired invite is rejected on accept", async () => {
  const spaceId = "11111111-1111-4111-8111-111111111111";
  const { fetchImpl } = createSharedSpacesStore({
    spaces: [{ id: spaceId, owner_id: USER_ID, name: "Family calendar" }],
    members: [{
      id: "22222222-2222-4222-8222-222222222222", space_id: spaceId, invited_email: "friend@example.com",
      user_id: null, status: "pending", invite_token: "e".repeat(48),
      invite_token_expires_at: new Date(Date.now() - 1000).toISOString(), invited_by: USER_ID
    }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "friend@example.com" });

  const res = await invoke("/api/shared-spaces/join/accept", {
    env, token: tokenB, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "e".repeat(48) })
  });
  assert.equal(res.status, 410);
});
