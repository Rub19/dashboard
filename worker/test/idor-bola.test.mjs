// Phase 5 — IDOR/BOLA attack pass.
//
// Every test here uses TWO distinct, independently-signed identities (User A
// = helpers.USER_ID, User B = OTHER_USER_ID below) and actually exercises the
// route through invoke() end-to-end — never just reading the source and
// asserting it "looks right". Where the task calls for it, we also inspect
// the exact Supabase REST query shape (URL search params) sent to the mock
// fetch, so a passing test can't be explained by "the mock happened to
// return nothing" — it has to be explained by the real ownership filter
// (`user_id=eq.<caller>`) being present in the request the route issued.
import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache, clearSessionRevocationCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

// A second, independently valid UUID (passes the same v1-8/variant-8-b regex
// the JWT claims validator enforces) standing in for a completely different
// account. Never derived from USER_ID.
const OTHER_USER_ID = "b2c3d4e5-6f70-4a1b-9c2d-3e4f5a6b7c8d";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
  clearSessionRevocationCache();
});

function searchFilter(search, key) {
  return new URLSearchParams(search).get(key)?.replace(/^eq\./, "") ?? null;
}

// ---------------------------------------------------------------------------
// ethone_devices — backs device trust/revoke/remove/revoke-others AND the
// current-session lookup those routes use internally.
// ---------------------------------------------------------------------------
function createDevicesStore(initialDevices) {
  const devices = new Map(initialDevices.map((d) => [d.id, { ...d }]));
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";

    if (url.pathname === "/rest/v1/ethone_devices") {
      calls.push({ method, search: url.search });
      const userId = searchFilter(url.search, "user_id");
      const sessionId = searchFilter(url.search, "session_id");
      const id = searchFilter(url.search, "id");
      // This mock deliberately applies ONLY the filters actually present in
      // the outgoing URL (nothing implicit) — if the route under test ever
      // stopped sending `user_id=eq.<caller>`, this mock would start
      // returning/mutating rows across users too, and the assertions below
      // on the OTHER user's row would fail.
      const matches = (d) => {
        if (userId && d.user_id !== userId) return false;
        if (sessionId && d.session_id !== sessionId) return false;
        if (id && d.id !== id) return false;
        return true;
      };
      if (method === "GET") return json([...devices.values()].filter(matches));
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...devices.values()].filter(matches);
        targets.forEach((d) => Object.assign(d, body));
        return json(targets);
      }
      if (method === "DELETE") {
        const targets = [...devices.values()].filter(matches);
        targets.forEach((d) => devices.delete(d.id));
        return json(targets);
      }
      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = { id: crypto.randomUUID(), revoked_at: null, trusted: false, ...body };
        devices.set(row.id, row);
        return json([row]);
      }
    }

    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };
  return { devices, fetchImpl, calls };
}

// ---------------------------------------------------------------------------
// ethone_passkeys
// ---------------------------------------------------------------------------
function createPasskeysStore(initialPasskeys) {
  const passkeys = new Map(initialPasskeys.map((p) => [p.id, { ...p }]));
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";

    if (url.pathname === "/rest/v1/ethone_passkeys") {
      calls.push({ method, search: url.search });
      const userId = searchFilter(url.search, "user_id");
      const id = searchFilter(url.search, "id");
      const matches = (p) => {
        if (userId && p.user_id !== userId) return false;
        if (id && p.id !== id) return false;
        return true;
      };
      if (method === "GET") return json([...passkeys.values()].filter(matches));
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...passkeys.values()].filter(matches);
        targets.forEach((p) => Object.assign(p, body));
        return json(targets);
      }
      if (method === "DELETE") {
        const targets = [...passkeys.values()].filter(matches);
        targets.forEach((p) => passkeys.delete(p.id));
        return json(targets);
      }
    }

    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };
  return { passkeys, fetchImpl, calls };
}

// ---------------------------------------------------------------------------
// ethone_user_data (kind='totp') — same shape as totp.test.mjs's store, with
// the user_id/kind/id filters that route actually sends made explicit so we
// can assert on them.
// ---------------------------------------------------------------------------
function createTotpStore(initialRows = []) {
  const rows = new Map(initialRows.map((r) => [r.id, { ...r }]));
  const calls = [];
  let nextId = 1;
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";

    if (url.pathname === "/rest/v1/ethone_user_data") {
      calls.push({ method, search: url.search });
      const userId = searchFilter(url.search, "user_id");
      const kind = searchFilter(url.search, "kind");
      const id = searchFilter(url.search, "id");
      const matches = (r) => {
        if (userId && r.user_id !== userId) return false;
        if (kind && r.kind !== kind) return false;
        if (id && r.id !== id) return false;
        return true;
      };
      if (method === "GET") return json([...rows.values()].filter(matches));
      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = { id: `totp-row-${nextId++}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...body };
        rows.set(row.id, row);
        return json([row]);
      }
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...rows.values()].filter(matches);
        targets.forEach((r) => Object.assign(r, body));
        return json(targets);
      }
      if (method === "DELETE") {
        const targets = [...rows.values()].filter(matches);
        targets.forEach((r) => rows.delete(r.id));
        return json(targets);
      }
    }

    return json([]);
  };
  return { rows, fetchImpl, calls };
}

// ---------------------------------------------------------------------------
// ethone_security_events
// ---------------------------------------------------------------------------
function createSecurityEventsStore(initialEvents) {
  const events = [...initialEvents];
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";

    if (url.pathname === "/rest/v1/ethone_security_events") {
      calls.push({ method, search: url.search });
      const userId = searchFilter(url.search, "user_id");
      if (method === "GET") {
        return json(events.filter((e) => !userId || e.user_id === userId));
      }
      if (method === "POST") return json([{}]);
    }
    return json([]);
  };
  return { events, fetchImpl, calls };
}

// Independent from-scratch RFC 6238 implementation, mirroring totp.test.mjs,
// so a valid code can be produced against a given secret without importing
// server-only internals.
function base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = String(value).toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let acc = 0;
  const bytes = [];
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    acc = (acc << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((acc >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

async function computeTotpCode(secret, timestamp = Date.now()) {
  const period = 30;
  const counter = Math.floor(timestamp / 1000 / period);
  const keyBytes = base32Decode(secret);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(0, Math.floor(counter / 4294967296), false);
  view.setUint32(4, counter % 4294967296, false);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBuffer));
  const offset = signature[signature.length - 1] & 0x0f;
  const code = ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);
  return String(code % 10 ** 6).padStart(6, "0");
}

// ===========================================================================
// 1. Session/device endpoints — the newest, highest-risk surface.
// ===========================================================================

test("device.revoke: user A cannot revoke user B's device, even with a real device id guessed/reused from B's account", async () => {
  const DEVICE_A = "11111111-1111-4111-8111-111111111111";
  const DEVICE_B = "22222222-2222-4222-8222-222222222222";
  const { devices, fetchImpl, calls } = createDevicesStore([
    { id: DEVICE_A, user_id: USER_ID, session_id: "session-a", revoked_at: null, trusted: false, name: "A's laptop" },
    { id: DEVICE_B, user_id: OTHER_USER_ID, session_id: "session-b", revoked_at: null, trusted: false, name: "B's phone" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID, session_id: "session-a" });

  const attack = await invoke("/api/auth/device/revoke", {
    env, token: tokenA, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: DEVICE_B })
  });

  // The response must not report B's device as revoked, and B's row in the
  // store must be byte-for-byte untouched.
  const body = await payload(attack);
  assert.notEqual(body?.data?.id, DEVICE_B);
  assert.equal(devices.get(DEVICE_B).revoked_at, null, "user B's device must not be revoked by user A's request");
  assert.equal(devices.get(DEVICE_B).trusted, false);

  // Confirm this isn't just "the mock happened to return nothing": the PATCH
  // this route issued must have carried the caller's own user_id filter, not
  // B's, and not be missing entirely.
  const patchCalls = calls.filter((c) => c.method === "PATCH");
  assert.ok(patchCalls.length >= 1, "route must have attempted the ownership-filtered update");
  for (const call of patchCalls) {
    assert.equal(searchFilter(call.search, "user_id"), USER_ID);
    assert.notEqual(searchFilter(call.search, "user_id"), OTHER_USER_ID);
  }
});

test("device.trust: user A cannot trust/verify user B's device by id", async () => {
  const DEVICE_A = "11111111-1111-4111-8111-111111111111";
  const DEVICE_B = "22222222-2222-4222-8222-222222222222";
  const { devices, fetchImpl, calls } = createDevicesStore([
    { id: DEVICE_A, user_id: USER_ID, session_id: "session-a", revoked_at: null, trusted: false, name: "A's laptop" },
    { id: DEVICE_B, user_id: OTHER_USER_ID, session_id: "session-b", revoked_at: null, trusted: false, name: "B's phone" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID, session_id: "session-a" });

  await invoke("/api/auth/device/trust", {
    env, token: tokenA, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: DEVICE_B, trusted: true })
  });

  assert.equal(devices.get(DEVICE_B).trusted, false, "user B's device must not become trusted via user A's request");
  const patchCalls = calls.filter((c) => c.method === "PATCH");
  for (const call of patchCalls) assert.equal(searchFilter(call.search, "user_id"), USER_ID);
});

test("device.remove: user A cannot remove user B's device by id", async () => {
  const DEVICE_A = "11111111-1111-4111-8111-111111111111";
  const DEVICE_B = "22222222-2222-4222-8222-222222222222";
  const { devices, fetchImpl, calls } = createDevicesStore([
    { id: DEVICE_A, user_id: USER_ID, session_id: "session-a", revoked_at: null, trusted: false, name: "A's laptop" },
    { id: DEVICE_B, user_id: OTHER_USER_ID, session_id: "session-b", revoked_at: null, trusted: false, name: "B's phone" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID, session_id: "session-a" });

  await invoke("/api/auth/device/remove", {
    env, token: tokenA, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: DEVICE_B })
  });

  assert.ok(devices.has(DEVICE_B), "user B's device must still exist after user A's remove request");
  const deleteCalls = calls.filter((c) => c.method === "DELETE");
  for (const call of deleteCalls) assert.equal(searchFilter(call.search, "user_id"), USER_ID);
});

test("device.revoke-others: a different user's devices are never touched by my revoke-others call", async () => {
  const DEVICE_A_CURRENT = "11111111-1111-4111-8111-111111111111";
  const DEVICE_A_OTHER = "44444444-4444-4444-8444-444444444444";
  const DEVICE_B_1 = "22222222-2222-4222-8222-222222222222";
  const DEVICE_B_2 = "33333333-3333-4333-8333-333333333333";
  const { devices, fetchImpl, calls } = createDevicesStore([
    { id: DEVICE_A_CURRENT, user_id: USER_ID, session_id: "session-a-current", revoked_at: null, trusted: false, name: "A's current device" },
    { id: DEVICE_A_OTHER, user_id: USER_ID, session_id: "session-a-other", revoked_at: null, trusted: false, name: "A's other device" },
    { id: DEVICE_B_1, user_id: OTHER_USER_ID, session_id: "session-b-1", revoked_at: null, trusted: false, name: "B's device 1" },
    { id: DEVICE_B_2, user_id: OTHER_USER_ID, session_id: "session-b-2", revoked_at: null, trusted: false, name: "B's device 2" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID, session_id: "session-a-current" });

  const response = await invoke("/api/auth/device/revoke-others", { env, token: tokenA, method: "POST" });
  assert.equal(response.status, 200);
  const body = await payload(response);

  // Only A's other device was revoked — A's own current session and BOTH of
  // B's devices (a different, more serious bug class than "current session
  // spared") must be completely untouched.
  assert.equal(body.data.revokedCount, 1);
  assert.deepEqual(body.data.revokedDeviceIds, [DEVICE_A_OTHER]);
  assert.equal(devices.get(DEVICE_A_CURRENT).revoked_at, null);
  assert.equal(devices.get(DEVICE_A_OTHER).revoked_at !== null, true);
  assert.equal(devices.get(DEVICE_B_1).revoked_at, null, "B's device 1 must not be revoked by A's revoke-others call");
  assert.equal(devices.get(DEVICE_B_2).revoked_at, null, "B's device 2 must not be revoked by A's revoke-others call");

  // Confirm the listing query itself (the one that decides WHICH devices are
  // "mine" to revoke) actually filtered by the caller's user_id — this is
  // the query that, if broken, would silently let A enumerate/revoke B's
  // devices no matter how careful the later PATCH calls are.
  const listCalls = calls.filter((c) => c.method === "GET" && !searchFilter(c.search, "id"));
  assert.ok(listCalls.length >= 1);
  for (const call of listCalls) {
    assert.equal(searchFilter(call.search, "user_id"), USER_ID);
    assert.notEqual(searchFilter(call.search, "user_id"), OTHER_USER_ID);
  }
  // And every PATCH (the actual revocation) also carried A's user_id, never B's.
  const patchCalls = calls.filter((c) => c.method === "PATCH");
  assert.ok(patchCalls.length >= 1);
  for (const call of patchCalls) assert.equal(searchFilter(call.search, "user_id"), USER_ID);
});

// ===========================================================================
// 2. Security events — must be derived strictly from auth.userId.
// ===========================================================================

test("security-events: user A never receives user B's events, even without any foreign id anywhere", async () => {
  const { fetchImpl } = createSecurityEventsStore([
    { id: "ev-a-1", user_id: USER_ID, kind: "signed_in", created_at: "2026-01-01T00:00:00Z" },
    { id: "ev-b-1", user_id: OTHER_USER_ID, kind: "signed_in", created_at: "2026-01-01T00:00:00Z" },
    { id: "ev-b-2", user_id: OTHER_USER_ID, kind: "device_revoked", created_at: "2026-01-02T00:00:00Z" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });

  const response = await invoke("/api/auth/security-events", { env, token: tokenA });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].id, "ev-a-1");
  assert.ok(!body.data.some((e) => e.user_id === OTHER_USER_ID));
});

test("security-events: a foreign user id passed as a query parameter is rejected, not silently ignored-then-trusted", async () => {
  const { fetchImpl } = createSecurityEventsStore([
    { id: "ev-a-1", user_id: USER_ID, kind: "signed_in" },
    { id: "ev-b-1", user_id: OTHER_USER_ID, kind: "signed_in" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });

  // The route's allow-list (assertAllowedQuery) only permits `limit` — any
  // other query param, including an attempted user id override, must be
  // rejected outright rather than silently accepted and ignored (which would
  // be fragile) or, worse, actually honored.
  for (const attack of [
    `/api/auth/security-events?userId=${OTHER_USER_ID}`,
    `/api/auth/security-events?user_id=${OTHER_USER_ID}`
  ]) {
    const response = await invoke(attack, { env, token: tokenA });
    assert.equal(response.status, 400);
    assert.equal((await payload(response)).error.code, "INVALID_PARAMETER");
  }
});

// ===========================================================================
// 3. Passkeys.
// ===========================================================================

test("passkey.rename: user A cannot rename user B's passkey by id", async () => {
  const PASSKEY_B = "55555555-5555-4555-8555-555555555555";
  const { passkeys, fetchImpl, calls } = createPasskeysStore([
    { id: PASSKEY_B, user_id: OTHER_USER_ID, credential_id: "cred-b", name: "B's YubiKey", revoked_at: null }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });

  const attack = await invoke("/api/auth/passkey/rename", {
    env, token: tokenA, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passkeyId: PASSKEY_B, name: "PWNED" })
  });

  // Must be rejected (not a 200 that actually renamed B's key).
  assert.notEqual(attack.status, 200);
  assert.equal(passkeys.get(PASSKEY_B).name, "B's YubiKey", "user B's passkey must not be renamed by user A's request");

  const getCalls = calls.filter((c) => c.method === "GET");
  assert.ok(getCalls.length >= 1);
  for (const call of getCalls) assert.equal(searchFilter(call.search, "user_id"), USER_ID);
});

test("passkey.revoke: user A cannot revoke user B's passkey by id", async () => {
  const PASSKEY_B = "55555555-5555-4555-8555-555555555555";
  const { passkeys, fetchImpl, calls } = createPasskeysStore([
    { id: PASSKEY_B, user_id: OTHER_USER_ID, credential_id: "cred-b", name: "B's YubiKey", revoked_at: null }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });

  const attack = await invoke("/api/auth/passkey/revoke", {
    env, token: tokenA, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passkeyId: PASSKEY_B })
  });

  assert.notEqual(attack.status, 200);
  assert.equal(passkeys.get(PASSKEY_B).revoked_at, null, "user B's passkey must not be revoked by user A's request");

  const getCalls = calls.filter((c) => c.method === "GET");
  for (const call of getCalls) assert.equal(searchFilter(call.search, "user_id"), USER_ID);
});

// ===========================================================================
// 4. TOTP — user A's setup/verify/disable must never read or write user B's
//    ethone_user_data (kind='totp') row.
// ===========================================================================

test("TOTP setup/verify/disable never read or write another user's kind='totp' row", async () => {
  const bRow = { id: "totp-row-B", user_id: OTHER_USER_ID, kind: "totp", slug: "totp", label: "", data: { secret: "BBBBBBBBBBBBBBBB", verified: true, backup: ["hash1", "hash2"] } };
  const { rows, fetchImpl, calls } = createTotpStore([bRow]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });
  const headers = { "content-type": "application/json" };
  const snapshot = () => JSON.stringify(rows.get("totp-row-B"));
  const bBefore = snapshot();

  const setup = await invoke("/api/auth/totp/setup", { env, token: tokenA, headers, method: "POST", body: JSON.stringify({ email: "a@ethone.dev" }) });
  assert.equal(setup.status, 200);
  assert.equal(snapshot(), bBefore, "B's row must be untouched by A's setup call");
  const { secret } = (await payload(setup)).data;

  const code = await computeTotpCode(secret);
  const verify = await invoke("/api/auth/totp/verify", { env, token: tokenA, headers, method: "POST", body: JSON.stringify({ code }) });
  assert.equal(verify.status, 200);
  assert.equal(snapshot(), bBefore, "B's row must be untouched by A's verify call");

  const disable = await invoke("/api/auth/totp/disable", { env, token: tokenA, method: "POST" });
  assert.equal(disable.status, 200);
  assert.equal(snapshot(), bBefore, "B's row must be untouched by A's disable call");
  assert.ok(rows.has("totp-row-B"), "B's row must still exist after A disables A's own 2FA");
  assert.equal(rows.size, 1, "only B's row should remain — A's row was created and then disabled, never B's");

  // Every query this whole flow issued was scoped to A, never B.
  for (const call of calls) {
    const userId = searchFilter(call.search, "user_id");
    if (userId) assert.equal(userId, USER_ID);
    assert.notEqual(userId, OTHER_USER_ID);
  }
});

// ===========================================================================
// 5. Tampered/forged session_id: documenting actual, current behavior.
// ===========================================================================

test("a session_id that matches no device row is NOT treated as revoked (documented expected behavior)", async () => {
  // No ethone_devices rows exist at all for this session_id — this is the
  // realistic shape of a token minted before session-tracking existed, or
  // one from a login flow that (for whatever reason) never got a matching
  // device row written. isSessionRevoked has nothing to check against, so it
  // must fail open on THIS specific check (JWT signature/expiry verification
  // already gatekept the request) rather than treating "unknown" as
  // "revoked" and locking the user out, or treating "unknown" as "trusted
  // forever" — it simply isn't in scope for this check.
  const env = testEnv({ __TEST_FETCH__: async () => json([]) });
  const neverSeenSessionId = crypto.randomUUID();
  const token = await accessToken({ sub: USER_ID, session_id: neverSeenSessionId });

  const response = await invoke("/api/auth/devices", { env, token });
  assert.equal(response.status, 200, "an unmatched session_id must not be auto-rejected as revoked");
  const body = await payload(response);
  assert.equal(body.ok, true);
});

// ===========================================================================
// 6. Replay basics on the NEW session-management routes specifically.
//    (Generic AUTH_EXPIRED/AUTH_INVALID coverage already exists in
//    worker-security.test.mjs's "private routes reject missing, malformed,
//    tampered and expired JWTs" — this extends that same guarantee onto the
//    Phase 1/4 session routes themselves, rather than duplicating it.)
// ===========================================================================

test("tampered and expired tokens are rejected on the session-management routes too", async () => {
  const valid = await accessToken({ sub: USER_ID, session_id: "session-x" });
  const dot = valid.lastIndexOf(".");
  const sig = valid.slice(dot + 1);
  const tamperedSig = `${sig[0] === "A" ? "B" : "A"}${sig.slice(1)}`;
  const tampered = `${valid.slice(0, dot + 1)}${tamperedSig}`;

  const tamperedResponse = await invoke("/api/auth/devices", { token: tampered });
  assert.equal(tamperedResponse.status, 401);
  assert.equal((await payload(tamperedResponse)).error.code, "AUTH_INVALID");

  const expiredToken = await accessToken({ sub: USER_ID, session_id: "session-x", exp: Math.floor(Date.now() / 1000) - 120 });
  const expiredResponse = await invoke("/api/auth/security-events", { token: expiredToken });
  assert.equal(expiredResponse.status, 401);
  assert.equal((await payload(expiredResponse)).error.code, "AUTH_EXPIRED");
});

// ===========================================================================
// 7. Spot-check OTHER (non-session) authenticated routes for the same
//    ownership-filter pattern — profiles and user-data.
// ===========================================================================

function createProfilesStore(initialProfiles) {
  const profiles = new Map(initialProfiles.map((p) => [p.id, { ...p }]));
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";
    if (url.pathname === "/rest/v1/ethone_profiles") {
      calls.push({ method, search: url.search });
      const userId = searchFilter(url.search, "user_id");
      const id = searchFilter(url.search, "id");
      const matches = (p) => {
        if (userId && p.user_id !== userId) return false;
        if (id && p.id !== id) return false;
        return true;
      };
      if (method === "GET") return json([...profiles.values()].filter(matches));
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...profiles.values()].filter(matches);
        targets.forEach((p) => Object.assign(p, body));
        return json(targets);
      }
      if (method === "DELETE") {
        const targets = [...profiles.values()].filter(matches);
        targets.forEach((p) => profiles.delete(p.id));
        return json(targets);
      }
    }
    return json([]);
  };
  return { profiles, fetchImpl, calls };
}

test("spot-check — profiles PATCH/DELETE never touch another user's profile row by a foreign id in the body", async () => {
  const PROFILE_B = "profile-b-1";
  const { profiles, fetchImpl, calls } = createProfilesStore([
    { id: PROFILE_B, user_id: OTHER_USER_ID, name: "B's profile", type: "personal", accent: "violet", workspace_id: "personal", widgets: [], integrations: [], is_active: true }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });
  const headers = { "content-type": "application/json" };

  const patch = await invoke("/api/profiles", {
    env, token: tokenA, headers, method: "PATCH",
    body: JSON.stringify({ id: PROFILE_B, name: "PWNED" })
  });
  assert.notEqual((await payload(patch))?.data?.name, "PWNED");
  assert.equal(profiles.get(PROFILE_B).name, "B's profile", "user B's profile must not be renamed by user A's request");

  const del = await invoke("/api/profiles", {
    env, token: tokenA, headers, method: "DELETE",
    body: JSON.stringify({ id: PROFILE_B })
  });
  await payload(del);
  assert.ok(profiles.has(PROFILE_B), "user B's profile must still exist after user A's delete request");

  for (const call of calls) {
    const userId = searchFilter(call.search, "user_id");
    if (userId) assert.equal(userId, USER_ID);
    assert.notEqual(userId, OTHER_USER_ID);
  }
});

function createUserDataStore(initialRows) {
  const rows = new Map(initialRows.map((r) => [r.id, { ...r }]));
  const calls = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";
    if (url.pathname === "/rest/v1/ethone_profiles") return json([]); // no active profile for either user in this test
    if (url.pathname === "/rest/v1/ethone_user_data") {
      calls.push({ method, search: url.search });
      const userId = searchFilter(url.search, "user_id");
      const kind = searchFilter(url.search, "kind");
      const id = searchFilter(url.search, "id");
      const matches = (r) => {
        if (userId && r.user_id !== userId) return false;
        if (kind && r.kind !== kind) return false;
        if (id && r.id !== id) return false;
        return true;
      };
      if (method === "GET") return json([...rows.values()].filter(matches));
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...rows.values()].filter(matches);
        targets.forEach((r) => Object.assign(r, body));
        return json(targets);
      }
      if (method === "DELETE") {
        const targets = [...rows.values()].filter(matches);
        targets.forEach((r) => rows.delete(r.id));
        return json(targets);
      }
    }
    return json([]);
  };
  return { rows, fetchImpl, calls };
}

test("spot-check — user-data PATCH/DELETE never touch another user's row by a foreign id in the body", async () => {
  const ROW_B = "row-b-1";
  const { rows, fetchImpl, calls } = createUserDataStore([
    { id: ROW_B, user_id: OTHER_USER_ID, kind: "space", slug: "b-space", label: "B's space", data: {}, count: 0 }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const tokenA = await accessToken({ sub: USER_ID });
  const headers = { "content-type": "application/json" };

  const patch = await invoke("/api/user-data/spaces", {
    env, token: tokenA, headers, method: "PATCH",
    body: JSON.stringify({ id: ROW_B, label: "PWNED" })
  });
  await payload(patch);
  assert.equal(rows.get(ROW_B).label, "B's space", "user B's row must not be modified by user A's request");

  const del = await invoke("/api/user-data/spaces", {
    env, token: tokenA, headers, method: "DELETE",
    body: JSON.stringify({ id: ROW_B })
  });
  await payload(del);
  assert.ok(rows.has(ROW_B), "user B's row must still exist after user A's delete request");

  for (const call of calls) {
    const userId = searchFilter(call.search, "user_id");
    if (userId) assert.equal(userId, USER_ID);
    assert.notEqual(userId, OTHER_USER_ID);
  }
});
