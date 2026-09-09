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

// A tiny in-memory ethone_devices store, stateful across requests within one
// test, so a PATCH (revoke) issued by one call is visible to the GET a
// subsequent call makes — this is what proves revocation is enforced on the
// very next request, not "eventually" or "only after the token expires".
function createDeviceStore(initialDevices) {
  const devices = new Map(initialDevices.map((d) => [d.id, { ...d }]));
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });

    if (url.pathname === "/rest/v1/ethone_devices") {
      const method = init?.method || "GET";
      const sessionId = url.searchParams.get("session_id")?.replace(/^eq\./, "");
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");

      if (method === "GET") {
        const rows = [...devices.values()].filter((d) => {
          if (sessionId !== null && sessionId !== undefined && d.session_id !== sessionId) return false;
          if (id && d.id !== id) return false;
          return true;
        });
        return json(rows);
      }

      if (method === "PATCH") {
        const body = JSON.parse(String(init.body || "{}"));
        const target = devices.get(id);
        if (target) Object.assign(target, body);
        return json(target ? [target] : []);
      }
    }

    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };
  return { devices, fetchImpl };
}

test("revoking a session blocks the very next request carrying that session_id", async () => {
  const { fetchImpl } = createDeviceStore([
    { id: "11111111-1111-4111-8111-111111111111", user_id: USER_ID, session_id: "session-current", revoked_at: null, name: "This device" },
    { id: "22222222-2222-4222-8222-222222222222", user_id: USER_ID, session_id: "session-other", revoked_at: null, name: "Other device" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const currentToken = await accessToken({ session_id: "session-current" });
  const otherToken = await accessToken({ session_id: "session-other" });

  // The "other" session works before revocation.
  const before = await invoke("/api/auth/devices", { env, token: otherToken });
  assert.equal(before.status, 200);

  // From the "current" session, revoke the "other" one.
  const revoke = await invoke("/api/auth/device/revoke", {
    env,
    token: currentToken,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: "22222222-2222-4222-8222-222222222222" })
  });
  assert.equal(revoke.status, 200);

  // The very next request carrying a token for the now-revoked session_id
  // must be rejected — not "still works until it naturally expires".
  const after = await invoke("/api/auth/devices", { env, token: otherToken });
  assert.equal(after.status, 401);
  const body = await payload(after);
  assert.equal(body.error.code, "SESSION_REVOKED");

  // The session that did the revoking is unaffected.
  const stillCurrent = await invoke("/api/auth/devices", { env, token: currentToken });
  assert.equal(stillCurrent.status, 200);
});

test("revoking your own current session requires explicit confirmation", async () => {
  const { fetchImpl } = createDeviceStore([
    { id: "11111111-1111-4111-8111-111111111111", user_id: USER_ID, session_id: "session-current", revoked_at: null, name: "This device" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-current" });

  const withoutConfirm = await invoke("/api/auth/device/revoke", {
    env,
    token,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: "11111111-1111-4111-8111-111111111111" })
  });
  assert.equal(withoutConfirm.status, 409);
  const body = await payload(withoutConfirm);
  assert.equal(body.error.code, "CONFIRMATION_REQUIRED");

  const withConfirm = await invoke("/api/auth/device/revoke", {
    env,
    token,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: "11111111-1111-4111-8111-111111111111", confirmCurrent: true })
  });
  assert.equal(withConfirm.status, 200);
});

test("revoke-others revokes every device except the caller's own current session", async () => {
  const { devices, fetchImpl } = createDeviceStore([
    { id: "11111111-1111-4111-8111-111111111111", user_id: USER_ID, session_id: "session-current", revoked_at: null, name: "This device" },
    { id: "22222222-2222-4222-8222-222222222222", user_id: USER_ID, session_id: "session-b", revoked_at: null, name: "Device B" },
    { id: "33333333-3333-4333-8333-333333333333", user_id: USER_ID, session_id: "session-c", revoked_at: null, name: "Device C" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-current" });

  const response = await invoke("/api/auth/device/revoke-others", { env, token, method: "POST" });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.revokedCount, 2);
  assert.ok(body.data.revokedDeviceIds.includes("22222222-2222-4222-8222-222222222222"));
  assert.ok(body.data.revokedDeviceIds.includes("33333333-3333-4333-8333-333333333333"));
  assert.ok(!body.data.revokedDeviceIds.includes("11111111-1111-4111-8111-111111111111"));

  assert.equal(devices.get("11111111-1111-4111-8111-111111111111").revoked_at, null);
  assert.ok(devices.get("22222222-2222-4222-8222-222222222222").revoked_at);
  assert.ok(devices.get("33333333-3333-4333-8333-333333333333").revoked_at);
});

test("signing out revokes the current session so it can't be reused", async () => {
  const { fetchImpl } = createDeviceStore([
    { id: "11111111-1111-4111-8111-111111111111", user_id: USER_ID, session_id: "session-current", revoked_at: null, name: "This device" }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ session_id: "session-current" });

  const signOut = await invoke("/api/signout", { env, token, method: "POST" });
  assert.equal(signOut.status, 200);

  const afterSignOut = await invoke("/api/auth/devices", { env, token });
  assert.equal(afterSignOut.status, 401);
  const body = await payload(afterSignOut);
  assert.equal(body.error.code, "SESSION_REVOKED");
});

test("the dedicated auth rate limiter actually blocks once the Cloudflare binding reports failure", async () => {
  const env = testEnv({
    __TEST_FETCH__: async () => json([]),
    RATE_LIMIT_STANDARD: { limit: async () => ({ success: false }) }
  });
  const token = await accessToken({ session_id: "session-current" });

  const response = await invoke("/api/auth/device/revoke", {
    env,
    token,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: "11111111-1111-4111-8111-111111111111" })
  });
  assert.equal(response.status, 429);
  const body = await payload(response);
  assert.equal(body.error.code, "AUTH_RATE_LIMITED");
  assert.equal(response.headers.get("retry-after"), "300");
});
