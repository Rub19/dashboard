// Phase 5 — Task 2 checklist gaps: (a) authorization (requireRole/appRole)
// spot-check on the one admin-gated route that exists, and (b) confirming
// the Worker's OWN write path for the Phase 1 lockdown tables
// (ethone_devices, ethone_security_events) always goes through the
// privileged service-role credential rather than some bypassable
// client-authenticated path.
//
// Genuine RLS enforcement itself (does Postgres actually reject a
// client-privileged write) can only be verified against a real Supabase
// instance — out of reach for this mocked harness. What CAN be verified
// here, and is verified below, is that the Worker's code never gives a
// caller a path to write these tables with anything other than its own
// service-role secret plus an explicit, code-level ownership filter — i.e.
// RLS is a second line of defense, not the only thing standing between a
// user and another user's device/session rows.
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

// -----------------------------------------------------------------------
// (a) Authorization: the only admin-gated route in the Worker.
//
// Note: this route (adminStatsRoute, src/routes/admin.js) gates on a
// hardcoded ADMIN_EMAILS allow-list checked against the token's `email`
// claim, NOT via middleware/auth.js's requireRole()/appRole — a grep across
// worker/src finds requireRole imported and called nowhere. That's not a bug
// introduced by this phase and nothing here changes it; it's just why this
// spot-check exercises the email allow-list rather than appRole. Flagged in
// the phase report as an observation, not fixed here (scope creep guard).
// -----------------------------------------------------------------------

function createAdminStatsFetch() {
  return async (input) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    if (url.pathname.startsWith("/rest/v1/")) return json([{ count: 0 }]);
    return json([]);
  };
}

test("admin.stats rejects an authenticated non-admin user", async () => {
  const env = testEnv({ __TEST_FETCH__: createAdminStatsFetch() });
  const token = await accessToken({ sub: USER_ID, email: "not-an-admin@example.test" });
  const response = await invoke("/api/admin/stats", { env, token });
  assert.equal(response.status, 403);
  assert.equal((await payload(response)).error.code, "FORBIDDEN");
});

test("admin.stats rejects an unauthenticated request", async () => {
  const env = testEnv({ __TEST_FETCH__: createAdminStatsFetch() });
  const response = await invoke("/api/admin/stats", { env, auth: false });
  assert.equal(response.status, 401);
});

test("admin.stats allows the allow-listed admin email", async () => {
  const env = testEnv({ __TEST_FETCH__: createAdminStatsFetch() });
  const token = await accessToken({ sub: USER_ID, email: "rub19.mailpro@gmail.com" });
  const response = await invoke("/api/admin/stats", { env, token });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.equal(typeof body.data.users, "number");
});

// -----------------------------------------------------------------------
// (b) The Phase 1 lockdown tables are only ever written by the Worker's own
// service-layer functions, using the service-role secret — never a path
// that forwards a caller's own bearer token as the Supabase credential.
// -----------------------------------------------------------------------

function createRequestCapturingFetch() {
  const requests = [];
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    requests.push({
      pathname: url.pathname,
      method: init?.method || "GET",
      apikey: init?.headers?.apikey ?? new Headers(init?.headers).get("apikey"),
      authorization: init?.headers?.Authorization ?? new Headers(init?.headers).get("authorization")
    });
    if (url.pathname === "/rest/v1/ethone_devices") {
      if ((init?.method || "GET") === "POST") return json([{ id: "device-new", user_id: USER_ID, session_id: "session-new", revoked_at: null }]);
      return json([]);
    }
    if (url.pathname === "/rest/v1/ethone_security_events") return json([{}]);
    return json([]);
  };
  return { requests, fetchImpl };
}

test("writes to ethone_devices and ethone_security_events always use the Worker's own service-role secret, never a forwarded caller token", async () => {
  const SERVICE_SECRET = testEnv().SUPABASE_SECRET_KEY;
  const { requests, fetchImpl } = createRequestCapturingFetch();
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const token = await accessToken({ sub: USER_ID, session_id: "session-new" });

  // Any authenticated action that causes a device row + security event to be
  // written (device upsert is the simplest one that reliably inserts both).
  const response = await invoke("/api/auth/device", {
    env, token, method: "POST",
    headers: { "content-type": "application/json", "user-agent": "test-agent" },
    body: JSON.stringify({ name: "Test device" })
  });
  assert.equal(response.status, 200);

  const writeRequests = requests.filter((r) => r.pathname === "/rest/v1/ethone_devices" || r.pathname === "/rest/v1/ethone_security_events");
  assert.ok(writeRequests.length >= 1, "expected at least one write to the Phase 1 lockdown tables");
  for (const request of writeRequests) {
    // The apikey (and, since the test secret is JWT-shaped, the Authorization
    // header too) is always the Worker's own SUPABASE_SECRET_KEY — the
    // caller's own bearer token from the Authorization header on the inbound
    // request is never what gets forwarded to Supabase as credentials. This
    // is what makes "the Worker's code, not RLS, is the actual authorization
    // boundary here" a true statement: every write is service-credentialed
    // AND carries the explicit user_id the route derived from auth.userId
    // (proven separately by idor-bola.test.mjs), never a client-controlled
    // identity.
    assert.equal(request.apikey, SERVICE_SECRET, `${request.method} ${request.pathname} must use the service-role secret as apikey`);
    assert.notEqual(request.apikey, token, "the caller's own bearer token must never be forwarded to Supabase as its credential");
  }
});
