"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const listeners = Object.create(null);
const context = {
  console,
  Date,
  setTimeout() { return 1; },
  clearTimeout() {},
  localStorage: { getItem() { return null; } },
  document: {
    readyState: "loading",
    addEventListener(type, handler) { listeners[type] = handler; },
    getElementById() { return null; }
  },
  addEventListener(type, handler) { listeners[type] = handler; }
};
context.window = context;

const source = fs.readFileSync(path.join(__dirname, "..", "services", "onboarding", "gate.js"), "utf8");
vm.runInNewContext(source, context, { filename: "services/onboarding/gate.js" });

const gate = context.ETHONEOnboardingGate;
assert.ok(gate, "gate should be exported");

const now = Date.now();
assert.equal(gate.shouldLoad({ completed: false, dismissedAt: null, whatsNewSeen: true, now }), true);
assert.equal(gate.shouldLoad({ completed: true, dismissedAt: null, whatsNewSeen: true, now }), false);
assert.equal(gate.shouldLoad({ completed: true, dismissedAt: null, whatsNewSeen: false, now }), true);
assert.equal(gate.shouldLoad({ completed: false, dismissedAt: new Date(now - 60_000).toISOString(), whatsNewSeen: true, now }), false);
assert.equal(gate.shouldLoad({ completed: false, dismissedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(), whatsNewSeen: true, now }), true);

console.log("Onboarding gate: PASS");
