"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createStorage(seed) {
  const map = new Map(Object.entries(seed || {}).map(([key, value]) => [key, String(value)]));
  return {
    map,
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    key(index) {
      return Array.from(map.keys())[index] || null;
    },
    get length() {
      return map.size;
    }
  };
}

function loadState(seed, profile) {
  const definitions = Object.create(null);
  const listeners = Object.create(null);
  const historyCalls = [];
  const storage = createStorage(seed);
  const context = {
    console: { warn() {}, error() {} },
    navigator: { onLine: true },
    localStorage: storage,
    document: {
      documentElement: {
        lang: "fr",
        dataset: {},
        style: { setProperty() {} }
      },
      addEventListener() {},
      getElementById(id) {
        return /^page-(dashboard|settings|calendar|notes)$/.test(id) ? { id } : null;
      },
      querySelector(selector) {
        if (selector === ".tab-content.active[id^='page-']") return { id: "page-dashboard" };
        return null;
      }
    },
    history: {
      state: null,
      calls: historyCalls,
      replaceState(state, title, url) {
        this.state = state;
        historyCalls.push({ type: "replace", state, url });
      },
      pushState(state, title, url) {
        this.state = state;
        historyCalls.push({ type: "push", state, url });
      }
    },
    location: { href: "http://127.0.0.1:4173/index.html" },
    setTimeout(callback) { callback(); return 1; },
    CustomEvent: function CustomEvent(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    dispatchEvent(event) {
      (listeners[event.type] || []).forEach((handler) => handler(event));
    },
    switchPage(page) {
      context.__lastSwitchedPage = page;
    },
    curP() {
      return profile || null;
    },
    Ethone: {
      get(name) { return definitions[name]; },
      define(name, value) { definitions[name] = value; return value; }
    }
  };
  context.window = context;

  const source = fs.readFileSync(path.join(__dirname, "..", "state", "store.js"), "utf8");
  vm.runInNewContext(source, context, { filename: "state/store.js" });
  return { context, storage, store: definitions.state, consistency: context.ETHONEStateConsistency };
}

{
  const profile = {
    id: "profile-1",
    activeWorkspaceId: "development",
    theme: { preset: "oled", density: "compact", sidebarWidth: 288 },
    sidebarCompact: true,
    state: { activePage: "notes" }
  };
  const { storage, store, consistency } = loadState({
    "nexus_lang": "en",
    "ethone_lang": "fr",
    "sb_width": "312",
    "ethone:sidebar:mode": "compact",
    "ethone:active-workspace-id": "gaming",
    "ethone:state:v1": "{bad json"
  }, profile);

  assert.ok(consistency, "state consistency API should be exported");
  assert.equal(typeof store.hydrate, "function", "state store should expose hydrate()");
  assert.equal(store.getState().language, "en", "language should prefer legacy user choice and normalize aliases");
  assert.equal(store.getState().sidebar.width, 312);
  assert.equal(store.getState().sidebar.mode, "compact");
  assert.equal(store.getState().workspace.id, "gaming");

  consistency.syncFromProfile(profile);
  assert.equal(store.getState().theme.preset, "oled");
  assert.equal(store.getState().sidebar.width, 288, "profile theme sidebar width should become canonical after profile sync");
  assert.equal(store.getState().sidebar.mode, "compact");
  assert.equal(store.getState().page, "notes");

  store.setState({
    page: "settings",
    language: "de",
    workspace: { id: "study", name: "Study" },
    sidebar: { width: 276, mode: "full" },
    theme: { preset: "nord", density: "cozy" }
  });

  assert.equal(storage.getItem("nexus_lang"), "de");
  assert.equal(storage.getItem("ethone_lang"), "de");
  assert.equal(storage.getItem("ethone:language"), "de");
  assert.equal(storage.getItem("sb_width"), "276");
  assert.equal(storage.getItem("sidebar_width"), "276");
  assert.equal(storage.getItem("ethone:sidebar:mode"), "full");
  assert.equal(storage.getItem("ethone:active-workspace-id"), "study");
  assert.equal(storage.getItem("ethone:active-space-id"), "study");
  assert.equal(JSON.parse(storage.getItem("ethone:state:v1")).data.theme.preset, "nord");
}

{
  const first = loadState();
  first.store.setState({
    page: "calendar",
    language: "es",
    workspace: { id: "personal", name: "Personal" },
    sidebar: { width: 300, mode: "icon" }
  });

  const seed = Object.fromEntries(first.storage.map.entries());
  const second = loadState(seed);
  assert.equal(second.store.getState().page, "calendar", "page should restore after refresh/new runtime");
  assert.equal(second.store.getState().language, "es", "language should restore after refresh/new runtime");
  assert.equal(second.store.getState().workspace.id, "personal", "workspace should restore after refresh/new runtime");
  assert.equal(second.store.getState().sidebar.mode, "icon", "sidebar mode should restore after refresh/new runtime");
}

{
  const { store } = loadState({
    "ethone:state:v1": JSON.stringify({ version: 1, data: { page: "<script>", sidebar: { width: 9999, mode: "broken" }, language: "zz" } })
  });
  assert.equal(store.getState().page, "dashboard", "invalid pages should fall back safely");
  assert.equal(store.getState().sidebar.width, 360, "sidebar width should be clamped");
  assert.equal(store.getState().sidebar.mode, "full", "invalid sidebar mode should normalize");
  assert.equal(store.getState().language, "fr", "unsupported languages should normalize");
}

{
  const { context, store, consistency } = loadState();
  consistency.recordNavigation("settings");
  consistency.recordNavigation("calendar");
  assert.equal(store.getState().page, "calendar");
  assert.equal(context.history.calls[0].type, "replace", "first navigation should seed history state");
  assert.equal(context.history.calls[1].type, "push", "second navigation should add a browser history entry");
  context.dispatchEvent({ type: "popstate", state: { ethonePage: "settings" } });
  assert.equal(context.__lastSwitchedPage, "settings", "popstate should restore the page through switchPage");
  assert.equal(store.getState().page, "settings");
}

{
  const { storage, consistency } = loadState();
  let notifications = 0;
  consistency.subscribe(() => { notifications += 1; });

  consistency.setLanguage("en");
  const firstRevision = JSON.parse(storage.getItem("ethone:state:v1")).revision;
  consistency.setLanguage("en");
  const duplicateRevision = JSON.parse(storage.getItem("ethone:state:v1")).revision;

  assert.equal(duplicateRevision, firstRevision, "an identical state update must not create another persisted revision");
  assert.equal(notifications, 1, "an identical state update must not notify subscribers twice");
}

{
  const first = loadState({
    "ethone:active-workspace-id": "gaming",
    "ethone:active-space-id": "gaming",
    "ethone:theme": JSON.stringify({ preset: "oled" })
  });

  first.consistency.setWorkspace({ id: "", name: "" });
  first.consistency.setTheme(null);

  assert.equal(first.storage.getItem("ethone:active-workspace-id"), null, "clearing the workspace must clear its legacy alias");
  assert.equal(first.storage.getItem("ethone:active-space-id"), null, "clearing the workspace must clear the legacy Space alias");
  assert.equal(first.storage.getItem("ethone:theme"), null, "clearing the theme must clear the legacy theme alias");

  const second = loadState(Object.fromEntries(first.storage.map.entries()));
  assert.equal(second.store.getState().workspace.id, "", "a cleared workspace must stay cleared after refresh");
  assert.equal(second.store.getState().theme, null, "a cleared theme must stay cleared after refresh");
}

{
  const profile = { state: { activePage: "notes" }, theme: { preset: "oled" } };
  const { context, storage, store } = loadState({}, profile);
  const beforeRevision = JSON.parse(storage.getItem("ethone:state:v1")).revision;
  let notifications = 0;
  store.subscribe(() => { notifications += 1; });

  context.dispatchEvent({ type: "ethone:page-ready", detail: { page: "settings" } });

  const afterRevision = JSON.parse(storage.getItem("ethone:state:v1")).revision;
  assert.equal(store.getState().page, "settings");
  assert.equal(afterRevision, beforeRevision + 1, "page-ready must persist only the page that actually opened");
  assert.equal(notifications, 1, "page-ready must emit one canonical state change");
}

{
  const { consistency } = loadState({ "nexus_lang": "fr" });
  let notifications = 0;
  consistency.subscribe(() => { notifications += 1; });

  consistency.hydrate({ persist: false });

  assert.equal(notifications, 0, "hydrating identical persisted state must not emit a duplicate update");
}

console.log("State consistency: PASS");
