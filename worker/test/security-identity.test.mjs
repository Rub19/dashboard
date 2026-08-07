import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
});

function createMockSupabaseFetch() {
  return async (input) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });

    if (url.pathname === "/rest/v1/ethone_otp_codes" && url.searchParams.has("user_id")) {
      return json([{ id: "00000000-0000-4000-8000-000000000000", user_id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", contact: "qa@ethone.dev", code_hash: "", attempts: 0, expires_at: new Date(Date.now() + 600000).toISOString(), used_at: null, created_at: new Date().toISOString() }]);
    }

    if (url.pathname === "/auth/v1/admin/users" && url.searchParams.get("email") === "qa@ethone.dev") {
      return json({ users: [{ id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev" }] });
    }

    if (url.pathname.startsWith("/rest/v1/ethone_")) {
      return json([]);
    }

    if (url.pathname === "/auth/v1/otp") return json({});

    return json({});
  };
}

test("passkey register options requires authentication", async () => {
  const response = await invoke("/api/auth/passkey/register-options", { auth: false, method: "POST", body: JSON.stringify({}) });
  assert.equal(response.status, 401);
});

test("otp send requires a valid email", async () => {
  const env = testEnv({ __TEST_FETCH__: createMockSupabaseFetch(), ENVIRONMENT: "development", ETHONE_DEBUG_OTP: "true" });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/send", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "not-an-email" }) });
  assert.equal(response.status, 400);
  const body = await payload(response);
  assert.equal(body.error.code, "INVALID_PARAMETER");
});

test("otp send returns debug code in development when enabled", async () => {
  const env = testEnv({ __TEST_FETCH__: createMockSupabaseFetch(), ENVIRONMENT: "development", ETHONE_DEBUG_OTP: "true" });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/send", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev" }) });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.equal(body.data.sent, true);
  assert.equal(typeof body.data.code, "string");
  assert.equal(body.data.code.length, 6);
});

test("device list requires authentication", async () => {
  const response = await invoke("/api/auth/devices", { auth: false });
  assert.equal(response.status, 401);
});

test("device list returns devices for an authenticated user", async () => {
  const env = testEnv({ __TEST_FETCH__: createMockSupabaseFetch() });
  const response = await invoke("/api/auth/devices", { env });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.ok(Array.isArray(body.data));
});
