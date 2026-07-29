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

test("Google Drive OAuth exchange stores the returned tokens for the authenticated user", async () => {
  const setCalls = [];
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "oauth2.googleapis.com") {
        return json({ access_token: "fresh-access", refresh_token: "fresh-refresh", scope: "https://www.googleapis.com/auth/drive.readonly", expires_in: 3600 });
      }
      return supabaseRpcFetch({ setCalls })(input, init);
    }
  });
  const response = await invoke("/api/google-drive/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "a".repeat(20), clientId: CLIENT_ID })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, true);
  assert.equal(setCalls[0].requested_user_id, USER_ID);
  assert.equal(setCalls[0].next_access_token, "fresh-access");
});

test("Google Drive files returns recent files using a valid stored token", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({ files: [{ id: "f1", name: "Roadmap.docx", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-07-28T09:00:00Z", webViewLink: "https://docs.google.com/document/d/f1", iconLink: "https://ssl.gstatic.com/docs/icon.png" }] });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive.readonly", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/google-drive/files?clientId=${CLIENT_ID}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.files.length, 1);
  assert.equal(body.data.files[0].name, "Roadmap.docx");
});

test("Google Drive files rejects a connection with no stored token", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke(`/api/google-drive/files?clientId=${CLIENT_ID}`, { env });
  assert.equal(response.status, 401);
  assert.equal((await payload(response)).error.code, "AUTH_REQUIRED");
});

test("Google Drive disconnect removes the stored token", async () => {
  const deleteCalls = [];
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ deleteCalls }) });
  const response = await invoke("/api/google-drive/oauth/disconnect", { env, method: "POST" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.connected, false);
  assert.equal(deleteCalls[0].requested_user_id, USER_ID);
});

test("Google Drive exchange rejects a malformed request body", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const response = await invoke("/api/google-drive/oauth/exchange", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "short", clientId: CLIENT_ID })
  });
  assert.equal(response.status, 400);
});
