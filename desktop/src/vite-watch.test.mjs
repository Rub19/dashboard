import assert from "node:assert/strict";
import test from "node:test";
import appConfig from "../vite.config.ts";
import setupConfig from "../vite.setup.config.ts";

const rustTargets = ["**/src-tauri/target/**", "**/setup/target/**"];

test("Vite ignore les exécutables Rust verrouillés sous Windows", () => {
  for (const config of [appConfig, setupConfig]) {
    const ignored = config.server?.watch?.ignored ?? [];
    for (const pattern of rustTargets) assert.ok(ignored.includes(pattern));
  }
});
