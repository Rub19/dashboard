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

test("Google Calendar OAuth exchange stores the returned tokens for the authenticated user", async () => {
  const setCalls = [];
  const googleCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "oauth2.googleapis.com") {
        googleCalls.push(new URLSearchParams(init.body).get("grant_type"));
        return json({ access_token: "fresh-access", refresh_token: "fresh-refresh", scope: "https://www.googleapis.com/auth/calendar.readonly", expires_in: 3600 });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/google-calendar/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: CLIENT_ID })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(googleCalls[0], "authorization_code");
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
  assert.equal(setCalls[0].next_refresh_token, "fresh-refresh");
});

test("Google Calendar events returns upcoming events using a valid stored token", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({ items: [{ id: "evt1", summary: "Standup", start: { dateTime: "2026-07-28T09:00:00Z" }, end: { dateTime: "2026-07-28T09:30:00Z" } }] });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "calendar.readonly", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/google-calendar/events?clientId=${CLIENT_ID}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.events.length, 1);
  assert.equal(body.data.events[0].title, "Standup");
});

test("Google Calendar events refreshes an expired token before calling the API", async () => {
  const pastExpiry = new Date(Date.now() - 1000).toISOString();
  const setCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "oauth2.googleapis.com") {
        assert.equal(new URLSearchParams(init.body).get("grant_type"), "refresh_token");
        return json({ access_token: "rotated-access-token", expires_in: 3600 });
      }
      if (url.hostname === "www.googleapis.com") {
        assert.equal(init.headers.authorization, "Bearer rotated-access-token");
        return json({ items: [] });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stale-access-token", refresh_token: "stored-refresh-token", scope: "calendar.readonly", expires_at: pastExpiry }], setCalls })(input, init);
    }
  });
  const response = await invoke(`/api/google-calendar/events?clientId=${CLIENT_ID}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.deepEqual(body.data.events, []);
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].next_access_token, "rotated-access-token");
  assert.equal(setCalls[0].next_refresh_token, "stored-refresh-token");
});

test("Google Calendar events rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke(`/api/google-calendar/events?clientId=${CLIENT_ID}`, { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("Google Calendar disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/google-calendar/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("Google Calendar exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/google-calendar/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: CLIENT_ID })
  });
  assert.equal(response.status, 400);
});
