import assert from "node:assert/strict";
import test from "node:test";
import { beginOAuthAuthorize, consumeOAuthCallback, readPendingOAuthAuthorize } from "../v8/services/oauth-callback.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function testRuntime() {
  let assigned = "";
  return {
    crypto: globalThis.crypto,
    sessionStorage: memoryStorage(),
    location: {
      href: "https://ethone.dev/",
      assign: (url) => { assigned = url; }
    },
    get assignedUrl() { return assigned; }
  };
}

test("beginOAuthAuthorize always sets response_type=code, even without PKCE", async () => {
  const runtime = testRuntime();
  const started = await beginOAuthAuthorize({ provider: "github", clientId: "client-123", authorizeUrl: "https://github.com/login/oauth/authorize", scope: "read:user" }, runtime);
  assert.equal(started, true);
  const url = new URL(runtime.assignedUrl);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("client_id"), "client-123");
  assert.equal(url.searchParams.get("scope"), "read:user");
  assert.ok(url.searchParams.get("state"));
  assert.equal(url.searchParams.has("code_challenge"), false);
});

test("beginOAuthAuthorize adds PKCE parameters and stores the verifier for later exchange", async () => {
  const runtime = testRuntime();
  await beginOAuthAuthorize({ provider: "spotify", clientId: "client-abc", authorizeUrl: "https://accounts.spotify.com/authorize", scope: "user-read-currently-playing", pkce: true }, runtime);
  const url = new URL(runtime.assignedUrl);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("code_challenge"));
  const pending = readPendingOAuthAuthorize(runtime);
  assert.equal(pending.provider, "spotify");
  assert.ok(pending.verifier);
});

test("beginOAuthAuthorize applies extra provider-specific params without overriding the standard ones", async () => {
  const runtime = testRuntime();
  await beginOAuthAuthorize({ provider: "notion", clientId: "client-xyz", authorizeUrl: "https://api.notion.com/v1/oauth/authorize", extraParams: { owner: "user" } }, runtime);
  const url = new URL(runtime.assignedUrl);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("owner"), "user");
});

test("consumeOAuthCallback strips code/state/error from the URL and returns them once", () => {
  const runtime = {
    location: { href: "https://ethone.dev/?code=abc123&state=xyz789" },
    history: { replaceState(_state, _title, url) { runtime.location.href = `https://ethone.dev${url}`; } }
  };
  const result = consumeOAuthCallback(runtime);
  assert.equal(result.code, "abc123");
  assert.equal(result.state, "xyz789");
  assert.equal(runtime.location.href, "https://ethone.dev/");
});
