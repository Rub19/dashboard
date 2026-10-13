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

test("Riot OAuth status reports approvalRequired when RSO credentials are not configured", async () => {
  const env = testEnv();
  const response = await invoke("/api/riot/oauth/status", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.available, false);
  assert.equal(body.data.approvalRequired, true);
  assert.equal(body.data.connected, false);
  assert.match(body.data.reason, /Riot approval required/i);
});

test("Riot OAuth URL rejects with 503 when RSO credentials are unconfigured", async () => {
  const env = testEnv();
  const response = await invoke("/api/riot/oauth/url", { env });
  assert.equal(response.status, 503);
});

test("Riot OAuth disconnect deletes stored token for authenticated user", async () => {
  const deleteCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      return supabaseRpcFetch({ deleteCalls })(input, init);
    },
  });
  const response = await invoke("/api/riot/oauth/disconnect", {
    env,
    method: "POST",
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.disconnected, true);
  assert.equal(deleteCalls.length, 1);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
  assert.equal(deleteCalls[0].requested_provider, "riot");
});

test("Riot OAuth generates valid authorization URL when configured with credentials", async () => {
  const env = testEnv({
    RIOT_RSO_CLIENT_ID: "ethone-riot-client-id",
    RIOT_RSO_CLIENT_SECRET: "ethone-riot-client-secret-long-enough-32-chars",
  });
  const response = await invoke("/api/riot/oauth/url", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.ok(body.data.authUrl);
  const authUrl = new URL(body.data.authUrl);
  assert.equal(authUrl.hostname, "auth.riotgames.com");
  assert.equal(authUrl.pathname, "/authorize");
  assert.equal(authUrl.searchParams.get("client_id"), "ethone-riot-client-id");
  assert.equal(authUrl.searchParams.get("response_type"), "code");
  assert.ok(authUrl.searchParams.get("state"));
});

test("Riot OAuth exchange stores returned token when approved credentials are in env", async () => {
  const setCalls = [];
  const env = testEnv({
    RIOT_RSO_CLIENT_ID: "ethone-riot-client-id",
    RIOT_RSO_CLIENT_SECRET: "ethone-riot-client-secret-long-enough-32-chars",
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "auth.riotgames.com" && url.pathname === "/token") {
        return json({
          access_token: "riot-access-token-12345",
          refresh_token: "riot-refresh-token-12345",
          expires_in: 3600,
          scope: "openid offline_access",
        });
      }
      if (url.hostname === "auth.riotgames.com" && url.pathname === "/userinfo") {
        return json({
          sub: "puuid-12345678-abcd-1234",
          country: "FRA",
        });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    },
  });

  const response = await invoke("/api/riot/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(25) }),
  });

  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(body.data.puuid, "puuid-12345678-abcd-1234");
  assert.equal(setCalls.length, 1);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].requested_provider, "riot");
  assert.equal(setCalls[0].next_access_token, "riot-access-token-12345");
});
