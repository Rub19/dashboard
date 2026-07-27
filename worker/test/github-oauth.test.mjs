import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { USER_ID, invoke, json, payload, testEnv } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
});

function supabaseRpcFetch({ getResponse, setCalls = [], deleteCalls = [] } = {}) {
  return async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") throw new Error(`Unexpected destination: ${url.href}`);
    const body = init.body ? JSON.parse(init.body) : {};
    if (url.pathname === "/rest/v1/rpc/get_oauth_token") return json(getResponse ?? []);
    if (url.pathname === "/rest/v1/rpc/set_oauth_token") {
      setCalls.push(body);
      return json(null);
    }
    if (url.pathname === "/rest/v1/rpc/delete_oauth_token") {
      deleteCalls.push(body);
      return json(null);
    }
    throw new Error(`Unexpected Supabase path: ${url.pathname}`);
  };
}

test("GitHub OAuth exchange stores the returned access token for the authenticated user", async () => {
  const setCalls = [];
  const githubCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "github.com") {
        githubCalls.push(new URLSearchParams(init.body).get("client_secret"));
        return json({ access_token: "fresh-access", scope: "read:user", token_type: "bearer" });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/github/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: "c".repeat(20) })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(githubCalls[0], "g".repeat(32));
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
  assert.equal(setCalls[0].next_refresh_token, "");
  assert.equal(setCalls[0].next_expires_at, null);
});

test("GitHub OAuth exchange rejects a provider error response", async () => {
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "github.com") return json({ error: "bad_verification_code" });
      return supabaseRpcFetch()(input, init);
    }
  });
  const response = await invoke("/api/github/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: "c".repeat(20) })
  });
  assert.equal(response.status, 502);
});

test("GitHub profile returns the normalized profile and most recent public event", async () => {
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.github.com" && url.pathname === "/user") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({ login: "rub19", name: "Rub19", avatar_url: "https://avatars.githubusercontent.com/u/1", html_url: "https://github.com/rub19", public_repos: 12, followers: 3 });
      }
      if (url.hostname === "api.github.com" && url.pathname === "/users/rub19/events/public") {
        return json([{ type: "PushEvent", repo: { name: "rub19/dashboard" }, created_at: "2026-07-27T10:00:00Z" }]);
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: null, scope: "read:user", expires_at: null }] })(input, init);
    }
  });
  const response = await invoke("/api/github/profile", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.login, "rub19");
  assert.equal(body.data.name, "Rub19");
  assert.equal(body.data.recentEvent.kind, "Push");
  assert.equal(body.data.recentEvent.repo, "rub19/dashboard");
});

test("GitHub profile rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke("/api/github/profile", { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("GitHub disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/github/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("GitHub exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/github/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: "c".repeat(20) })
  });
  assert.equal(response.status, 400);
});
