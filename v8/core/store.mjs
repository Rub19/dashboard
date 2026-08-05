import { DEFAULT_DENSITY_SETTINGS, normalizeDensityMode, sanitizeDensitySettings } from "./density-engine.mjs";
import { DEFAULT_BRAIN_PREFERENCES, sanitizeBrainPreferences } from "../brain/preferences.mjs";

export const PERSISTENCE_KEY = "ethone:v8-ui-state";

export const LIVE_CARD_IDS = Object.freeze(["system", "spotify", "discord", "weather", "minecraft", "steam", "github", "google-calendar", "notion", "todoist", "valorant", "lol", "twitch", "lastfm", "tracker-gg", "google-drive", "youtube", "reddit"]);
const LIVE_CARD_ID_SET = new Set(LIVE_CARD_IDS);

export function sanitizeActivityLiveLayout(input) {
  const source = input && typeof input === "object" ? input : {};
  const requestedOrder = Array.isArray(source.order) ? source.order.filter((id) => LIVE_CARD_ID_SET.has(id)) : [];
  const order = [...new Set(requestedOrder)];
  LIVE_CARD_IDS.forEach((id) => { if (!order.includes(id)) order.push(id); });
  const hidden = Array.isArray(source.hidden) ? [...new Set(source.hidden.filter((id) => LIVE_CARD_ID_SET.has(id)))] : [];
  return Object.freeze({ order: Object.freeze(order), hidden: Object.freeze(hidden) });
}

const THEMES = new Set(["night", "graphite", "day", "auto"]);
const ACCENTS = new Set(["mint", "sky", "amber", "violet", "rose", "custom"]);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const SPACES = new Set(["personal", "focus", "studio"]);
const SYNC_STATES = new Set(["loading", "saving", "saved", "offline", "retrying", "error", "expired", "online", "syncing"]);
const NETWORK_STATES = new Set(["online", "offline"]);
const SAVE_STATES = new Set(["idle", "saving", "saved", "pending", "error"]);
const SESSION_STATES = new Set(["checking", "valid", "expired", "error"]);

const DEFAULT_STATE = Object.freeze({
  route: "home",
  theme: "night",
  density: "comfortable",
  densitySettings: DEFAULT_DENSITY_SETTINGS,
  brainPreferences: DEFAULT_BRAIN_PREFERENCES,
  accent: "mint",
  customAccentColor: "#7be5c3",
  space: "personal",
  flow: "Essentiel",
  spotlightEnabled: true,
  ambientEffectsEnabled: true,
  interfaceBlurEnabled: true,
  activityLiveLayout: sanitizeActivityLiveLayout(null),
  homeLiveLayout: sanitizeActivityLiveLayout(null),
  syncStatus: "loading",
  networkStatus: "online",
  saveStatus: "idle",
  sessionStatus: "checking",
  localTime: "--:--",
  timeZone: "UTC",
  version: "8.0",
  railExpanded: false,
  dockScale: "normal",
  dockAlign: "center",
  dockGlass: "default",
  dockAutoHide: false,
  dockMagnify: true,
  homeGrid: "4",
  homeHero: "full",
  uiAnimations: "smooth",
  uiGlow: true,
  uiSoundFeedback: true,
  missionOpen: false,
  commandOpen: false,
  commandQuery: "",
  commandIndex: 0,
  panel: null,
  toast: null,
  aura: "classic",
  fontFamily: "inter",
  radiusStyle: "rounded",
  zen: false
});

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function migratePersistedSnapshot(input) {
  const snapshot = input && typeof input === "object" ? { ...input } : {};
  if (!Object.hasOwn(snapshot, "schemaVersion") && Number.isInteger(snapshot.version)) {
    snapshot.schemaVersion = snapshot.version;
    delete snapshot.version;
  }
  return snapshot;
}

function normalizeRoute(route) {
  const value = String(route || "home").trim().toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(value) ? value : "home";
}

function normalizeState(input = {}) {
  const commandOpen = input.commandOpen === true;
  const missionOpen = !commandOpen && input.missionOpen === true;
  const panel = commandOpen || missionOpen || input.panel == null
    ? null
    : String(input.panel).slice(0, 32);
  return Object.freeze({
    route: normalizeRoute(input.route),
    theme: THEMES.has(input.theme) ? input.theme : DEFAULT_STATE.theme,
    density: normalizeDensityMode(input.density, DEFAULT_STATE.density),
    densitySettings: sanitizeDensitySettings(input.densitySettings),
    brainPreferences: sanitizeBrainPreferences(input.brainPreferences),
    accent: ACCENTS.has(input.accent) ? input.accent : DEFAULT_STATE.accent,
    customAccentColor: HEX_COLOR.test(String(input.customAccentColor || "")) ? String(input.customAccentColor).toLowerCase() : DEFAULT_STATE.customAccentColor,
    space: SPACES.has(input.space) ? input.space : DEFAULT_STATE.space,
    flow: String(input.flow || DEFAULT_STATE.flow).slice(0, 48),
    spotlightEnabled: input.spotlightEnabled !== false,
    ambientEffectsEnabled: input.ambientEffectsEnabled !== false,
    interfaceBlurEnabled: input.interfaceBlurEnabled !== false,
    activityLiveLayout: sanitizeActivityLiveLayout(input.activityLiveLayout),
    homeLiveLayout: sanitizeActivityLiveLayout(input.homeLiveLayout),
    syncStatus: SYNC_STATES.has(input.syncStatus) ? input.syncStatus : DEFAULT_STATE.syncStatus,
    networkStatus: NETWORK_STATES.has(input.networkStatus) ? input.networkStatus : DEFAULT_STATE.networkStatus,
    saveStatus: SAVE_STATES.has(input.saveStatus) ? input.saveStatus : DEFAULT_STATE.saveStatus,
    sessionStatus: SESSION_STATES.has(input.sessionStatus) ? input.sessionStatus : DEFAULT_STATE.sessionStatus,
    localTime: /^\d{2}:\d{2}$/.test(String(input.localTime || "")) ? String(input.localTime) : DEFAULT_STATE.localTime,
    timeZone: String(input.timeZone || DEFAULT_STATE.timeZone).slice(0, 80),
    version: String(input.version || DEFAULT_STATE.version).slice(0, 24),
    railExpanded: input.railExpanded === true,
    dockScale: ["normal", "compact", "large"].includes(input.dockScale) ? input.dockScale : "normal",
    dockAlign: ["center", "stretch"].includes(input.dockAlign) ? input.dockAlign : "center",
    dockGlass: ["default", "ultra", "opaque"].includes(input.dockGlass) ? input.dockGlass : "default",
    dockAutoHide: input.dockAutoHide === true,
    dockMagnify: input.dockMagnify !== false,
    homeGrid: ["4", "2", "3"].includes(input.homeGrid) ? input.homeGrid : "4",
    homeHero: ["full", "compact", "hidden"].includes(input.homeHero) ? input.homeHero : "full",
    uiAnimations: ["smooth", "snappy", "reduced"].includes(input.uiAnimations) ? input.uiAnimations : "smooth",
    uiGlow: input.uiGlow !== false,
    uiSoundFeedback: input.uiSoundFeedback !== false,
    missionOpen,
    commandOpen,
    commandQuery: String(input.commandQuery || "").slice(0, 160),
    commandIndex: Math.min(1000, Math.max(0, Number.parseInt(input.commandIndex, 10) || 0)),
    panel,
    toast: input.toast && typeof input.toast === "object"
      ? Object.freeze({ ...input.toast })
      : null,
    aura: ["classic", "boreale", "cyberpunk", "eclipse", "emeraude", "minerale"].includes(input.aura) ? input.aura : "classic",
    fontFamily: ["inter", "outfit", "mono", "serif"].includes(input.fontFamily) ? input.fontFamily : "inter",
    radiusStyle: ["rounded", "square", "pill"].includes(input.radiusStyle) ? input.radiusStyle : "rounded",
    zen: input.zen === true
  });
}

function sameValue(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}

function statesEqual(left, right) {
  return Object.keys(DEFAULT_STATE).every((key) => sameValue(left[key], right[key]));
}

function persistedSnapshot(state) {
  return {
    schemaVersion: 5,
    route: state.route,
    theme: state.theme,
    density: state.density,
    densitySettings: state.densitySettings,
    brainPreferences: state.brainPreferences,
    accent: state.accent,
    customAccentColor: state.customAccentColor,
    space: state.space,
    flow: state.flow,
    spotlightEnabled: state.spotlightEnabled,
    ambientEffectsEnabled: state.ambientEffectsEnabled,
    interfaceBlurEnabled: state.interfaceBlurEnabled,
    activityLiveLayout: state.activityLiveLayout,
    homeLiveLayout: state.homeLiveLayout,
    railExpanded: state.railExpanded,
    dockScale: state.dockScale || "normal",
    dockAlign: state.dockAlign || "center",
    dockGlass: state.dockGlass || "default",
    dockAutoHide: state.dockAutoHide === true,
    dockMagnify: state.dockMagnify !== false,
    homeGrid: state.homeGrid || "4",
    homeHero: state.homeHero || "full",
    uiAnimations: state.uiAnimations || "smooth",
    uiGlow: state.uiGlow !== false,
    uiSoundFeedback: state.uiSoundFeedback !== false
  };
}

function cloudSnapshot(state) {
  const { schemaVersion: _schemaVersion, ...preferences } = persistedSnapshot(state);
  return Object.freeze(preferences);
}

export function createPresentationStore(initialState = {}, options = {}) {
  const storage = options.storage || globalThis.localStorage || null;
  const ownerId = String(options.ownerId || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
  const storageKey = ownerId ? `${PERSISTENCE_KEY}:${ownerId}` : PERSISTENCE_KEY;
  let persisted = {};

  try {
    const raw = storage?.getItem(storageKey);
    persisted = raw ? migratePersistedSnapshot(safeParse(raw)) : {};
  } catch {
    persisted = {};
  }

  let state = normalizeState({ ...DEFAULT_STATE, ...(options.fallbackState || {}), ...persisted, ...initialState });
  const subscribers = new Set();

  function persist() {
    try {
      storage?.setItem(storageKey, JSON.stringify(persistedSnapshot(state)));
      return true;
    } catch {
      return false;
    }
  }

  function setState(patch) {
    const previous = state;
    const update = typeof patch === "function" ? patch(previous) : patch;
    const next = normalizeState({ ...previous, ...(update || {}) });
    if (statesEqual(previous, next)) return previous;
    state = next;
    persist();
    subscribers.forEach((subscriber) => subscriber(state, previous));
    return state;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  return Object.freeze({
    getState: () => state,
    setState,
    subscribe,
    persist,
    cloudSnapshot: () => cloudSnapshot(state),
    subscriberCount: () => subscribers.size
  });
}
