import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { USER_ID, invoke, json, payload, testEnv } from "./helpers.mjs";

const CLIENT_ID = "d".repeat(32);

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

test("Todoist OAuth exchange stores the returned access token for the authenticated user", async () => {
  const setCalls = [];
  const todoistCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "todoist.com") {
        todoistCalls.push(new URLSearchParams(init.body).get("client_secret"));
        return json({ access_token: "fresh-access", token_type: "Bearer" });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/todoist/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: CLIENT_ID })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(todoistCalls[0], "j".repeat(32));
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
  assert.equal(setCalls[0].next_refresh_token, "");
});

test("Todoist tasks returns the earliest due task using a valid stored token", async () => {
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.todoist.com") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json([
          { id: "t1", content: "Later task", due: { date: "2026-08-01" }, priority: 1 },
          { id: "t2", content: "Sooner task", due: { date: "2026-07-29" }, priority: 3 }
        ]);
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: null, scope: "Bearer", expires_at: null }] })(input, init);
    }
  });
  const response = await invoke("/api/todoist/tasks", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.task.content, "Sooner task");
  assert.equal(body.data.openCount, 2);
});

test("Todoist tasks rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke("/api/todoist/tasks", { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("Todoist disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/todoist/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("Todoist exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/todoist/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: CLIENT_ID })
  });
  assert.equal(response.status, 400);
});
