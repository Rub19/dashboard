import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { USER_ID, accessToken, invoke, json, payload, testEnv } from "./helpers.mjs";

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

test("Google Drive file returns a single file", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname.startsWith("/drive/v3/files/")) {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({ id: "f1", name: "Roadmap.docx", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-07-28T09:00:00Z", webViewLink: "https://docs.google.com/document/d/f1", iconLink: "https://ssl.gstatic.com/docs/icon.png" });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/google-drive/file?clientId=${CLIENT_ID}&id=1234567890`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.file.name, "Roadmap.docx");
});

test("Google Drive folder creation creates a folder", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        assert.equal(init.method, "POST");
        return json({ id: "folder1", name: "Nouveau dossier", mimeType: "application/vnd.google-apps.folder", modifiedTime: "2026-07-28T09:00:00Z" });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke("/api/google-drive/folders", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, name: "Nouveau dossier" })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.folder.id, "folder1");
});

test("Google Drive file rename updates the file", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files/1234567890") {
        assert.equal(init.method, "PATCH");
        return json({ id: "1234567890", name: "Renamed.docx", mimeType: "application/vnd.google-apps.document", modifiedTime: "2026-07-28T09:00:00Z" });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke("/api/google-drive/files/update", {
    env,
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, fileId: "1234567890", name: "Renamed.docx" })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.file.name, "Renamed.docx");
});

test("Google Drive file trash moves file to trash", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files/1234567890") {
        assert.equal(init.method, "PATCH");
        return json({ id: "1234567890", name: "Roadmap.docx", mimeType: "application/vnd.google-apps.document", trashed: true });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke("/api/google-drive/files/trash", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, fileId: "1234567890" })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.file.trashed, true);
});

test("Google Drive file delete removes the file", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files/1234567890") {
        assert.equal(init.method, "DELETE");
        return new Response(null, { status: 204 });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/google-drive/files/delete?clientId=${CLIENT_ID}&fileId=1234567890`, { env, method: "DELETE" });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.deleted, true);
});

test("Google Drive download streams file bytes", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/files/1234567890") {
        return new Response("file-bytes", { status: 200, headers: { "content-type": "application/octet-stream" } });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/google-drive/download?clientId=${CLIENT_ID}&fileId=1234567890`, { env });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-disposition"), "attachment");
  const text = await response.text();
  assert.equal(text, "file-bytes");
});

test("Google Drive upload sends file and returns metadata", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/upload/drive/v3/files" && url.searchParams.get("uploadType") === "resumable") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return new Response(null, { status: 201, headers: { location: "https://upload.example.test/session" } });
      }
      if (url.href === "https://upload.example.test/session") {
        assert.equal(init.method, "PUT");
        return json({ id: "uploaded123", name: "hello.txt", mimeType: "text/plain", size: "5", modifiedTime: "2026-07-28T09:00:00Z" });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const file = new Blob(["hello"], { type: "text/plain" });
  const response = await invoke("/api/google-drive/upload", {
    env,
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "5",
      "x-ethone-file-mime": "text/plain"
    },
    body: file
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.file.id, "uploaded123");
});

test("Google Drive quota returns storage quota", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "www.googleapis.com" && url.pathname === "/drive/v3/about") {
        assert.equal(init.headers.authorization, "Bearer stored-access-token");
        return json({ storageQuota: { usage: "1000000", limit: "15000000000", usageInDrive: "900000", usageInDriveTrash: "100000" } });
      }
      return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
    }
  });
  const response = await invoke(`/api/google-drive/quota?clientId=${CLIENT_ID}`, { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.usage, 1000000);
  assert.equal(body.data.limit, 15000000000);
});
