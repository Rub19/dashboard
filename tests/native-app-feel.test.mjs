import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createNavigationSession } from "../v8/core/navigation-session.mjs";
import { createRouter } from "../v8/core/router.mjs";
import {
  createNativeBehavior,
  shouldPreserveBrowserContextMenu,
  shouldPreventBrowserDrag
} from "../v8/ui/native-behavior.mjs";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

function targetFixture(flags = {}) {
  const target = {
    parentElement: null,
    closest(selector) {
      if (selector.includes("[draggable='true']") || selector.includes("[data-native-drag='allow']")) return flags.explicitDrag ? target : null;
      if (selector === "img,svg,a[href]") return flags.defaultDrag ? target : null;
      if (selector.includes("input:not([type='button'])") || selector.includes("a[href]") || selector.includes("[data-native-context='browser']")) return flags.browserContext ? target : null;
      if (selector.includes(".v8-topbar") || selector.includes("[data-native-context='suppress']")) return flags.chrome ? target : null;
      return null;
    }
  };
  return target;
}

test("native behavior preserves useful browser affordances and blocks accidental drags", () => {
  const media = targetFixture({ defaultDrag: true });
  const dockMedia = targetFixture({ defaultDrag: true, explicitDrag: true });
  const editable = targetFixture({ browserContext: true });
  const chrome = targetFixture({ chrome: true });

  assert.equal(shouldPreventBrowserDrag(media), true);
  assert.equal(shouldPreventBrowserDrag(dockMedia), false);
  assert.equal(shouldPreserveBrowserContextMenu(editable), true);
  assert.equal(shouldPreserveBrowserContextMenu(chrome), false);
  assert.equal(shouldPreserveBrowserContextMenu(chrome, { selection: "ETHONE" }), true);
  assert.equal(shouldPreserveBrowserContextMenu(chrome, { shiftKey: true }), true);
});

test("native behavior owns one bounded global lifecycle", () => {
  const listeners = new Map();
  const document = {
    documentElement: { dataset: {} },
    addEventListener(type, listener, capture) { listeners.set(`${type}:${capture}`, listener); },
    removeEventListener(type, listener, capture) {
      if (listeners.get(`${type}:${capture}`) === listener) listeners.delete(`${type}:${capture}`);
    }
  };
  const runtime = { getSelection: () => ({ toString: () => "" }) };
  const behavior = createNativeBehavior({ document, runtime });

  assert.equal(behavior.start(), true);
  assert.equal(behavior.start(), false);
  assert.equal(listeners.size, 2);
  assert.equal(document.documentElement.dataset.v8NativeUi, "ready");

  let prevented = 0;
  listeners.get("dragstart:true")({ target: targetFixture({ defaultDrag: true }), preventDefault: () => { prevented += 1; } });
  listeners.get("contextmenu:true")({ target: targetFixture({ chrome: true }), defaultPrevented: false, preventDefault: () => { prevented += 1; } });
  assert.equal(prevented, 2);
  assert.deepEqual(behavior.diagnostics(), { started: true, listeners: 2, blockedDrags: 1, suppressedMenus: 1 });

  assert.equal(behavior.destroy(), true);
  assert.equal(listeners.size, 0);
  assert.equal(document.documentElement.dataset.v8NativeUi, undefined);
});

test("navigation session restores internal scroll without a permanent listener", () => {
  const storage = memoryStorage();
  const frames = new Map();
  let frameId = 0;
  const runtime = {
    requestAnimationFrame(callback) { frameId += 1; frames.set(frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); }
  };
  const applied = [];
  const stage = {
    scrollTop: 384,
    scrollTo(options) { applied.push(options); this.scrollTop = options.top; }
  };
  const session = createNavigationSession({ runtime, storage, stage, scope: "profile-a" });

  assert.equal(session.capture("notes"), 384);
  stage.scrollTop = 0;
  assert.equal(session.restore("notes"), 384);
  frames.get(frameId)();
  assert.deepEqual(applied.at(-1), { top: 384, behavior: "auto" });

  assert.equal(session.restore("tasks", { reset: true }), 0);
  frames.get(frameId)();
  assert.deepEqual(applied.at(-1), { top: 0, behavior: "auto" });

  stage.scrollTop = 128;
  session.destroy("notes");
  const restored = createNavigationSession({ runtime: {}, storage, stage, scope: "profile-a" });
  assert.equal(restored.restore("notes"), 128);
  assert.equal(applied.at(-1).top, 128);
});

test("router reports push, replace and history navigation modes", () => {
  const listeners = new Map();
  const visits = [];
  const runtime = {
    location: { hash: "#/home" },
    history: {
      state: null,
      replaceState(state, _title, url) { this.state = state; runtime.location.hash = url; },
      pushState(state, _title, url) { this.state = state; runtime.location.hash = url; }
    },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => listeners.delete(type)
  };
  const router = createRouter({ runtime, onRoute: (route, navigation) => visits.push({ route, type: navigation.type }) });

  router.start();
  router.navigate("notes");
  runtime.location.hash = "#/home";
  listeners.get("popstate")({ type: "popstate", state: { ethoneV8Route: "home" } });
  assert.deepEqual(visits, [
    { route: "home", type: "replace" },
    { route: "notes", type: "push" },
    { route: "home", type: "history" }
  ]);
  router.stop();
});

test("native app styling and runtime keep keyboard and browser behavior intentional", () => {
  const base = read("../v8/styles/base.css");
  const runtime = read("../v8/app/app-runtime.mjs");
  const main = read("../v8/main.mjs");
  const shell = read("../v8/ui/shell.mjs");
  const worker = read("../sw.js");

  assert.match(base, /\.v8-topbar[\s\S]*user-select:\s*none/);
  assert.match(base, /-webkit-user-drag:\s*none/);
  assert.match(base, /:focus:not\(:focus-visible\)[\s\S]*outline:\s*none/);
  assert.match(base, /:focus-visible[\s\S]*outline:\s*2px solid var\(--v8-accent\)/);
  assert.match(runtime, /event\.key\.toLowerCase\(\) === "s"[\s\S]*v8\.sync\.refresh/);
  assert.match(runtime, /event\.defaultPrevented[\s\S]*shouldPreserveBrowserContextMenu/);
  assert.match(runtime, /createNavigationSession/);
  assert.match(main, /nativeBehavior\.start\(\)[\s\S]*nativeBehavior\.destroy\(\)/);
  assert.match(shell, /aria-keyshortcuts="Control\+S Meta\+S"/);
  assert.match(worker, /v8\/core\/navigation-session\.mjs/);
  assert.match(worker, /v8\/ui\/native-behavior\.mjs/);
});
