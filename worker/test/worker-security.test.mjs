import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { beforeEach } from "node:test";
import { clearJwksCache } from "../src/middleware/auth.js";
import { clearLocalRateLimits } from "../src/middleware/rate-limit.js";
import { clearCache } from "../src/utils/cache.js";
import { clearTwitchToken } from "../src/services/twitch-client.js";
import { accessToken, invoke, json, payload, providerFetch, testEnv } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearJwksCache();
  clearLocalRateLimits();
  clearTwitchToken();
});

test("health is public, does not probe providers and returns strict headers", async () => {
  let calls = 0;
  const response = await invoke("/health", { auth: false, env: testEnv({ __TEST_FETCH__: async () => { calls += 1; return json({}); } }) });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.data.status, "ok");
  assert.equal(calls, 0);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://ethone.dev");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
});

test("CORS allows the production origin and rejects unknown origins", async () => {
  const allowed = await invoke("/health", { auth: false, origin: "https://ethone.dev" });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("vary"), "Origin");
  assert.equal(allowed.headers.get("access-control-expose-headers"), "X-Request-Id, Retry-After");
  const denied = await invoke("/health", { auth: false, origin: "https://attacker.example" });
  assert.equal(denied.status, 403);
  assert.equal((await payload(denied)).error.code, "CORS_ORIGIN_DENIED");
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
  const unconfiguredAlias = await invoke("/health", { auth: false, origin: "https://www.ethone.dev" });
  assert.equal(unconfiguredAlias.status, 403);
});

test("preflight accepts only allowlisted routes, methods and headers", async () => {
  const response = await invoke("/api/diagnostic", {
    auth: false,
    method: "OPTIONS",
    headers: {
      "access-control-request-method": "GET",
      "access-control-request-headers": "authorization, x-request-id"
    }
  });
  assert.equal(response.status, 204);
  const rejected = await invoke("/api/diagnostic", {
    auth: false,
    method: "OPTIONS",
    headers: { "access-control-request-method": "DELETE" }
  });
  assert.equal(rejected.status, 405);
});

test("private routes reject missing, malformed, tampered and expired JWTs", async () => {
  const missing = await invoke("/api/diagnostic", { auth: false });
  assert.equal(missing.status, 401);
  assert.equal((await payload(missing)).error.code, "AUTH_REQUIRED");

  const malformed = await invoke("/api/diagnostic", { token: "not-a-jwt" });
  assert.equal(malformed.status, 401);
  assert.equal((await payload(malformed)).error.code, "AUTH_INVALID");

  const valid = await accessToken();
  const tampered = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;
  const invalid = await invoke("/api/diagnostic", { token: tampered });
  assert.equal(invalid.status, 401);
  assert.equal((await payload(invalid)).error.code, "AUTH_INVALID");

  const expired = await invoke("/api/diagnostic", { token: await accessToken({ exp: Math.floor(Date.now() / 1000) - 120 }) });
  assert.equal(expired.status, 401);
  assert.equal((await payload(expired)).error.code, "AUTH_EXPIRED");

  const wrongRole = await invoke("/api/diagnostic", { token: await accessToken({ role: "anon" }) });
  assert.equal(wrongRole.status, 401);
  assert.equal((await payload(wrongRole)).error.code, "AUTH_INVALID");
});

test("verified user identity comes from the signed token", async () => {
  const response = await invoke("/api/diagnostic?service=steam", { token: await accessToken(), headers: { "x-user-id": "00000000-0000-4000-8000-000000000000" } });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.worker, "connected");
  assert.equal(body.data.services[0].id, "steam");
});

test("asymmetric Supabase JWTs are verified against the project JWKS", async () => {
  const keys = await crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  }, true, ["sign", "verify"]);
  const publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "RS256", typ: "JWT", kid: "ethone-jwks-test" });
  const claims = encode({
    iss: "https://project-ref.supabase.co/auth/v1",
    aud: "authenticated",
    sub: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a",
    role: "authenticated",
    iat: now - 5,
    exp: now + 300
  });
  const input = `${header}.${claims}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
  const token = `${input}.${Buffer.from(signature).toString("base64url")}`;
  const env = testEnv({
    SUPABASE_JWT_SECRET: undefined,
    __TEST_FETCH__: async (url) => {
      assert.equal(String(url), "https://project-ref.supabase.co/auth/v1/.well-known/jwks.json");
      return json({ keys: [{ ...publicKey, kid: "ethone-jwks-test", alg: "RS256", use: "sig" }] });
    }
  });
  const response = await invoke("/api/diagnostic?service=steam", { token, env });
  assert.equal(response.status, 200);
  assert.equal((await payload(response)).ok, true);
});

test("invalid parameters and unlisted endpoints are rejected before upstream access", async () => {
  let calls = 0;
  const env = testEnv({ __TEST_FETCH__: async () => { calls += 1; return json({}); } });
  const invalid = await invoke("/api/steam/player?steamId=../../metadata", { env });
  assert.equal(invalid.status, 400);
  assert.equal((await payload(invalid)).error.code, "INVALID_PARAMETER");
  const extra = await invoke("/api/lastfm/recent-tracks?username=ethone&url=https://internal.example", { env });
  assert.equal(extra.status, 400);
  const missing = await invoke("/api/lastfm/proxy?url=https://example.test", { env });
  assert.equal(missing.status, 404);
  assert.equal((await payload(missing)).error.code, "ROUTE_NOT_FOUND");
  const oversizedUrl = await invoke(`/health?${"x".repeat(4100)}`, { env, auth: false });
  assert.equal(oversizedUrl.status, 414);
  assert.equal(calls, 0);
});

test("rate limiting returns 429 and Retry-After without retrying", async () => {
  const env = testEnv({ RATE_LIMIT_STRICT: { limit: async () => ({ success: false }) } });
  const response = await invoke("/api/diagnostic", { env });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "60");
  assert.equal((await payload(response)).error.code, "RATE_LIMITED");

  const publicResponse = await invoke("/health", {
    auth: false,
    env: testEnv({ RATE_LIMIT_EDGE: { limit: async () => ({ success: false }) } })
  });
  assert.equal(publicResponse.status, 429);
  assert.equal(publicResponse.headers.get("retry-after"), "60");
});

test("external timeout and non-JSON responses are normalized", async () => {
  const timeoutFetch = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  const timedOut = await invoke("/api/steam/player?steamId=76561198000000000", { env: testEnv({ __TEST_FETCH__: timeoutFetch, OUTBOUND_TIMEOUT_MS: "10" }) });
  assert.equal(timedOut.status, 504);
  assert.equal((await payload(timedOut)).error.code, "UPSTREAM_TIMEOUT");

  const invalid = await invoke("/api/steam/player?steamId=76561198000000000", { env: testEnv({ __TEST_FETCH__: async () => new Response("<html></html>", { headers: { "content-type": "text/html" } }) }) });
  assert.equal(invalid.status, 502);
  assert.equal((await payload(invalid)).error.code, "UPSTREAM_INVALID_RESPONSE");

  const oversized = await invoke("/api/steam/player?steamId=76561198000000000", {
    env: testEnv({ __TEST_FETCH__: async () => json({ value: "x".repeat(1024 * 1024 + 1) }) })
  });
  assert.equal(oversized.status, 502);
  assert.equal((await payload(oversized)).error.code, "UPSTREAM_INVALID_RESPONSE");
});

test("temporary provider failures are bounded and retryable", async () => {
  let calls = 0;
  const env = testEnv({ __TEST_FETCH__: async (input) => {
    if (new URL(String(input)).hostname === "api.steampowered.com") calls += 1;
    return json({ error: "down" }, { status: 503 });
  } });
  const response = await invoke("/api/steam/player?steamId=76561198000000000", { env });
  assert.equal(response.status, 503);
  assert.equal((await payload(response)).error.retryable, true);
  assert.equal(calls, 2);
});

test("public provider cache deduplicates without caching private Supabase data", async () => {
  const counter = { calls: 0 };
  const env = testEnv({ __TEST_FETCH__: providerFetch(counter) });
  const first = await invoke("/api/steam/player?steamId=76561198000000000", { env });
  const second = await invoke("/api/steam/player?steamId=76561198000000000", { env });
  assert.equal((await payload(first)).meta.cached, false);
  assert.equal((await payload(second)).meta.cached, true);
  assert.equal(counter.calls, 2);

  await invoke("/api/supabase/public-profile?username=ethone", { env });
  await invoke("/api/supabase/public-profile?username=ethone", { env });
  assert.equal(counter.calls, 4);
});

test("a user's own provider credential overrides the shared Worker secret", async () => {
  const captured = [];
  const env = testEnv({ __TEST_FETCH__: async (input, init) => {
    const url = new URL(String(input));
    captured.push(url);
    if (url.pathname === "/rest/v1/rpc/get_provider_credential") return json({ apiKey: "personal-steam-key-1234" });
    if (url.hostname === "api.steampowered.com") {
      assert.equal(url.searchParams.get("key"), "personal-steam-key-1234");
      return json({ response: { players: [{ steamid: "76561198000000000", personaname: "Owner" }] } });
    }
    throw new Error("Unexpected test destination");
  } });
  const response = await invoke("/api/steam/player?steamId=76561198000000000", { env });
  assert.equal(response.status, 200);
  assert.equal((await payload(response)).data.displayName, "Owner");
});

test("Twitch app tokens are cached per client credential set, not globally", async () => {
  const tokenRequests = [];
  const env = testEnv({ __TEST_FETCH__: async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/rest/v1/rpc/get_provider_credential") {
      return json({ clientId: "owner-client-id", clientSecret: "owner-client-secret-value" });
    }
    if (url.hostname === "id.twitch.tv") {
      tokenRequests.push(new URLSearchParams(init.body).get("client_id"));
      return json({ access_token: `token-for-${tokenRequests.at(-1)}`, expires_in: 3600 });
    }
    if (url.hostname === "api.twitch.tv") {
      assert.equal(init.headers["Client-Id"], "owner-client-id");
      assert.equal(init.headers.Authorization, "Bearer token-for-owner-client-id");
      return url.pathname === "/helix/users"
        ? json({ data: [{ id: "1", login: "ethoneqa", display_name: "Owner", profile_image_url: "https://static-cdn.jtvnw.net/a.png" }] })
        : json({ data: [] });
    }
    throw new Error("Unexpected test destination");
  } });
  const response = await invoke("/api/twitch/channel?login=ethoneqa", { env });
  assert.equal(response.status, 200);
  assert.equal(tokenRequests.length, 1);
});

test("Supabase lookup strips private fields and logs never contain credentials", async () => {
  const logs = [];
  const env = testEnv({ __TEST_LOGGER__: { info(value) { logs.push(value); } } });
  const response = await invoke("/api/supabase/public-profile?username=ethone", { env });
  const text = await response.text();
  assert.equal(response.status, 200);
  assert.doesNotMatch(text, /email|private_note|must-not-leak/i);
  const combined = `${text}\n${logs.join("\n")}`;
  for (const value of [env.SUPABASE_SECRET_KEY, env.STEAM_API_KEY, env.TRACKER_API_KEY, env.TWITCH_CLIENT_SECRET, env.LASTFM_API_KEY]) {
    assert.equal(combined.includes(value), false);
  }
});

test("Supabase service calls use modern secret keys as apikey-only and retain legacy JWT compatibility", async () => {
  const modernSecret = ["sb", "secret", "worker", "rotation", "value"].join("_");
  const legacySecret = ["legacy-header", "legacy-payload", "legacy-signature"].join(".");
  const captured = [];
  const fetcher = async (_input, init) => {
    captured.push(new Headers(init.headers));
    return json([]);
  };

  await invoke("/api/supabase/public-profile?username=modern", {
    env: testEnv({ SUPABASE_SECRET_KEY: modernSecret, __TEST_FETCH__: fetcher })
  });
  await invoke("/api/supabase/public-profile?username=legacy", {
    env: testEnv({ SUPABASE_SECRET_KEY: legacySecret, __TEST_FETCH__: fetcher })
  });

  assert.equal(captured[0].get("apikey"), modernSecret);
  assert.equal(captured[0].has("authorization"), false);
  assert.equal(captured[1].get("apikey"), legacySecret);
  assert.equal(captured[1].get("authorization"), `Bearer ${legacySecret}`);
});

test("Worker sources contain no committed private credential", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const files = [];
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:js|mjs|jsonc|md)$/.test(entry.name)) files.push(absolute);
  });
  walk(path.join(root, "src"));
  files.push(path.join(root, "wrangler.jsonc"), path.join(root, "package.json"));
  const source = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /(?:ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/);
});

test("fetch() never requests the unsupported redirect:\"error\" mode", () => {
  // Cloudflare Workers only implements redirect "follow" or "manual" on fetch();
  // "error" throws a TypeError at the edge even though it is valid in browsers
  // and Node, so the local __TEST_FETCH__ mock never catches this class of bug.
  const root = path.resolve(import.meta.dirname, "..", "src");
  const files = [];
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (/\.(?:js|mjs)$/.test(entry.name)) files.push(absolute);
  });
  walk(root);
  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /redirect:\s*["']error["']/, `${path.relative(root, file)} uses the unsupported redirect: "error" fetch option`);
  });
});
