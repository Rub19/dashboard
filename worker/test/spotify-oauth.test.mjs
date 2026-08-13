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

test("Spotify OAuth exchange stores the returned tokens for the authenticated user", async () => {
  const setCalls = [];
  const spotifyCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "accounts.spotify.com") {
        spotifyCalls.push(new URLSearchParams(init.body).get("grant_type"));
        return json({ access_token: "fresh-access", refresh_token: "fresh-refresh", scope: "user-read-currently-playing", expires_in: 3600 });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/spotify/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), codeVerifier: "v".repeat(64), clientId: "c".repeat(32) })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(spotifyCalls[0], "authorization_code");
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
  assert.equal(setCalls[0].next_refresh_token, "fresh-refresh");
});

test("Spotify now-playing returns the current track using a valid stored token", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.spotify.com") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({
          is_playing: true,
          progress_ms: 30000,
          item: { id: "track1", name: "Stressed Out", duration_ms: 210000, artists: [{ name: "Twenty One Pilots" }], album: { name: "Blurryface", images: [{ url: "https://i.scdn.co/image/test" }] } }
        });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "user-read-currently-playing", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/spotify/now-playing?clientId=${"c".repeat(32)}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.playing, true);
  assert.equal(body.data.track.title, "Stressed Out");
  assert.equal(body.data.track.artist, "Twenty One Pilots");
});

test("Spotify now-playing refreshes an expired token before calling the API", async () => {
  const pastExpiry = new Date(Date.now() - 1000).toISOString();
  const setCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "accounts.spotify.com") {
        assert.equal(new URLSearchParams(init.body).get("grant_type"), "refresh_token");
        return json({ access_token: "rotated-access-token", expires_in: 3600 });
      }
      if (url.hostname === "api.spotify.com") {
        assert.equal(init.headers.authorization, "Bearer rotated-access-token");
        return new Response(null, { status: 204 });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stale-access-token", refresh_token: "stored-refresh-token", scope: "user-read-currently-playing", expires_at: pastExpiry }], setCalls })(input, init);
    }
  });
  const response = await invoke(`/api/spotify/now-playing?clientId=${"c".repeat(32)}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.playing, false);
  assert.equal(body.data.track, null);
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].next_access_token, "rotated-access-token");
  assert.equal(setCalls[0].next_refresh_token, "stored-refresh-token");
});

test("Spotify now-playing rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke(`/api/spotify/now-playing?clientId=${"c".repeat(32)}`, { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("Spotify control sends a PUT to play and a POST to next using a valid stored token", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.spotify.com") {
        calls.push({ path: url.pathname, method: init.method, authorization: init.headers.authorization });
        return new Response(null, { status: 204 });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "user-modify-playback-state", expires_at: futureExpiry }] })(input, init);
    }
  });
  const playResponse = await invoke("/api/spotify/control", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "play", clientId: "c".repeat(32) })
  });
  assert.equal(playResponse.status, 200);
  assert.equal((await payload(playResponse)).data.action, "play");

  const nextResponse = await invoke("/api/spotify/control", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "next", clientId: "c".repeat(32) })
  });
  assert.equal(nextResponse.status, 200);

  assert.deepEqual(calls, [
    { path: "/v1/me/player/play", method: "PUT", authorization: "Bearer stored-access-token" },
    { path: "/v1/me/player/next", method: "POST", authorization: "Bearer stored-access-token" }
  ]);
});

test("Spotify seek sends a PUT to /v1/me/player/seek with position_ms", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const calls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.spotify.com") {
        calls.push({ path: url.pathname, method: init.method, authorization: init.headers.authorization });
        return new Response(null, { status: 204 });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "user-modify-playback-state", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke("/api/spotify/control", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "seek", clientId: "c".repeat(32), positionMs: 12345 })
  });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.data.action, "seek");
  assert.equal(body.data.positionMs, 12345);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/v1/me/player/seek");
  assert.equal(calls[0].method, "PUT");
});

test("Spotify seek rejects an invalid positionMs", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/spotify/control", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "seek", clientId: "c".repeat(32), positionMs: -1 })
  });
  assert.equal(response.status, 400);
});

test("Spotify control surfaces a not-found error when there is no active device", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.spotify.com") return json({ error: { status: 404, message: "NO_ACTIVE_DEVICE" } }, { status: 404 });
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "user-modify-playback-state", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke("/api/spotify/control", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "pause", clientId: "c".repeat(32) })
  });
  assert.equal(response.status, 404);
});

test("Spotify control rejects an invalid action", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/spotify/control", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "shuffle", clientId: "c".repeat(32) })
  });
  assert.equal(response.status, 400);
});

test("Spotify disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/spotify/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("Spotify exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/spotify/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", codeVerifier: "v".repeat(64), clientId: "c".repeat(32) })
  });
  assert.equal(response.status, 400);
});
