import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, payload, testEnv } from "./helpers.mjs";
import { resolveEmailLocale } from "../src/services/otp-service.js";

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

    if (url.pathname.startsWith("/auth/v1/admin/users/")) {
      return json({ id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev" });
    }

    if (url.pathname === "/auth/v1/admin/generate_link") {
      return json({ properties: { hashed_token: "test-magic-link-token-hash", action_link: "https://example.com/auth/v1/verify?token=test-magic-link-token-hash&type=magiclink" } });
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

test("OTP email locale follows the browser language, English for anything unsupported", () => {
  // Supported browser languages win, respecting the Accept-Language priority order.
  assert.equal(resolveEmailLocale("fr-FR,fr;q=0.9,en;q=0.8", "FR"), "fr");
  assert.equal(resolveEmailLocale("de-DE,de;q=0.9", ""), "de");
  assert.equal(resolveEmailLocale("es-ES", ""), "es");
  assert.equal(resolveEmailLocale("en-US,en;q=0.9", ""), "en");
  // Unsupported browser language -> English, NOT a guess from the country
  // (a Portuguese speaker in Germany must not get a German email).
  assert.equal(resolveEmailLocale("pt-BR,pt;q=0.9", "DE"), "en");
  assert.equal(resolveEmailLocale("it-IT", "FR"), "en");
  // First supported tag in the list wins even if an unsupported one precedes it.
  assert.equal(resolveEmailLocale("pt-BR,pt;q=0.9,fr;q=0.5", ""), "fr");
  // No Accept-Language at all -> country fallback, then English.
  assert.equal(resolveEmailLocale("", "DE"), "de");
  assert.equal(resolveEmailLocale("", "BR"), "en");
  assert.equal(resolveEmailLocale("", ""), "en");
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
