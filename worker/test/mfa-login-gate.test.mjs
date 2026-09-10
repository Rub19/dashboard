import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache, clearSessionRevocationCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv, USER_ID } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
  clearSessionRevocationCache();
});

// Combines the two tables the login-time MFA gate actually touches
// (ethone_devices for the pending flag, ethone_user_data kind='totp' for
// the secret/backup codes it's checked against), stateful across requests
// within one test — same pattern as session-revocation.test.mjs's
// createDeviceStore and totp.test.mjs's createTotpStore, merged because
// this feature is the first one to need both at once.
function createMfaStore({ devices = [], totp = null } = {}) {
  const deviceRows = new Map(devices.map((d) => [d.id, { ...d }]));
  const totpRows = new Map(totp ? [[totp.id || "totp-row-1", { ...totp }]] : []);

  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";

    if (url.pathname === "/rest/v1/ethone_devices") {
      const sessionId = url.searchParams.get("session_id")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");

      if (method === "GET") {
        const rows = [...deviceRows.values()].filter((d) => {
          if (sessionId !== null && sessionId !== undefined && d.session_id !== sessionId) return false;
          if (id && d.id !== id) return false;
          return true;
        });
        return json(rows);
      }
      if (method === "POST") {
        const body = JSON.parse(String(init.body || "{}"));
        const row = {
          id: `device-${deviceRows.size + 1}`,
          revoked_at: null,
          mfa_pending: false,
          ...body
        };
        deviceRows.set(row.id, row);
        return json([row]);
      }
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const target = deviceRows.get(id);
        if (target) Object.assign(target, body);
        return json(target ? [target] : []);
      }
    }

    if (url.pathname === "/rest/v1/ethone_user_data") {
      const userId = url.searchParams.get("user_id")?.replace(/^eq\./, "");
      const kind = url.searchParams.get("kind")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const matches = (row) => {
        if (userId && row.user_id !== userId) return false;
        if (kind && row.kind !== kind) return false;
        if (id && row.id !== id) return false;
        return true;
      };
      if (method === "GET") return json([...totpRows.values()].filter(matches));
      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const targets = [...totpRows.values()].filter(matches);
        targets.forEach((row) => Object.assign(row, body));
        return json(targets);
      }
    }

    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };

  return { deviceRows, totpRows, fetchImpl };
}

// Independent RFC 6238 re-implementation (same one totp.test.mjs uses) so
// the test can produce a code actually valid against a given secret without
// importing server-only internals.
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

async function computeTotpCode(secret) {
  const period = 30;
  const counter = Math.floor(Date.now() / 1000 / period);
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

// Mirrors totp-service.js's own (non-exported) hashBackupCode exactly.
async function hashBackupCode(code) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code).toUpperCase().trim()));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

const SECRET = "JBSWY3DPEHPK3PXP"; // valid base32, arbitrary test secret

test("a session flagged mfa_pending is blocked from every route except totp.challenge and signout", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-pending" });

  const blocked = await invoke("/api/auth/devices", { env, token });
  assert.equal(blocked.status, 401);
  assert.equal((await payload(blocked)).error.code, "MFA_REQUIRED");

  // Also blocked from acting on other data, not just reading — the gate is
  // route-wide, not a special case for the device list.
  const blockedTrust = await invoke("/api/auth/device/trust", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: "d1", trusted: true })
  });
  assert.equal(blockedTrust.status, 401);
  assert.equal((await payload(blockedTrust)).error.code, "MFA_REQUIRED");
});

test("signing out is still allowed while a session is mfa_pending", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-pending" });

  const signOut = await invoke("/api/signout", { env, token, method: "POST" });
  assert.equal(signOut.status, 200);
});

test("a valid TOTP code at the login challenge clears mfa_pending for the very next request", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-pending" });

  const code = await computeTotpCode(SECRET);
  const challenge = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code })
  });
  assert.equal(challenge.status, 200);
  assert.equal((await payload(challenge)).data.verified, true);

  const after = await invoke("/api/auth/devices", { env, token });
  assert.equal(after.status, 200);
});

test("a wrong TOTP code at the login challenge leaves the session blocked", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-pending" });

  const validCode = await computeTotpCode(SECRET);
  const wrongCode = validCode === "000000" ? "111111" : "000000";
  const challenge = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: wrongCode })
  });
  assert.equal(challenge.status, 401);
  assert.equal((await payload(challenge)).error.code, "TOTP_INVALID");

  const after = await invoke("/api/auth/devices", { env, token });
  assert.equal(after.status, 401);
  assert.equal((await payload(after)).error.code, "MFA_REQUIRED");
});

test("a backup code clears mfa_pending and is single-use", async () => {
  const backupHash = await hashBackupCode("abcd1234");
  const { fetchImpl, totpRows } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { id: "totp-1", user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [backupHash] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-pending" });

  const first = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    // Case/whitespace-insensitive, same as how the code is displayed to the user.
    body: JSON.stringify({ backupCode: "abcd1234" })
  });
  assert.equal(first.status, 200);
  assert.equal((await payload(first)).data.verified, true);
  assert.deepEqual(totpRows.get("totp-1").data.backup, []);

  const after = await invoke("/api/auth/devices", { env, token });
  assert.equal(after.status, 200);

  // Same code again must fail — it was removed from the stored list.
  const second = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ backupCode: "abcd1234" })
  });
  assert.equal(second.status, 401);
  assert.equal((await payload(second)).error.code, "TOTP_INVALID");
});

test("the challenge route rejects a request with both a code and a backup code, or neither", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-pending" });

  const both = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "123456", backupCode: "abcd1234" })
  });
  assert.equal(both.status, 400);
  assert.equal((await payload(both)).error.code, "INVALID_REQUEST");

  const neither = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(neither.status, 400);
  assert.equal((await payload(neither)).error.code, "INVALID_REQUEST");
});

test("registering a brand-new session's device marks it mfa_pending when the user has TOTP enabled, and blocks the very next request", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-new" });

  // First-ever call for this session (mirrors AuthProvider's
  // registerCurrentDevice() right after password/OAuth/passkey sign-in) —
  // no device row exists yet, so this itself is not blocked.
  const upsert = await invoke("/api/auth/device", { env, token, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  assert.equal(upsert.status, 200);
  assert.equal((await payload(upsert)).data.mfa_pending, true);

  // The device row now exists with mfa_pending — the very next request on
  // this session must be blocked, not just "eventually" once some cache
  // expires.
  const next = await invoke("/api/auth/devices", { env, token });
  assert.equal(next.status, 401);
  assert.equal((await payload(next)).error.code, "MFA_REQUIRED");
});

test("registering a brand-new session's device leaves mfa_pending false when TOTP is not enabled", async () => {
  const { fetchImpl } = createMfaStore({ devices: [], totp: null });
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-new" });

  const upsert = await invoke("/api/auth/device", { env, token, method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
  assert.equal(upsert.status, 200);
  assert.equal((await payload(upsert)).data.mfa_pending, false);

  const next = await invoke("/api/auth/devices", { env, token });
  assert.equal(next.status, 200);
});

test("the login-time challenge route itself is rate limited against brute-forcing the code", async () => {
  const { fetchImpl } = createMfaStore({
    devices: [{ id: "d1", user_id: USER_ID, session_id: "session-pending", mfa_pending: true, revoked_at: null }],
    totp: { user_id: USER_ID, kind: "totp", data: { secret: SECRET, verified: true, backup: [] } }
  });
  const env = testEnv({
    __TEST_FETCH__: fetchImpl,
    RATE_LIMIT_STANDARD: { limit: async () => ({ success: false }) }
  });
  const token = await accessToken({ session_id: "session-pending" });

  const response = await invoke("/api/auth/totp/challenge", {
    env, token, method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "000000" })
  });
  assert.equal(response.status, 429);
  assert.equal((await payload(response)).error.code, "AUTH_RATE_LIMITED");
});
