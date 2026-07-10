"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const storage = new Map();
storage.set("ethone:dashboard-v4-layout", JSON.stringify({
  version: 2,
  instances: [
    { instanceId: "github-main", type: "github", locked: false },
    { instanceId: "brain-main", type: "brain", locked: true }
  ],
  hidden: []
}));
storage.set("ethone:dashboard-v4-layouts", JSON.stringify({
  version: 1,
  activeId: "control",
  layouts: [
    { id: "control", name: "Control Center", prefs: { instances: [{ instanceId: "hero" }] } },
    { id: "dev", name: "Developer", prefs: { instances: [{ instanceId: "github" }, { instanceId: "brain" }] } }
  ]
}));
storage.set("ethone:studio:v1", JSON.stringify({
  projects: [{ id: "project-1", name: "ETHONE Release", type: "dashboard", updated: 200 }]
}));

const profile = {
  id: "profile-1",
  name: "Alex",
  activeWorkspaceId: "space-dev",
  workspaces: [],
  state: {
    aiSessions: [{ id: "session-1", title: "Release review", provider: "Groq", updatedAt: 300 }],
    notes: [],
    items: []
  }
};

const spaces = [
  { id: "space-personal", name: "Personal", template: "personal", accent: "#8b5cf6" },
  { id: "space-dev", name: "Development", template: "development", accent: "#7c3aed" }
];
let activeSpaceId = "space-dev";

const context = {
  console,
  setTimeout,
  clearTimeout,
  Promise,
  CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init && init.detail; },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  document: {
    querySelector(selector) {
      if (selector === ".tab-content.active[id^='page-']") return { id: "page-dashboard" };
      return null;
    }
  },
  dispatchEvent() {},
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({ flows: [] }) }); },
  curP() { return profile; },
  ETHONEWorkspaces: {
    all() { return spaces; },
    active() { return spaces.find((space) => space.id === activeSpaceId); },
    setActive(id) { activeSpaceId = id; return this.active(); },
    create(input) {
      const created = Object.assign({ id: "space-created" }, input);
      spaces.push(created);
      return created;
    }
  },
  ETHONEFlow: {
    flows() {
      return [
        { id: "personal", name: "Personal Flow", icon: "home", description: "Daily context" },
        { id: "development", name: "Development Flow", icon: "code-2", description: "GitHub and AI", widgets: ["github"] }
      ];
    },
    state() { return { activeId: "development", favorites: ["development"] }; },
    apply() { return true; },
    openBuilder() {}
  },
  ETHONEDesktop: {
    state() {
      return { activeWindow: "window-ai", windows: [{ id: "window-ai", page: "ai", screen: "main", workspace: 0 }] };
    }
  },
  Ethone: {
    get(name) {
      if (name !== "widgets") return null;
      return {
        list() {
          return [
            { id: "github", definition: { label: "GitHub", category: "Developer", icon: "git-branch" } },
            { id: "brain", definition: { label: "Brain", category: "AI", icon: "brain-circuit" } }
          ];
        }
      };
    },
    define(name, value) { this[name] = value; }
  }
};
context.window = context;

const source = fs.readFileSync(path.join(__dirname, "..", "services", "os", "mission-control-model.js"), "utf8");
vm.runInNewContext(source, context, { filename: "mission-control-model.js" });

const model = context.ETHONEMissionControlModel;
assert.ok(model, "model should be exported");

const snapshot = model.snapshot("");
assert.equal(snapshot.spaces.length, 2);
assert.equal(snapshot.flows.length, 2);
assert.equal(snapshot.windows.length, 1);
assert.equal(snapshot.ai.length, 1);
assert.equal(snapshot.widgets.length, 2);
assert.equal(snapshot.dashboards.length, 2);
assert.equal(snapshot.projects.length, 1);
assert.equal(snapshot.counts.windows, 1);

const fuzzy = model.snapshot("gthb");
assert.ok(fuzzy.widgets.some((item) => item.title === "GitHub"), "subsequence search should find GitHub");
assert.ok(fuzzy.flows.some((item) => item.id === "development"), "flow keywords should be searchable");
assert.equal(Array.from(fuzzy.widgets, (item) => item.title).join(","), "GitHub", "fuzzy search should not match unrelated widget metadata");

assert.equal(model.reorder("spaces", "space-personal", "space-dev", ["space-personal", "space-dev"]), true);
assert.equal(model.snapshot("").spaces[0].id, "space-dev", "moving an item forward should place it at the target index");
assert.equal(model.reorder("spaces", "space-dev", "space-personal", ["space-personal", "space-dev"]), true);
assert.equal(model.snapshot("").spaces[0].id, "space-dev", "saved order should be restored");

const created = model.createSpace({ name: "Study", template: "study", accent: "#c084fc" });
assert.equal(created.id, "space-created");
assert.equal(activeSpaceId, "space-created", "new Space should become active");

assert.equal(model.activateDashboard("dev"), true);
assert.equal(JSON.parse(storage.get("ethone:dashboard-v4-layouts")).activeId, "dev");

console.log("Mission Control model: PASS");
