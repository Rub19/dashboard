import assert from "node:assert/strict";
import test from "node:test";
import { cached, clearCache, writeCache } from "./cache.ts";

test("a fresh value is served without a new request, and parallel calls share one", async () => {
  clearCache();
  let calls = 0;
  const load = async () => ++calls;
  const [left, right] = await Promise.all([cached("a", 1000, load), cached("a", 1000, load)]);
  assert.deepEqual([left, right, await cached("a", 1000, load), calls], [1, 1, 1, 1]);
});

test("an expired value is reloaded and clearing by prefix forgets only that prefix", async () => {
  clearCache();
  let calls = 0;
  const load = async () => ++calls;
  await cached("riot:x", 0, load);
  assert.equal(await cached("riot:x", 0, load), 2);
  writeCache("catalog:y", "kept");
  clearCache("riot:");
  assert.equal(await cached("catalog:y", 1000, load), "kept");
  assert.equal(await cached("riot:x", 1000, load), 3);
});

test("errors surface unless the caller accepts the old value", async () => {
  clearCache();
  writeCache("old", "value");
  const fail = async () => { throw new Error("down"); };
  await assert.rejects(cached("old", 0, fail));
  assert.equal(await cached("old", 0, fail, true), "value");
});
