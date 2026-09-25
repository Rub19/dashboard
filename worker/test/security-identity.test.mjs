import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { accessToken, invoke, json, mockSiteverify, payload, testEnv } from "./helpers.mjs";
import { resolveEmailLocale } from "../src/services/otp-service.js";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
});

function createMockSupabaseFetch() {
  return async (input, init) => {
    const siteverify = mockSiteverify(input, init);
    if (siteverify) return siteverify;
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
      // Forme réelle de GoTrue : champs à la racine (pas sous « properties »), avec le code à 6 chiffres `email_otp`.
      return json({ id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev", email_otp: "test-magic-link-token-hash", hashed_token: "hashed-not-preferred", verification_type: "magiclink", action_link: "https://example.com/auth/v1/verify?token=test-magic-link-token-hash&type=magiclink" });
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

test("auth precheck requires a valid email", async () => {
  const env = testEnv();
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/precheck", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "not-an-email", action: "signup" }) });
  assert.equal(response.status, 400);
  const body = await payload(response);
  assert.equal(body.error.code, "INVALID_PARAMETER");
});

test("auth precheck allows a fresh email/action pair through", async () => {
  const env = testEnv();
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/precheck", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev", action: "signup", turnstileToken: "valid-token::signup" }) });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.ok, true);
});

test("auth precheck defaults to a generic action when none is given", async () => {
  const env = testEnv();
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/precheck", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev", turnstileToken: "valid-token::generic" }) });
  assert.equal(response.status, 200);
});

test("auth precheck rejects a Turnstile token that fails verification", async () => {
  const env = testEnv();
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/precheck", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev", action: "signup", turnstileToken: "invalid-token" }) });
  assert.equal(response.status, 403);
  const body = await payload(response);
  assert.equal(body.error.code, "TURNSTILE_FAILED");
});

test("auth precheck rejects a Turnstile token solved for a different action", async () => {
  const env = testEnv();
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/precheck", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev", action: "signup", turnstileToken: "valid-token::reset_password" }) });
  assert.equal(response.status, 403);
  const body = await payload(response);
  assert.equal(body.error.code, "TURNSTILE_FAILED");
});

test("auth precheck returns 429 once the shared auth rate limit is exhausted, same as OTP", async () => {
  const env = testEnv({ RATE_LIMIT_STANDARD: { limit: async () => ({ success: false }) } });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/precheck", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "spammer@ethone.dev", action: "reset_password", turnstileToken: "valid-token::reset_password" }) });
  assert.equal(response.status, 429);
  const body = await payload(response);
  assert.equal(body.error.code, "AUTH_RATE_LIMITED");
});

test("otp send requires a valid email", async () => {
  const env = testEnv({ __TEST_FETCH__: createMockSupabaseFetch(), ENVIRONMENT: "development", ETHONE_DEBUG_OTP: "true" });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/send", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "not-an-email", turnstileToken: "valid-token::login_otp" }) });
  assert.equal(response.status, 400);
  const body = await payload(response);
  assert.equal(body.error.code, "INVALID_PARAMETER");
});

test("otp send returns debug code in development when enabled", async () => {
  const env = testEnv({ __TEST_FETCH__: createMockSupabaseFetch(), ENVIRONMENT: "development", ETHONE_DEBUG_OTP: "true" });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/send", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev", turnstileToken: "valid-token::login_otp" }) });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.equal(body.data.sent, true);
  assert.equal(typeof body.data.code, "string");
  assert.equal(body.data.code.length, 6);
});

test("otp send rejects a Turnstile token that fails verification", async () => {
  const env = testEnv({ __TEST_FETCH__: createMockSupabaseFetch(), ENVIRONMENT: "development", ETHONE_DEBUG_OTP: "true" });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/send", { auth: false, env, headers, method: "POST", body: JSON.stringify({ email: "qa@ethone.dev", turnstileToken: "invalid-token" }) });
  assert.equal(response.status, 403);
  const body = await payload(response);
  assert.equal(body.error.code, "TURNSTILE_FAILED");
});

async function hashOtp(code) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(code).toLowerCase().trim()));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

function otpVerifyMock({ codeHash, usedAt = null, expiresAt = new Date(Date.now() + 600000).toISOString() }) {
  return async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";
    // Le serveur retrouve toujours le compte à partir de l'e-mail (jamais d'un userId fourni par le client).
    if (url.pathname === "/auth/v1/admin/users") {
      return json({ users: [{ id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev" }] });
    }
    if (url.pathname === "/rest/v1/ethone_otp_codes" && method === "GET") {
      return json([{ id: "00000000-0000-4000-8000-000000000000", user_id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", contact: "qa@ethone.dev", code_hash: codeHash, attempts: 0, expires_at: expiresAt, used_at: usedAt, created_at: new Date().toISOString() }]);
    }
    // Device row for the session getOrCreateDevice creates before verify runs.
    if (url.pathname === "/rest/v1/ethone_devices") {
      if (method === "POST" || method === "PATCH") {
        return json([{ id: "11111111-1111-4111-8111-111111111111", user_id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", session_id: "s", revoked_at: null, mfa_pending: false }]);
      }
      return json([]); // GET by session -> none yet
    }
    if (url.pathname.startsWith("/rest/v1/ethone_")) return json([]);
    return json({});
  };
}

test("otp verify accepts the 4-field body and returns a token for the right code", async () => {
  const env = testEnv({ __TEST_FETCH__: otpVerifyMock({ codeHash: await hashOtp("123456") }) });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/verify", {
    auth: false, env, headers, method: "POST",
    body: JSON.stringify({ userId: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev", code: "123456", rememberMe: true }),
  });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.verified, true);
  assert.equal(typeof body.data.token, "string");
});

test("otp verify with a wrong code is a clean 401, not a 400/500", async () => {
  const env = testEnv({ __TEST_FETCH__: otpVerifyMock({ codeHash: await hashOtp("123456") }) });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/verify", {
    auth: false, env, headers, method: "POST",
    body: JSON.stringify({ userId: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev", code: "000000", rememberMe: false }),
  });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "TOTP_INVALID");
});

test("otp verify surfaces an expired code as OTP_EXPIRED, not a generic error", async () => {
  const env = testEnv({ __TEST_FETCH__: otpVerifyMock({ codeHash: await hashOtp("123456"), expiresAt: new Date(Date.now() - 1000).toISOString() }) });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/verify", {
    auth: false, env, headers, method: "POST",
    body: JSON.stringify({ userId: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev", code: "123456", rememberMe: false }),
  });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "OTP_EXPIRED");
});

test("otp verify resolves userId from email when the client didn't send one (e.g. lost a reloaded tab's in-memory state)", async () => {
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    const method = init?.method || "GET";
    if (url.pathname === "/auth/v1/admin/users") {
      return json({ users: [{ id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", email: "qa@ethone.dev" }] });
    }
    return otpVerifyMock({ codeHash: await hashOtp("123456") })(input, init);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/verify", {
    auth: false, env, headers, method: "POST",
    body: JSON.stringify({ email: "qa@ethone.dev", code: "123456", rememberMe: false }),
  });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.verified, true);
  assert.equal(typeof body.data.token, "string");
});

test("otp verify IGNORES a client-supplied userId (no account takeover via someone else's id)", async () => {
  const VICTIM_ID = "9b9b9b9b-9b9b-4b9b-8b9b-9b9b9b9b9b9b";
  const ATTACKER_ID = "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a";
  const otpQueries = [];
  const base = otpVerifyMock({ codeHash: await hashOtp("123456") });
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/rest/v1/ethone_otp_codes") otpQueries.push(url.search);
    return base(input, init);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const response = await invoke("/api/auth/otp/verify", {
    auth: false, env, headers: { "content-type": "application/json" }, method: "POST",
    // L'attaquant contrôle l'e-mail (donc reçoit le code) mais prétend être la victime.
    body: JSON.stringify({ userId: VICTIM_ID, email: "qa@ethone.dev", code: "123456", rememberMe: false }),
  });
  assert.equal(response.status, 200);
  const lookups = otpQueries.filter((q) => q.includes("user_id="));
  assert.ok(lookups.length > 0);
  for (const q of lookups) {
    assert.ok(q.includes(ATTACKER_ID), "le code doit être cherché pour le compte lié à l'e-mail");
    assert.equal(q.includes(VICTIM_ID), false, "le userId envoyé par le client ne doit jamais être utilisé");
  }
});

test("otp verify with no userId and an email with no account is a clean 404, not a 500", async () => {
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    if (url.pathname === "/auth/v1/admin/users") return json({ users: [] });
    return json([]);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const headers = { "content-type": "application/json" };
  const response = await invoke("/api/auth/otp/verify", {
    auth: false, env, headers, method: "POST",
    body: JSON.stringify({ email: "nobody@ethone.dev", code: "123456", rememberMe: false }),
  });
  assert.equal(response.status, 404);
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
