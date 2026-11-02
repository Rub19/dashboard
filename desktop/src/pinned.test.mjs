import assert from "node:assert/strict";
import test from "node:test";
import { resolvePinned, togglePinned } from "./pinned.ts";

test("épingler ajoute à la fin, désépingler retire", () => {
  assert.deepEqual(togglePinned(["a"], "b"), ["a", "b"]);
  assert.deepEqual(togglePinned(["a", "b"], "a"), ["b"]);
});

test("l'ordre est celui des épingles et les applications inconnues disparaissent", () => {
  const modules = [{ module: { id: "a" } }, { module: { id: "b" } }];
  assert.deepEqual(resolvePinned(["b", "x", "a"], modules).map(({ module }) => module.id), ["b", "a"]);
});
