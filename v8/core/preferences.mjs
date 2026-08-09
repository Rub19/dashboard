const STORAGE_KEY = "ethone:preferences";
const WORKSPACE_KEY_PREFIX = "ethone:workspace:";
const LAST_WORKSPACE_KEY = "ethone:workspace:last";
const RECENT_WORKSPACES_KEY = "ethone:workspace:recent";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const WORKSPACE_ID = /^[a-z0-9-]{1,32}$/i;

const PREFERENCES_SCHEMA = Object.freeze({
  density: Object.freeze({ type: "string", values: new Set(["spacious", "comfortable", "compact", "dense", "ultra-compact", "automatic", "custom"]), default: "comfortable" }),
  theme: Object.freeze({ type: "string", values: new Set(["midnight", "obsidian", "aurora", "minimal", "focus", "glass", "oled", "night", "graphite", "day", "auto"]), default: "midnight" }),
  accent: Object.freeze({ type: "string", values: new Set(["mint", "sky", "amber", "violet", "rose", "teal", "coral", "custom"]), default: "mint" }),
  customAccent: Object.freeze({ type: "hex", default: "#7be5c3" }),
  fontSize: Object.freeze({ type: "string", values: new Set(["sm", "md", "lg", "xl"]), default: "md" }),
  reducedMotion: Object.freeze({ type: "boolean", default: false }),
  workspace: Object.freeze({ type: "string", default: "personal" }),
  dock: Object.freeze({ type: "string", values: new Set(["normal", "compact", "large", "hidden"]), default: "normal" }),
  brainBehavior: Object.freeze({ type: "string", values: new Set(["concise", "balanced", "expert", "creative", "developer"]), default: "balanced" }),
  layout: Object.freeze({ type: "string", values: new Set(["default", "focused", "dashboard", "studio"]), default: "default" }),
  widgets: Object.freeze({ type: "array", default: Object.freeze([]) }),
  background: Object.freeze({ type: "string", values: new Set(["static", "animated", "dynamic"]), default: "static" }),
  wallpaper: Object.freeze({ type: "string", values: new Set(["none", "aurora", "nebula", "mesh", "noise"]), default: "none" }),
  sound: Object.freeze({ type: "boolean", default: true }),
  haptics: Object.freeze({ type: "boolean", default: true }),
  lowData: Object.freeze({ type: "boolean", default: false }),
  status: Object.freeze({ type: "string", values: new Set(["online", "busy", "focus", "away", "invisible"]), default: "online" }),
  performanceMode: Object.freeze({ type: "string", values: new Set(["normal", "low"]), default: "normal" })
});

const DEFAULT_PREFERENCES = Object.freeze(Object.fromEntries(
  Object.entries(PREFERENCES_SCHEMA).map(([key, rule]) => [key, rule.default])
));

function isRuntimePresent() {
  try {
    return typeof globalThis !== "undefined" && globalThis.localStorage != null;
  } catch {
    return false;
  }
}

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizePreference(key, value) {
  const rule = PREFERENCES_SCHEMA[key];
  if (!rule) return value;
  if (rule.type === "boolean") return value === true || value === "true" || value === "1" || value === 1;
  if (rule.type === "array") return Array.isArray(value) ? value.map(String).slice(0, 24) : rule.default;
  if (rule.type === "hex") {
    const hex = String(value || "").toLowerCase();
    return HEX_COLOR.test(hex) ? hex : rule.default;
  }
  const str = String(value ?? "").trim();
  if (rule.values) return rule.values.has(str) ? str : rule.default;
  return str || rule.default;
}

function sanitizePreferences(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  return Object.freeze(Object.fromEntries(
    Object.keys(PREFERENCES_SCHEMA).map((key) => [key, normalizePreference(key, source[key])])
  ));
}

function loadPreferences() {
  if (!isRuntimePresent()) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return sanitizePreferences(safeParse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs) {
  if (!isRuntimePresent()) return false;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizePreferences(prefs)));
    return true;
  } catch {
    return false;
  }
}

let currentPreferences = loadPreferences();
const subscribers = new Set();

function emit(key, value) {
  subscribers.forEach((subscriber) => {
    try { subscriber(currentPreferences, key, value); } catch {}
  });
}

export function getPreference(key) {
  if (Object.hasOwn(PREFERENCES_SCHEMA, key)) return currentPreferences[key];
  return undefined;
}

export function setPreference(key, value) {
  if (!Object.hasOwn(PREFERENCES_SCHEMA, key)) return currentPreferences;
  const next = { ...currentPreferences, [key]: normalizePreference(key, value) };
  currentPreferences = Object.freeze(sanitizePreferences(next));
  savePreferences(currentPreferences);
  emit(key, currentPreferences[key]);
  return currentPreferences;
}

export function getAllPreferences() {
  return currentPreferences;
}

export function resetPreferences() {
  currentPreferences = { ...DEFAULT_PREFERENCES };
  savePreferences(currentPreferences);
  emit(null, currentPreferences);
  return currentPreferences;
}

export function importPreferences(json) {
  try {
    const source = typeof json === "string" ? safeParse(json) : json;
    if (!source || typeof source !== "object") throw new TypeError("JSON invalide");
    const next = { ...DEFAULT_PREFERENCES, ...source };
    currentPreferences = Object.freeze(sanitizePreferences(next));
    savePreferences(currentPreferences);
    emit(null, currentPreferences);
    return { ok: true, preferences: currentPreferences };
  } catch (error) {
    return { ok: false, error: String(error?.message || "Échec de l'import") };
  }
}

export function exportPreferences() {
  try {
    return JSON.stringify(currentPreferences, null, 2);
  } catch {
    return "{}";
  }
}

export function subscribePreferences(listener) {
  if (typeof listener !== "function") return () => {};
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getWorkspaceState(workspaceId) {
  const id = String(workspaceId || "personal").toLowerCase();
  if (!WORKSPACE_ID.test(id)) return null;
  if (!isRuntimePresent()) return null;
  try {
    const raw = globalThis.localStorage.getItem(`${WORKSPACE_KEY_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = safeParse(raw);
    return Object.freeze({
      id,
      widgets: Array.isArray(parsed.widgets) ? parsed.widgets : [],
      layout: parsed.layout && typeof parsed.layout === "object" ? parsed.layout : {},
      active: parsed.active || [],
      updatedAt: parsed.updatedAt || new Date().toISOString()
    });
  } catch {
    return null;
  }
}

export function setWorkspaceState(workspaceId, patch) {
  const id = String(workspaceId || "personal").toLowerCase();
  if (!WORKSPACE_ID.test(id)) return { ok: false, error: "Workspace invalide" };
  if (!isRuntimePresent()) return { ok: false, error: "Stockage indisponible" };
  const previous = getWorkspaceState(id) || { id, widgets: [], layout: {}, active: [], updatedAt: new Date().toISOString() };
  const next = {
    id,
    widgets: patch.widgets || previous.widgets,
    layout: patch.layout || previous.layout,
    active: patch.active || previous.active,
    updatedAt: new Date().toISOString()
  };
  try {
    globalThis.localStorage.setItem(`${WORKSPACE_KEY_PREFIX}${id}`, JSON.stringify(next));
    addRecentWorkspace(id);
    return { ok: true, workspace: Object.freeze(next) };
  } catch {
    return { ok: false, error: "Impossible de sauvegarder le workspace" };
  }
}

export function listRecentWorkspaces(limit = 3) {
  if (!isRuntimePresent()) return [];
  try {
    const raw = globalThis.localStorage.getItem(RECENT_WORKSPACES_KEY);
    const list = raw ? safeParse(raw) : [];
    return Array.isArray(list) ? list.slice(0, limit).filter((id) => WORKSPACE_ID.test(String(id))) : [];
  } catch {
    return [];
  }
}

export function addRecentWorkspace(id) {
  if (!isRuntimePresent()) return;
  try {
    const list = listRecentWorkspaces(10);
    const next = [id, ...list.filter((entry) => entry !== id)].slice(0, 10);
    globalThis.localStorage.setItem(RECENT_WORKSPACES_KEY, JSON.stringify(next));
    globalThis.localStorage.setItem(LAST_WORKSPACE_KEY, id);
  } catch {}
}

export function getLastWorkspace() {
  if (!isRuntimePresent()) return "personal";
  try {
    return globalThis.localStorage.getItem(LAST_WORKSPACE_KEY) || "personal";
  } catch {
    return "personal";
  }
}

export function setLastWorkspace(id) {
  if (!isRuntimePresent()) return;
  try { globalThis.localStorage.setItem(LAST_WORKSPACE_KEY, id); } catch {}
}

const DENSITY_BODY_MAP = Object.freeze({
  spacious: "ethone-density-spacious",
  comfortable: "ethone-density-comfortable",
  compact: "ethone-density-compact",
  dense: "ethone-density-dense",
  "ultra-compact": "ethone-density-ultra-compact",
  automatic: "ethone-density-automatic",
  custom: "ethone-density-custom"
});

export function applyDensity(prefs, doc = globalThis.document) {
  if (!doc || !doc.body) return;
  Object.values(DENSITY_BODY_MAP).forEach((className) => doc.body.classList.remove(className));
  const className = DENSITY_BODY_MAP[prefs.density];
  if (className) doc.body.classList.add(className);
}

export function applyTheme(prefs, doc = globalThis.document) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  html.dataset.theme = prefs.theme;
  if (prefs.theme === "oled") {
    html.dataset.oled = "true";
  } else {
    delete html.dataset.oled;
  }
}

export function applyAccent(prefs, doc = globalThis.document) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  html.dataset.accent = prefs.accent;
  const color = prefs.accent === "custom" ? prefs.customAccent : (DEFAULT_PREFERENCES.customAccent);
  html.style.setProperty("--v8-custom-accent-color", color);
  if (prefs.accent === "custom") {
    html.style.setProperty("--v8-accent", color);
  } else {
    html.style.removeProperty("--v8-accent");
  }
}

export function applyWallpaper(prefs, doc = globalThis.document) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  html.dataset.wallpaper = prefs.wallpaper;
  html.dataset.background = prefs.background;
}

export function applyStatus(prefs, doc = globalThis.document) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  html.dataset.status = prefs.status;
}

export function applyPerformanceMode(prefs, doc = globalThis.document) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  if (prefs.lowData || prefs.performanceMode === "low") {
    html.dataset.performanceMode = "low";
  } else {
    delete html.dataset.performanceMode;
  }
}

export function applyReducedMotion(prefs, doc = globalThis.document) {
  if (!doc || !doc.documentElement) return;
  const html = doc.documentElement;
  html.dataset.reducedMotion = prefs.reducedMotion ? "true" : "false";
}

export function applyPreferences(prefs = currentPreferences, doc = globalThis.document) {
  applyDensity(prefs, doc);
  applyTheme(prefs, doc);
  applyAccent(prefs, doc);
  applyWallpaper(prefs, doc);
  applyStatus(prefs, doc);
  applyPerformanceMode(prefs, doc);
  applyReducedMotion(prefs, doc);
  if (doc && doc.documentElement) {
    doc.documentElement.dataset.haptics = prefs.haptics ? "on" : "off";
    doc.documentElement.dataset.sound = prefs.sound ? "on" : "off";
    if (prefs.fontSize !== "md") doc.documentElement.dataset.fontSize = prefs.fontSize;
    else delete doc.documentElement.dataset.fontSize;
    if (prefs.dock !== "normal") doc.documentElement.dataset.dock = prefs.dock;
    else delete doc.documentElement.dataset.dock;
    if (prefs.brainBehavior !== "balanced") doc.documentElement.dataset.brainBehavior = prefs.brainBehavior;
    else delete doc.documentElement.dataset.brainBehavior;
    if (prefs.layout !== "default") doc.documentElement.dataset.layout = prefs.layout;
    else delete doc.documentElement.dataset.layout;
  }
}

export function initializeFromStorage(doc = globalThis.document) {
  currentPreferences = loadPreferences();
  applyPreferences(currentPreferences, doc);
  return currentPreferences;
}

export function getDefaultPreferences() {
  return DEFAULT_PREFERENCES;
}
