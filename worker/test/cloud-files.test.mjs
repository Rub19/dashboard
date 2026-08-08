import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { invoke, payload, testEnv } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
});

function supabaseFetch({ records = [], favorites = [] } = {}) {
  return async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") throw new Error(`Unexpected destination: ${url.href}`);
    if (url.pathname.startsWith("/rest/v1/ethone_files")) {
      if (init.method === "POST") return new Response(null, { status: 204 });
      if (init.method === "PATCH") return new Response(JSON.stringify(records), { status: 200, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify(records), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.pathname.startsWith("/rest/v1/ethone_file_favorites")) {
      if (init.method === "POST" || init.method === "DELETE") return new Response(null, { status: 204 });
      return new Response(JSON.stringify(favorites), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`Unexpected Supabase path: ${url.pathname}`);
  };
}

test("Cloud files sync stores a batch of Drive metadata", async () => {
  const env = testEnv({ __TEST_FETCH__: supabaseFetch() });
  const response = await invoke("/api/cloud/files/sync", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      files: [
        { id: "1234567890", name: "Doc.txt", mimeType: "text/plain", size: 100, parentId: null, date: "2026-07-28T09:00:00Z" }
      ]
    })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.synced, 1);
});

test("Cloud files list returns files from Supabase", async () => {
  const env = testEnv({
    __TEST_FETCH__: supabaseFetch({
      records: [
        { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", user_id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", drive_file_id: "1234567890", name: "Doc.txt", mime_type: "text/plain", is_folder: false, size: 100, trashed: false, tags: [], ethone_file_favorites: [] }
      ]
    })
  });
  const response = await invoke("/api/cloud/files", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.files.length, 1);
  assert.equal(body.data.files[0].name, "Doc.txt");
});

test("Cloud file favorite toggles favorite", async () => {
  const env = testEnv({
    __TEST_FETCH__: supabaseFetch({
      records: [{ id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", user_id: "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a", drive_file_id: "1234567890", name: "Doc.txt", mime_type: "text/plain", is_folder: false, size: 100, trashed: false, tags: [] }]
    })
  });
  const response = await invoke("/api/cloud/file/favorite?driveFileId=1234567890", {
    env,
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ favorite: true })
  });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.favorite, true);
});
