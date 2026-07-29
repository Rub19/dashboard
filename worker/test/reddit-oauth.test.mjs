import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { USER_ID, invoke, json, payload, testEnv } from "./helpers.mjs";

const CLIENT_ID = "r".repeat(20);

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

test("Reddit OAuth exchange authenticates with Basic auth and a User-Agent, then stores the tokens", async () => {
  const setCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.reddit.com") {
        assert.match(init.headers.authorization, /^Basic /);
        assert.match(init.headers["user-agent"], /ethone-worker/);
        assert.equal(new URLSearchParams(init.body).get("grant_type"), "authorization_code");
        return json({ access_token: "fresh-access", refresh_token: "fresh-refresh", scope: "identity history", expires_in: 3600 });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/reddit/oauth/exchange", {
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

test("Reddit activity returns the profile and latest post using a valid stored token", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "oauth.reddit.com" && url.pathname === "/api/v1/me") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        assert.match(init.headers["user-agent"], /ethone-worker/);
        return json({ name: "ethone_qa", icon_img: "https://styles.redditmedia.com/avatar.png?width=256", link_karma: 100, comment_karma: 50 });
      }
      if (url.hostname === "oauth.reddit.com" && url.pathname.startsWith("/user/")) {
        return json({ data: { children: [{ data: { id: "post1", title: "Hello ETHONE", subreddit_name_prefixed: "r/test", permalink: "/r/test/comments/post1/hello/", created_utc: 1700000000 } }] } });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "identity history", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/reddit/activity?clientId=${CLIENT_ID}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.profile.username, "ethone_qa");
  assert.equal(body.data.latestPost.title, "Hello ETHONE");
});

test("Reddit activity rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke(`/api/reddit/activity?clientId=${CLIENT_ID}`, { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("Reddit disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/reddit/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("Reddit exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/reddit/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: CLIENT_ID })
  });
  assert.equal(response.status, 400);
});
