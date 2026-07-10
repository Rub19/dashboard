"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, handler, options) {
    if (typeof handler !== "function") return;
    const entries = this.listeners.get(type) || [];
    if (!entries.some((entry) => entry.handler === handler && entry.capture === captureOf(options))) {
      entries.push({ handler, once: !!(options && options.once), capture: captureOf(options) });
      this.listeners.set(type, entries);
    }
  }

  removeEventListener(type, handler, options) {
    const entries = this.listeners.get(type) || [];
    const capture = captureOf(options);
    this.listeners.set(type, entries.filter((entry) => entry.handler !== handler || entry.capture !== capture));
  }

  dispatchEvent(event) {
    const entries = (this.listeners.get(event.type) || []).slice();
    entries.forEach((entry) => {
      entry.handler.call(this, event);
      if (entry.once) this.removeEventListener(event.type, entry.handler, entry.capture);
    });
    return true;
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

function captureOf(options) {
  return typeof options === "boolean" ? options : !!(options && options.capture);
}

function classList(initial) {
  const values = new Set(initial || []);
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    contains(name) { return values.has(name); },
    toggle(name, force) {
      const next = force == null ? !values.has(name) : !!force;
      if (next) values.add(name); else values.delete(name);
      return next;
    }
  };
}

function evaluate(file, context) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
}

function timerHarness() {
  let nextId = 1;
  const intervals = new Map();
  const timeouts = new Map();
  return {
    intervals,
    timeouts,
    setInterval(callback) {
      const id = nextId++;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(callback) {
      const id = nextId++;
      timeouts.set(id, callback);
      callback();
      timeouts.delete(id);
      return id;
    },
    clearTimeout(id) { timeouts.delete(id); }
  };
}

function testDeferredReadyCleanup() {
  const windowTarget = new FakeEventTarget();
  const documentTarget = new FakeEventTarget();
  const timers = timerHarness();
  let now = 0;
  let runs = 0;
  const page = {
    classList: classList(),
    getBoundingClientRect() { return { width: 0, height: 0 }; }
  };
  Object.assign(documentTarget, {
    documentElement: { classList: classList(), dataset: {} },
    getElementById(id) { return id === "page-ai" ? page : null; }
  });
  const context = vm.createContext(Object.assign(windowTarget, {
    window: windowTarget,
    document: documentTarget,
    location: { search: "" },
    localStorage: { length: 0, key() { return null; }, getItem() { return null; } },
    URLSearchParams,
    Date: class extends Date { static now() { return now; } },
    getComputedStyle() { return { display: "none", visibility: "hidden" }; },
    setInterval: timers.setInterval,
    clearInterval: timers.clearInterval,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    console: { warn() {} }
  }));

  evaluate("core/safe-mode.js", context);
  for (let index = 0; index < 20; index += 1) {
    context.ethoneRunWhenPageReady(`ai-${index}`, "ai", () => { runs += 1; });
  }
  assert.equal(windowTarget.listenerCount("ethone:page-ready"), 1, "all deferred pages must share one readiness listener");
  assert.equal(timers.intervals.size, 1, "all deferred pages must share one readiness poller");

  windowTarget.dispatchEvent({ type: "ethone:page-ready", detail: { page: "ai" } });
  assert.equal(runs, 20);
  assert.equal(timers.intervals.size, 0, "page-ready polling intervals must be released after activation");
  assert.equal(windowTarget.listenerCount("ethone:page-ready"), 0, "page-ready listeners must remove themselves after activation");

  context.ethoneRunWhenPageReady("never-visible", "ai", () => { runs += 1; });
  now = 61000;
  Array.from(timers.intervals.values()).forEach((callback) => callback());
  assert.equal(timers.intervals.size, 0, "timed-out page readiness polling must stop");
  assert.equal(windowTarget.listenerCount("ethone:page-ready"), 1, "one shared listener must preserve late lazy loading after polling stops");
  windowTarget.dispatchEvent({ type: "ethone:page-ready", detail: { page: "ai" } });
  assert.equal(runs, 21, "a page opened after the polling window must still initialize");
  assert.equal(windowTarget.listenerCount("ethone:page-ready"), 0, "the shared listener must be removed after the final pending page loads");

  context.ethoneRunWhenDashboardReady("dashboard-timeout", () => { runs += 1; });
  now = 107000;
  Array.from(timers.intervals.values()).forEach((callback) => callback());
  assert.equal(windowTarget.listenerCount("ethone:dashboard-ready"), 0, "dashboard timeout must remove its event listener");
}

function testEventRegistryCleanup() {
  const definitions = Object.create(null);
  const document = { createDocumentFragment() { return new FakeEventTarget(); } };
  const context = vm.createContext({
    window: null,
    document,
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    WeakMap,
    console,
    Ethone: {
      get(name) { return definitions[name]; },
      define(name, value) { definitions[name] = value; }
    }
  });
  context.window = context;
  evaluate("core/events.js", context);
  const events = definitions.events;
  const target = new FakeEventTarget();
  const dispose = events.listen(target, "click", () => {}, false, "memory-test");
  assert.equal(events.stats().listeners, 1, "event registry must expose active listener ownership");
  dispose();
  assert.equal(events.stats().listeners, 0, "disposed keyed listeners must release their handler closure");
  for (let index = 0; index < 50; index += 1) events.listen(target, "click", () => {}, false, "memory-test");
  assert.equal(events.stats().listeners, 1, "key replacement must not accumulate listeners");
  const onceTarget = new FakeEventTarget();
  events.listen(onceTarget, "ready", () => {}, { once: true }, "once-test");
  assert.equal(events.stats().listeners, 2);
  onceTarget.dispatchEvent({ type: "ready" });
  assert.equal(events.stats().listeners, 1, "once listeners must release their registry closure after firing");
}

function createLegacyContext(profile) {
  const timers = timerHarness();
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        id,
        style: { display: "", setProperty(name, value) { this[name] = value; } },
        classList: classList(),
        textContent: "",
        innerHTML: "",
        value: "",
        disabled: false,
        querySelector() { return null; }
      });
    }
    return elements.get(id);
  }
  class FakeWebSocket {
    constructor() {
      this.readyState = 0;
      this.closed = false;
      FakeWebSocket.instances.push(this);
    }
    send() {}
    close() {
      this.closed = true;
      this.readyState = 3;
      if (typeof this.onclose === "function") this.onclose();
    }
  }
  FakeWebSocket.instances = [];
  const context = vm.createContext({
    window: null,
    document: {
      getElementById: element,
      querySelector() { return null; }
    },
    curP() { return profile; },
    saveStateNow() {},
    toast() {},
    confirm() { return true; },
    fetch() { return Promise.resolve({ ok: true, json() { return Promise.resolve({ success: true }); } }); },
    AbortSignal: { timeout() { return {}; } },
    WebSocket: FakeWebSocket,
    setInterval: timers.setInterval,
    clearInterval: timers.clearInterval,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    console: { warn() {}, error() {} },
    sessionStorage: { getItem() { return null; }, setItem() {} },
    encodeURIComponent,
    JSON,
    Date
  });
  context.window = context;
  return { context, timers, FakeWebSocket };
}

function testConnectionCleanup() {
  {
    const profile = { state: { connections: { lastfm: { username: "rub" } } } };
    const { context, timers } = createLegacyContext(profile);
    evaluate("services/connections/lastfm.js", context);
    context.startLastfmAutoRefresh();
    assert.equal(timers.intervals.size, 1);
    context.disconnectLastfm();
    assert.equal(timers.intervals.size, 0, "Last.fm disconnect must stop auto refresh");
  }
  {
    const profile = { state: { connections: { spotify: { widgetUrl: "https://example.test" } } } };
    const { context, timers } = createLegacyContext(profile);
    evaluate("services/connections/spotify.js", context);
    context.startSpotifyAutoRefresh();
    assert.equal(timers.intervals.size, 1);
    context.disconnectSpotify();
    assert.equal(timers.intervals.size, 0, "Spotify disconnect must stop refresh and progress timers");
  }
  {
    const profile = { state: { connections: { discord: { userId: "123", data: {} } } } };
    const { context, timers, FakeWebSocket } = createLegacyContext(profile);
    evaluate("services/connections/lanyard.js", context);
    evaluate("services/connections/discord.js", context);
    context.startLanyardWS("123");
    const socket = FakeWebSocket.instances[0];
    socket.readyState = 1;
    socket.onmessage({ data: JSON.stringify({ op: 1, d: { heartbeat_interval: 30000 } }) });
    assert.equal(timers.intervals.size, 1);
    context.disconnectDiscord();
    assert.equal(socket.closed, true, "Discord disconnect must close the Lanyard socket");
    assert.equal(timers.intervals.size, 0, "Discord disconnect must stop heartbeat and polling intervals");
  }
}

function testModalCleanup() {
  class FakeElement {}
  let focusCalls = 0;
  FakeElement.prototype.closest = function () { return null; };
  FakeElement.prototype.focus = function () { focusCalls += 1; };
  const modal = new FakeElement();
  Object.assign(modal, {
    id: "modal-memory",
    classList: classList(),
    isConnected: true,
    inert: true,
    attributes: Object.create(null),
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector() { return this; },
    querySelectorAll() { return []; }
  });
  const documentTarget = new FakeEventTarget();
  Object.assign(documentTarget, {
    activeElement: new FakeElement(),
    getElementById(id) { return id === modal.id ? modal : null; },
    querySelectorAll(selector) {
      if (selector === ".modal-overlay.open") return modal.classList.contains("open") ? [modal] : [];
      return [];
    },
    contains() { return true; }
  });
  const context = vm.createContext({
    window: null,
    document: documentTarget,
    HTMLElement: FakeElement,
    getComputedStyle() { return { zIndex: "1" }; },
    requestAnimationFrame(callback) { callback(); return 1; },
    setTimeout(callback) { callback(); return 1; },
    console
  });
  context.window = context;
  evaluate("components/modals.js", context);
  assert.equal(typeof context.closeAllModals, "function", "modal runtime must expose bulk lifecycle cleanup");
  for (let index = 0; index < 30; index += 1) {
    context.openModal("memory");
    context.closeAllModals();
  }
  assert.equal(modal.classList.contains("open"), false);
  assert.equal(context.ETHONEModals.stats().focusEntries, 0, "modal focus stack must not retain detached launchers");
  assert.equal(focusCalls, 60, "bulk modal cleanup must focus the dialog and restore its launcher once per lifecycle");
}

testDeferredReadyCleanup();
testEventRegistryCleanup();
testConnectionCleanup();
testModalCleanup();

console.log("Memory lifecycle stress: PASS");
