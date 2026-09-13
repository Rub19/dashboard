// Shared Spaces — IDOR/BOLA pass, mirroring idor-bola.test.mjs's two-identity
// style: every test exercises the route through invoke() end-to-end and
// inspects the store's actual state afterward, never just "the mock returned
// something plausible".
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache, clearSessionRevocationCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

const OTHER_USER_ID = "b2c3d4e5-6f70-4a1b-9c2d-3e4f5a6b7c8d";
const THIRD_USER_ID = "c3d4e5f6-7081-4a1b-9c2d-3e4f5a6b7c8e";

const SPACE_A = "11111111-1111-4111-8111-111111111111";
const SPACE_B = "44444444-4444-4444-8444-444444444444";
const MEMBER_ID = "22222222-2222-4222-8222-222222222222";

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
  }
  return filters;
}

function matchesFilters(row, filters) {
  for (const [key, expected] of Object.entries(filters)) {
    if (String(row[key] ?? "") !== expected) return false;
  }
  return true;
}

function createStore({ spaces = [], members = [] } = {}) {
  const spacesMap = new Map(spaces.map((s) => [s.id, { ...s }]));
  const membersMap = new Map(members.map((m) => [m.id, { ...m }]));
  const calls = [];

  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    const method = (init?.method || "GET").toUpperCase();
    if (url.hostname === "api.resend.com") return json({ id: "email-1" });
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    calls.push({ method, path: url.pathname, search: url.search });

    if (url.pathname === "/rest/v1/ethone_shared_spaces") {
      const filters = parseEqFilters(url.search);
      if (method === "GET") return json([...spacesMap.values()].filter((s) => matchesFilters(s, filters)));
      if (method === "DELETE") {
        const targets = [...spacesMap.values()].filter((s) => matchesFilters(s, filters));
        targets.forEach((s) => spacesMap.delete(s.id));
        return json(targets);
      }
    }

    if (url.pathname === "/rest/v1/ethone_shared_space_members") {
      const filters = parseEqFilters(url.search);
      if (method === "GET") return json([...membersMap.values()].filter((m) => matchesFilters(m, filters)));
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

  return { spacesMap, membersMap, calls, fetchImpl };
}

test("shared-spaces.join.accept: a third identity replaying an already-accepted token is rejected, and B's membership is untouched", async () => {
  const { membersMap, fetchImpl } = createStore({
    spaces: [{ id: SPACE_A, owner_id: USER_ID, name: "Family calendar" }],
    members: [{
      id: MEMBER_ID, space_id: SPACE_A, invited_email: "friend@example.com",
      user_id: OTHER_USER_ID, status: "active", invite_token: "a".repeat(48),
      invite_token_expires_at: new Date(Date.now() + 86400000).toISOString(), invited_by: USER_ID
    }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenC = await accessToken({ sub: THIRD_USER_ID, email: "friend@example.com" });

  const res = await invoke("/api/shared-spaces/join/accept", {
    env, token: tokenC, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "a".repeat(48) })
  });

  assert.equal(res.status, 409, "an already-active invite must not be re-acceptable");
  assert.equal(membersMap.get(MEMBER_ID).user_id, OTHER_USER_ID, "B's membership must survive C's replay attempt untouched");
});

test("shared-spaces.join.accept: the caller's JWT email must match the invited email, even with a stolen/shared token", async () => {
  const { membersMap, fetchImpl } = createStore({
    spaces: [{ id: SPACE_A, owner_id: USER_ID, name: "Family calendar" }],
    members: [{
      id: MEMBER_ID, space_id: SPACE_A, invited_email: "friend@example.com",
      user_id: null, status: "pending", invite_token: "b".repeat(48),
      invite_token_expires_at: new Date(Date.now() + 86400000).toISOString(), invited_by: USER_ID
    }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  // THIRD_USER_ID found/guessed the token but is signed in with a different email.
  const tokenC = await accessToken({ sub: THIRD_USER_ID, email: "not-the-invitee@example.com" });

  const res = await invoke("/api/shared-spaces/join/accept", {
    env, token: tokenC, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "b".repeat(48) })
  });

  assert.equal(res.status, 403);
  assert.equal(membersMap.get(MEMBER_ID).status, "pending", "membership must stay pending, not claimed by the wrong identity");
  assert.equal(membersMap.get(MEMBER_ID).user_id, null);
});

test("shared-spaces.members (PATCH revoke): user B cannot revoke a membership on user A's space they don't own", async () => {
  const { membersMap, fetchImpl } = createStore({
    spaces: [
      { id: SPACE_A, owner_id: USER_ID, name: "A's space" },
      { id: SPACE_B, owner_id: OTHER_USER_ID, name: "B's space" }
    ],
    members: [{ id: MEMBER_ID, space_id: SPACE_A, invited_email: "friend@example.com", user_id: THIRD_USER_ID, status: "active", invite_token: "c".repeat(48), invited_by: USER_ID }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "b@ethone.dev" });

  const res = await invoke("/api/shared-spaces/members", {
    env, token: tokenB, method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: MEMBER_ID, status: "revoked" })
  });

  assert.equal(res.status, 404, "B does not own space A, so the member row must appear not-found to them");
  assert.equal(membersMap.get(MEMBER_ID).status, "active", "A's member row must not be revoked by B's request");
});

test("shared-spaces.members (DELETE remove): user B cannot remove a member from a space they don't own", async () => {
  const { membersMap, fetchImpl } = createStore({
    spaces: [{ id: SPACE_A, owner_id: USER_ID, name: "A's space" }],
    members: [{ id: MEMBER_ID, space_id: SPACE_A, invited_email: "friend@example.com", user_id: THIRD_USER_ID, status: "active", invite_token: "d".repeat(48), invited_by: USER_ID }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "b@ethone.dev" });

  const res = await invoke("/api/shared-spaces/members", {
    env, token: tokenB, method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: MEMBER_ID })
  });

  assert.equal(res.status, 404);
  assert.ok(membersMap.has(MEMBER_ID), "the member row must still exist after B's unauthorized delete attempt");
});

test("shared-spaces.members (POST invite): user B cannot invite people into user A's space", async () => {
  const { membersMap, fetchImpl } = createStore({
    spaces: [{ id: SPACE_A, owner_id: USER_ID, name: "A's space" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "b@ethone.dev" });

  const res = await invoke("/api/shared-spaces/members", {
    env, token: tokenB, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ space_id: SPACE_A, email: "intruder@example.com" })
  });

  assert.equal(res.status, 404);
  assert.equal(membersMap.size, 0, "no member row should have been created for a space B does not own");
});

test("shared-spaces (DELETE space): user B cannot delete user A's space by guessing its id", async () => {
  const { spacesMap, fetchImpl } = createStore({
    spaces: [{ id: SPACE_A, owner_id: USER_ID, name: "A's space" }]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenB = await accessToken({ sub: OTHER_USER_ID, email: "b@ethone.dev" });

  await invoke("/api/shared-spaces", {
    env, token: tokenB, method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: SPACE_A })
  });

  assert.ok(spacesMap.has(SPACE_A), "user A's space must still exist — the delete filter must include owner_id=B, which never matches");
});

test("shared-spaces.members (GET list): a non-member cannot list another user's space members, and invite_token is never exposed to a plain member", async () => {
  const { fetchImpl } = createStore({
    spaces: [{ id: SPACE_A, owner_id: USER_ID, name: "A's space" }],
    members: [
      { id: MEMBER_ID, space_id: SPACE_A, invited_email: "member@example.com", user_id: OTHER_USER_ID, status: "active", invite_token: "e".repeat(48), invited_by: USER_ID },
      { id: "55555555-5555-4555-8555-555555555555", space_id: SPACE_A, invited_email: "pending@example.com", user_id: null, status: "pending", invite_token: "f".repeat(48), invited_by: USER_ID }
    ]
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  // A completely uninvolved third party gets nothing.
  const tokenC = await accessToken({ sub: THIRD_USER_ID, email: "c@ethone.dev" });
  const strangerRes = await invoke(`/api/shared-spaces/members?space_id=${SPACE_A}`, { env, token: tokenC });
  assert.equal(strangerRes.status, 404);

  // An active member CAN see the roster (to know who else is in the space)
  // but must never receive another member's raw invite_token.
  const tokenMember = await accessToken({ sub: OTHER_USER_ID, email: "member@example.com" });
  const memberRes = await invoke(`/api/shared-spaces/members?space_id=${SPACE_A}`, { env, token: tokenMember });
  assert.equal(memberRes.status, 200);
  const members = (await payload(memberRes)).data;
  assert.equal(members.length, 2);
  for (const m of members) assert.equal(m.invite_token, undefined, "invite_token must never reach a non-owner");
});
