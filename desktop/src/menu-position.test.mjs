import assert from "node:assert/strict";
import test from "node:test";
import { anchoredMenuPosition } from "./menu-position.ts";

test("the account menu opens beside the avatar", () => {
  assert.deepEqual(anchoredMenuPosition({ right: 220, bottom: 700 }, { width: 1200, height: 800 }), { left: 228, bottom: 100 });
});

test("the account menu stays inside a narrow window", () => {
  assert.deepEqual(anchoredMenuPosition({ right: 220, bottom: 790 }, { width: 360, height: 800 }), { left: 92, bottom: 10 });
});
