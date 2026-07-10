"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const output = execFileSync(process.execPath, [path.join(root, "scripts", "codebase-audit.mjs"), "--json"], {
  cwd: root,
  encoding: "utf8"
});
const report = JSON.parse(output);

assert.ok(report.serviceWorker, "audit should include service-worker reachability");
assert.ok(report.serviceWorker.bootAssets > 0);
assert.deepEqual(report.serviceWorker.missingAssets, []);
assert.deepEqual(report.serviceWorker.duplicateAssets, []);

console.log("Codebase audit: PASS");
