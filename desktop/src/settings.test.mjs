import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_INTERFACE_PREFERENCES, normalizeInterfacePreferences } from "./settings.ts";

test("interface preferences keep every supported choice", () => {
  assert.deepEqual(normalizeInterfacePreferences({ density: "compact", motion: "reduced", transparency: "reduced", textScale: 110 }), {
    density: "compact",
    motion: "reduced",
    transparency: "reduced",
    textScale: 110,
  });
});

test("invalid and incomplete preferences fall back safely", () => {
  assert.deepEqual(normalizeInterfacePreferences({ density: "tiny", textScale: 999 }), DEFAULT_INTERFACE_PREFERENCES);
  assert.deepEqual(normalizeInterfacePreferences(null), DEFAULT_INTERFACE_PREFERENCES);
});
