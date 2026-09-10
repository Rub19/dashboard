import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { getCloudFile, listCloudFiles, updateCloudFile } from "../src/services/cloud-files-client.js";
import { json, testEnv } from "./helpers.mjs";

beforeEach(() => clearCache());

// Regression coverage for the same safeText(value, maximum) misuse as
// items-client.js — a stray "" middle argument zeroed every id/slug/parentId
// filter and every rename/move/brain-summary write, silently turning them
// into "" (see cloud-files-client.js / cloud-shares-client.js for the fix).

test("listCloudFiles filters by the actual parentId, not an empty string", async () => {
  let capturedFilter;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    if (url.hostname !== "project-ref.supabase.co") throw new Error(`Unexpected destination: ${url.href}`);
    capturedFilter = url.searchParams.get("drive_parent_id");
    return json([]);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  await listCloudFiles(env, "user-1", { parentId: "folder-42" });
  assert.equal(capturedFilter, "eq.folder-42");
});

test("getCloudFile looks up the actual drive file id, not an empty string", async () => {
  let capturedFilter;
  const fetchImpl = async (input) => {
    const url = new URL(String(input));
    capturedFilter = url.pathname + url.search;
    return json([{ id: "row-1", drive_file_id: "abc123", name: "Doc.txt" }]);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const file = await getCloudFile(env, "user-1", "abc123");
  assert.ok(capturedFilter.includes("drive_file_id=eq.abc123"), `expected the real file id in the filter, got: ${capturedFilter}`);
  assert.equal(file.name, "Doc.txt");
});

test("updateCloudFile writes the actual new name/parent instead of blanking them", async () => {
  let capturedBody;
  let capturedFilter;
  const fetchImpl = async (input, init) => {
    const url = new URL(String(input));
    if ((init?.method || "GET") === "PATCH") {
      capturedFilter = url.pathname + url.search;
      capturedBody = JSON.parse(String(init.body || "{}"));
      return json([{ id: "row-1", drive_file_id: "abc123", name: capturedBody.name, drive_parent_id: capturedBody.drive_parent_id }]);
    }
    return json([]);
  };
  const env = testEnv({ __TEST_FETCH__: fetchImpl });
  const result = await updateCloudFile(env, "user-1", "abc123", { name: "Renamed.txt", parentId: "folder-9" });
  assert.ok(capturedFilter.includes("drive_file_id=eq.abc123"), `expected the real file id in the filter, got: ${capturedFilter}`);
  assert.equal(capturedBody.name, "Renamed.txt");
  assert.equal(capturedBody.drive_parent_id, "folder-9");
  assert.equal(result.name, "Renamed.txt");
});
