import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { createShare, getShareBySlug, incrementDropFileCount, incrementShareDownload } from "../src/services/cloud-shares-client.js";
import { json, testEnv } from "./helpers.mjs";

beforeEach(() => clearCache());

// Regression coverage for the same safeText(value, maximum) misuse fixed
// across this file: `safeText(slug, "", 64)` silently queried `slug=eq.`
// (empty) instead of the real slug, so a share could never be resolved —
// the public "share a file" feature was completely broken end to end.
test("getShareBySlug looks up the actual slug, not an empty string", async () => {
  let capturedFilter;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") throw new Error(`Unexpected destination: ${url.href}`);
    capturedFilter = url.search;
    return json([{ id: "share-row-1", slug: "abc123slugslug", visibility: "public", download_count: 0, max_downloads: 0, ethone_files: { id: "file-1" } }]);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const { share } = await getShareBySlug(env, "abc123slugslug");
  assert.ok(capturedFilter.includes("slug=eq.abc123slugslug"), `expected the real slug in the filter, got: ${capturedFilter}`);
  assert.equal(share.slug, "abc123slugslug");
});

test("createShare looks up the file by its actual id, not an empty string", async () => {
  let capturedFilesFilter;
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/rest/v1/ethone_files") {
      capturedFilesFilter = url.search;
      return json([{ id: "file-1", drive_client_id: "client-9" }]);
    }
    if (url.pathname === "/rest/v1/ethone_file_shares" && (init?.method || "GET") === "POST") {
      const body = JSON.parse(String(init.body || "{}"));
      return json([{ id: "share-1", slug: body.slug, drive_client_id: body.drive_client_id, visibility: body.visibility, download_count: 0, max_downloads: 0 }]);
    }
    return json([]);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const share = await createShare(env, "user-1", { fileId: "file-1" });
  assert.ok(capturedFilesFilter.includes("id=eq.file-1"), `expected the real file id in the filter, got: ${capturedFilesFilter}`);
  assert.equal(share.driveClientId, "client-9", "expected the file's drive_client_id to carry over, not be blanked");
});

// Emulates real PostgREST/Postgres behaviour closely enough to catch the bug
// this file regression-tests: `download_count`/`file_count` are plain `int`
// columns (see supabase/migrations/202608080001_ethone_cloud_files.sql), so a
// PATCH body of `{ download_count: { "+": 1 } }` fails to cast into an int and
// Postgres rejects it — unlike the looser mocks elsewhere that just
// `Object.assign` whatever body they're given onto the stored row.
function createCounterStore(table, column, initialRows) {
  const rows = new Map(initialRows.map((r) => [r.slug, { ...r }]));
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") return new Response("not found", { status: 404 });
    if (!url.pathname.startsWith(`/rest/v1/${table}`)) return new Response(JSON.stringify([]), { status: 200, headers: { "content-type": "application/json" } });
    const slug = url.searchParams.get("slug")?.replace(/^eq\./, "");
    const method = init?.method || "GET";
    const match = slug ? rows.get(slug) : null;

    if (method === "PATCH") {
      const body = JSON.parse(String(init.body || "{}"));
      const value = body[column];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return new Response(JSON.stringify({ code: "22P02", message: `invalid input syntax for type integer` }), { status: 400, headers: { "content-type": "application/json" } });
      }
      if (match) match[column] = value;
      const prefersRepresentation = String(init.headers?.Prefer || init.headers?.prefer || "").includes("return=representation");
      if (!prefersRepresentation) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(match ? [match] : []), { status: 200, headers: { "content-type": "application/json" } });
    }

    // GET (select)
    return new Response(JSON.stringify(match ? [match] : []), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { rows, fetchImpl };
}

test("incrementShareDownload sends a plain integer PATCH and actually increments the counter", async () => {
  const { rows, fetchImpl } = createCounterStore("ethone_file_shares", "download_count", [
    { slug: "share-1", download_count: 3 }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const first = await incrementShareDownload(env, "share-1");
  assert.equal(first.download_count, 4, "expected the count to advance from 3 to 4");
  assert.equal(rows.get("share-1").download_count, 4);

  const second = await incrementShareDownload(env, "share-1");
  assert.equal(second.download_count, 5, "expected the count to advance from 4 to 5 on a second call");
});

test("incrementDropFileCount sends a plain integer PATCH and actually increments the counter", async () => {
  const { rows, fetchImpl } = createCounterStore("ethone_file_drops", "file_count", [
    { slug: "drop-1", file_count: 0 }
  ]);
  const env = testEnv({ __TEST_FETCH__: fetchImpl });

  const result = await incrementDropFileCount(env, "drop-1");
  assert.equal(result.file_count, 1);
  assert.equal(rows.get("drop-1").file_count, 1);
});
