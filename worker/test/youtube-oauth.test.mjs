import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { USER_ID, invoke, json, payload, testEnv } from "./helpers.mjs";

const CLIENT_ID = `${"c".repeat(20)}.apps.googleusercontent.com`;

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

test("YouTube OAuth exchange stores the returned tokens for the authenticated user", async () => {
  const setCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "oauth2.googleapis.com") {
        return json({ access_token: "fresh-access", refresh_token: "fresh-refresh", scope: "https://www.googleapis.com/auth/youtube.readonly", expires_in: 3600 });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/youtube/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: CLIENT_ID })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
});

test("YouTube activity returns channel info and latest video using a valid stored token", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/youtube/v3/channels") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({ items: [{ id: "chan1", snippet: { title: "ETHONE QA", thumbnails: { default: { url: "https://yt3.ggpht.com/avatar.jpg" } } }, statistics: { subscriberCount: "42", videoCount: "7" } }] });
      }
      if (url.hostname === "www.googleapis.com" && url.pathname === "/youtube/v3/search") {
        return json({ items: [{ id: { videoId: "vid1" }, snippet: { title: "Nouvelle video", publishedAt: "2026-07-28T09:00:00Z", thumbnails: { medium: { url: "https://i.ytimg.com/vi/vid1/mqdefault.jpg" } } } }] });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "youtube.readonly", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/youtube/activity?clientId=${CLIENT_ID}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.channel.title, "ETHONE QA");
  assert.equal(body.data.latestVideo.title, "Nouvelle video");
});

test("YouTube activity rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke(`/api/youtube/activity?clientId=${CLIENT_ID}`, { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("YouTube disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/youtube/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("YouTube exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/youtube/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: CLIENT_ID })
  });
  assert.equal(response.status, 400);
});
