"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

let observerCallback = null;
let observerCount = 0;
const body = {};
const document = {
  body,
  readyState: "complete",
  addEventListener() {}
};

class MutationObserver {
  constructor(callback) {
    observerCount += 1;
    observerCallback = callback;
  }
  observe(target, options) {
    assert.equal(target, body);
    assert.equal(options.childList, true);
    assert.equal(options.subtree, true);
  }
  disconnect() {}
}

const definitions = Object.create(null);
const context = {
  console: { warn() {} },
  document,
  MutationObserver,
  requestAnimationFrame(callback) { callback(); return 1; },
  cancelAnimationFrame() {},
  Ethone: {
    get(name) { return definitions[name]; },
    define(name, value) { definitions[name] = value; }
  }
};
context.window = context;

const source = fs.readFileSync(path.join(__dirname, "..", "core", "dom-runtime.js"), "utf8");
vm.runInNewContext(source, context, { filename: "core/dom-runtime.js" });

const runtime = context.ETHONEDOMRuntime;
assert.ok(runtime, "runtime should be exported");
assert.equal(observerCount, 0, "observer should start only when a subscriber exists");

let staleCalls = 0;
let activeCalls = 0;
runtime.subscribe("icons", () => { staleCalls += 1; });
runtime.subscribe("icons", (batch) => {
  activeCalls += 1;
  assert.equal(batch.reason, "mutation");
  assert.equal(batch.roots.length, 2);
});
assert.equal(observerCount, 1, "all subscribers must share one observer");

runtime.subscribe("broken", () => { throw new Error("isolated"); });
let healthyCalls = 0;
runtime.subscribe("healthy", () => { healthyCalls += 1; });

observerCallback([
  { addedNodes: [{ nodeType: 1, id: "a" }] },
  { addedNodes: [{ nodeType: 1, id: "b" }] }
]);

assert.equal(staleCalls, 0, "named subscription replacement must prevent duplicates");
assert.equal(activeCalls, 1);
assert.equal(healthyCalls, 1, "one subscriber failure must not stop other subscribers");

const stats = runtime.stats();
assert.equal(stats.subscribers, 3);
assert.equal(stats.observers, 1);
assert.equal(stats.batches, 1);

assert.equal(runtime.unsubscribe("icons"), true);
assert.equal(runtime.unsubscribe("icons"), false);
assert.equal(runtime.stats().subscribers, 2);

console.log("DOM runtime: PASS");
