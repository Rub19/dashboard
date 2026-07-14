import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  DENSITY_CUSTOM_RANGES,
  DENSITY_MODES,
  createDensityEngine,
  densityCssVariables,
  resolveDensity,
  sanitizeDensitySettings
} from "../v8/core/density-engine.mjs";
import { createActionFacade } from "../v8/core/actions.mjs";
import { PERSISTENCE_KEY, createPresentationStore } from "../v8/core/store.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    read: (key) => values.get(key) ?? null
  };
}

function densityRuntime() {
  const listeners = new Map();
  const viewportListeners = new Map();
  const frames = new Map();
  let sequence = -1;
  return {
    innerWidth: 1440,
    innerHeight: 900,
    visualViewport: {
      width: 1440,
      height: 900,
      scale: 1,
      addEventListener(type, listener) { viewportListeners.set(type, listener); },
      removeEventListener(type, listener) { if (viewportListeners.get(type) === listener) viewportListeners.delete(type); }
    },
    matchMedia: () => ({ matches: false }),
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    listeners,
    viewportListeners,
    frames
  };
}

function densityTarget() {
  const values = new Map();
  return { dataset: {}, style: { setProperty: (key, value) => values.set(key, value) }, values };
}

test("Density Engine exposes six modes and clamps every custom token", () => {
  assert.deepEqual(DENSITY_MODES, ["spacious", "comfortable", "compact", "ultra-compact", "automatic", "custom"]);
  const custom = Object.fromEntries(Object.keys(DENSITY_CUSTOM_RANGES).map((key) => [key, 9999]));
  const settings = sanitizeDensitySettings({ custom, spacePresets: { personal: "invalid", focus: "ultra-compact" } });
  for (const [key, range] of Object.entries(DENSITY_CUSTOM_RANGES)) assert.equal(settings.custom[key], range.max);
  assert.equal(settings.spacePresets.personal, "comfortable");
  assert.equal(settings.spacePresets.focus, "ultra-compact");
  assert.equal(densityCssVariables(settings.custom)["--density-panel-width"], "440px");
});

test("automatic density protects touch and zoom while adapting Focus and available width", () => {
  const base = { density: "automatic", space: "personal", flow: "Essentiel" };
  assert.equal(resolveDensity(base, { width: 700, zoom: 1, coarsePointer: false }).effective, "spacious");
  assert.equal(resolveDensity(base, { width: 1200, zoom: 1.4, coarsePointer: false }).reason, "browser-zoom");
  assert.equal(resolveDensity({ ...base, space: "focus" }, { width: 1366, zoom: 1, coarsePointer: false }).effective, "compact");
  assert.equal(resolveDensity({ ...base, space: "focus" }, { width: 1100, zoom: 1, coarsePointer: false, panelOpen: true }).effective, "comfortable");
  assert.equal(resolveDensity({ ...base, densitySettings: { adaptiveBySpace: false } }, { width: 1920, zoom: 1, coarsePointer: false }).effective, "compact");
});

test("Density Engine owns one resize lifecycle and handles animation frame id zero", () => {
  const runtime = densityRuntime();
  const target = densityTarget();
  let state = { density: "comfortable", space: "personal", flow: "Essentiel" };
  const engine = createDensityEngine({ runtime, target, getState: () => state });
  assert.equal(engine.start(), true);
  assert.equal(engine.start(), false);
  assert.equal(runtime.listeners.size, 1);
  assert.equal(runtime.viewportListeners.size, 1);
  assert.equal(target.dataset.densityEffective, "comfortable");
  state = { ...state, density: "compact" };
  runtime.listeners.get("resize")();
  runtime.listeners.get("resize")();
  assert.equal(runtime.frames.size, 1);
  const [frameId, frameCallback] = [...runtime.frames.entries()][0];
  runtime.frames.delete(frameId);
  frameCallback();
  assert.equal(target.dataset.densityEffective, "compact");
  assert.equal(engine.destroy(), true);
  assert.equal(runtime.listeners.size, 0);
  assert.equal(runtime.viewportListeners.size, 0);
  assert.equal(runtime.frames.size, 0);
});

test("density and Brain preferences persist locally as cache and in the cloud snapshot", () => {
  const storage = memoryStorage();
  const store = createPresentationStore({}, { storage });
  store.setState({ density: "ultra-compact", densitySettings: { focusDensity: false }, brainPreferences: { persona: "developer", memory: { retentionDays: 365 } } });
  const persisted = JSON.parse(storage.read(PERSISTENCE_KEY));
  assert.equal(persisted.version, 4);
  assert.equal(persisted.density, "ultra-compact");
  assert.equal(persisted.densitySettings.focusDensity, false);
  assert.equal(persisted.brainPreferences.persona, "developer");
  assert.equal(store.cloudSnapshot().brainPreferences.memory.retentionDays, 365);
});

test("custom density mode and slider updates have separate working actions", () => {
  let state = createPresentationStore({}, { storage: memoryStorage() }).getState();
  const actions = createActionFacade({ getState: () => state, setState: (patch) => { state = { ...state, ...patch }; } });
  assert.equal(actions.dispatch("v8.density.custom").ok, true);
  assert.equal(state.density, "custom");
  assert.equal(actions.dispatch("v8.density.custom.update", { key: "cardPadding", value: 31 }).ok, true);
  assert.equal(state.densitySettings.custom.cardPadding, 31);
  assert.equal(actions.dispatch("v8.density.custom.update", { key: "unknown", value: 31 }).ok, false);
  actions.destroy();
});

test("Density UI uses global tokens, a live preview and touch-safe targets", () => {
  const settings = fs.readFileSync(new URL("../v8/pages/settings.mjs", import.meta.url), "utf8");
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const boot = fs.readFileSync(new URL("../v8/core/density-boot.js", import.meta.url), "utf8");
  for (const token of ["font-scale", "line-height", "card-padding", "control-height", "row-height", "table-row-height", "section-gap", "icon-size", "panel-width", "widget-scale"]) assert.match(tokens, new RegExp(`--density-${token}`));
  assert.match(settings, /v8-density-preview/);
  assert.match(settings, /data-density-custom|densityCustom/);
  assert.match(shell, /var\(--density-card-padding\)/);
  assert.match(components, /@media \(pointer: coarse\)[\s\S]*min-height: 44px/);
  assert.match(boot, /dataSET|densityEffective/i);
  assert.match(boot, /mode === "automatic"/);
});
