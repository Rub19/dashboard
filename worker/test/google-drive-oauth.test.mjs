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

test("Google Drive files returns an empty list when no token is stored", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch({ getResponse: [] }) });
  const response = await invoke(`/api/google-drive/files?clientId=${CLIENT_ID}`, { env });
  assert.equal(response.status, 200);
  const body = await payload(response);
  assert.equal(body.ok, true);
  assert.equal(body.data.files.length, 0);
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
      "content-length": "5",
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

test("Google Drive chunked upload returns token and completes on next chunk", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  let initCalls = 0;
  let sessionCalls = 0;
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "project-ref.supabase.co") {
        return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
      }
      if (url.hostname === "www.googleapis.com" && url.pathname === "/upload/drive/v3/files" && url.searchParams.get("uploadType") === "resumable") {
        initCalls += 1;
        return new Response(null, { status: 201, headers: { location: "https://www.googleapis.com/upload/session" } });
      }
      if (url.href === "https://www.googleapis.com/upload/session") {
        sessionCalls += 1;
        const range = init.headers["content-range"];
        if (range === "bytes 0-5/11") {
          return new Response(null, { status: 308, headers: { range: "bytes=0-5" } });
        }
        if (range === "bytes 6-10/11") {
          return json({ id: "chunked123", name: "hello.txt", mimeType: "text/plain", size: "11", modifiedTime: "2026-07-28T09:00:00Z" });
        }
      }
      throw new Error(`Unexpected fetch: ${url.href}`);
    }
  });
  const file = new Blob(["hello world"], { type: "text/plain" });
  const first = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "content-length": "6",
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "11",
      "x-ethone-file-mime": "text/plain",
      "content-range": "bytes 0-5/11"
    },
    body: file.slice(0, 6)
  });
  const firstBody = await payload(first);
  assert.equal(first.status, 202);
  assert.equal(firstBody.data.status, "incomplete");
  assert.equal(firstBody.data.uploaded, 6);
  assert.equal(firstBody.data.total, 11);
  assert.ok(typeof firstBody.data.token === "string" && firstBody.data.token.length > 0);
  assert.equal(initCalls, 1);
  assert.equal(sessionCalls, 1);

  const second = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "content-length": "5",
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "11",
      "x-ethone-file-mime": "text/plain",
      "content-range": "bytes 6-10/11",
      "x-ethone-upload-token": firstBody.data.token
    },
    body: file.slice(6)
  });
  const secondBody = await payload(second);
  assert.equal(second.status, 200);
  assert.equal(secondBody.data.file.id, "chunked123");
  assert.equal(initCalls, 1);
  assert.equal(sessionCalls, 2);
});

test("Google Drive upload rejects an invalid content range", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const file = new Blob(["hello"], { type: "text/plain" });
  const response = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "5",
      "x-ethone-file-mime": "text/plain",
      "content-range": "bytes 5-0/5",
      "content-length": "5"
    },
    body: file
  });
  assert.equal(response.status, 400);
});

test("Google Drive upload rejects a content length mismatch", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseRpcFetch() });
  const file = new Blob(["hello"], { type: "text/plain" });
  const response = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "5",
      "x-ethone-file-mime": "text/plain",
      "content-range": "bytes 0-4/5",
      "content-length": "10"
    },
    body: file
  });
  assert.equal(response.status, 400);
});

test("Google Drive upload rejects a chunk larger than the configured limit", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    GOOGLE_DRIVE_MAX_UPLOAD_BYTES: "2",
    __TEST_FETCH__: supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })
  });
  const file = new Blob(["hello"], { type: "text/plain" });
  const response = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "5",
      "x-ethone-file-mime": "text/plain",
      "content-length": "5"
    },
    body: file
  });
  assert.equal(response.status, 413);
});

test("Google Drive upload maps provider errors to retryable worker errors", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: async (input, init = {}) => {
      const url = new URL(String(input));
      if (url.hostname === "project-ref.supabase.co") {
        return supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })(input, init);
      }
      if (url.hostname === "www.googleapis.com" && url.pathname === "/upload/drive/v3/files" && url.searchParams.get("uploadType") === "resumable") {
        return new Response(null, { status: 401 });
      }
      return new Response(null, { status: 404 });
    }
  });
  const file = new Blob(["hello"], { type: "text/plain" });
  const response = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "content-length": "5",
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "5",
      "x-ethone-file-mime": "text/plain"
    },
    body: file
  });
  const body = await payload(response);
  assert.equal(response.status, 502);
  assert.equal(body.error.code, "PROVIDER_REQUEST_REJECTED");
});

test("Google Drive upload accepts a large declared content length without global request-size rejection", async () => {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const env = testEnv({
    __TEST_FETCH__: supabaseRpcFetch({ getResponse: [{ access_token: "stored-access-token", refresh_token: "stored-refresh-token", scope: "drive", expires_at: futureExpiry }] })
  });
  const response = await invoke("/api/google-drive/upload/chunk", {
    env,
    method: "POST",
    headers: {
      "content-type": "text/plain",
      "content-length": "1000000",
      "x-ethone-client-id": CLIENT_ID,
      "x-ethone-file-name": "hello.txt",
      "x-ethone-file-size": "5",
      "x-ethone-file-mime": "text/plain"
    }
  });
  assert.notEqual(response.status, 413);
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
