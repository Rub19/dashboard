import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { USER_ID, invoke, json, payload, testEnv } from "./helpers.mjs";

const CLIENT_ID = "01234567-89ab-cdef-0123-456789abcdef";

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

test("Notion OAuth exchange stores the returned access token for the authenticated user", async () => {
  const setCalls = [];
  const notionCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.notion.com" && url.pathname === "/v1/oauth/token") {
        notionCalls.push(init.headers.authorization);
        return json({ access_token: "fresh-access", workspace_name: "Rub19 Workspace", bot_id: "bot1" });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/notion/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: CLIENT_ID })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.match(notionCalls[0], /^Basic /);
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
  assert.equal(setCalls[0].next_refresh_token, "");
  assert.equal(setCalls[0].next_expires_at, null);
});

test("Notion pages returns recently edited pages using a valid stored token", async () => {
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "api.notion.com" && url.pathname === "/v1/search") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        assert.equal(init.headers["notion-version"], "2022-06-28");
        return json({
          results: [{
            object: "page",
            id: "page1",
            url: "https://notion.so/page1",
            last_edited_time: "2026-07-28T10:00:00.000Z",
            properties: { Name: { type: "title", title: [{ plain_text: "Roadmap" }] } }
          }]
        });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: null, scope: "Rub19 Workspace", expires_at: null }] })(input, init);
    }
  });
  const response = await invoke("/api/notion/pages", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.pages.length, 1);
  assert.equal(body.data.pages[0].title, "Roadmap");
  assert.equal(body.data.pages[0].kind, "Page");
});

test("Notion pages rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke("/api/notion/pages", { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("Notion disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/notion/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("Notion exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/notion/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: CLIENT_ID })
  });
  assert.equal(response.status, 400);
});
