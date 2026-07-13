export const PERSISTENCE_KEY = "ethone:v8-ui-state";

const THEMES = new Set(["night", "graphite"]);
const DENSITIES = new Set(["comfortable", "compact"]);
const ACCENTS = new Set(["mint", "sky", "amber", "violet", "rose"]);
const SPACES = new Set(["personal", "focus", "studio"]);
const SYNC_STATES = new Set(["online", "syncing", "local"]);

const DEFAULT_STATE = Object.freeze({
  route: "home",
  theme: "night",
  density: "comfortable",
  accent: "mint",
  space: "personal",
  flow: "Essentiel",
  syncStatus: "online",
  railExpanded: false,
  missionOpen: false,
  commandOpen: false,
  commandQuery: "",
  commandIndex: 0,
  panel: null,
  toast: null
});

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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
    density: DENSITIES.has(input.density) ? input.density : DEFAULT_STATE.density,
    accent: ACCENTS.has(input.accent) ? input.accent : DEFAULT_STATE.accent,
    space: SPACES.has(input.space) ? input.space : DEFAULT_STATE.space,
    flow: String(input.flow || DEFAULT_STATE.flow).slice(0, 48),
    syncStatus: SYNC_STATES.has(input.syncStatus) ? input.syncStatus : DEFAULT_STATE.syncStatus,
    railExpanded: input.railExpanded === true,
    missionOpen,
    commandOpen,
    commandQuery: String(input.commandQuery || "").slice(0, 160),
    commandIndex: Math.max(0, Number.parseInt(input.commandIndex, 10) || 0),
    panel,
    toast: input.toast && typeof input.toast === "object"
      ? Object.freeze({ ...input.toast })
      : null
  });
}

function sameValue(left, right) {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.is(left[key], right[key]));
}

function statesEqual(left, right) {
  return Object.keys(DEFAULT_STATE).every((key) => sameValue(left[key], right[key]));
}

function persistedSnapshot(state) {
  return {
    version: 2,
    route: state.route,
    theme: state.theme,
    density: state.density,
    accent: state.accent,
    space: state.space,
    flow: state.flow,
    railExpanded: state.railExpanded
  };
}

export function createPresentationStore(initialState = {}, options = {}) {
  const storage = options.storage || globalThis.localStorage || null;
  let persisted = {};

  try {
    const raw = storage?.getItem(PERSISTENCE_KEY);
    persisted = raw ? safeParse(raw) : {};
  } catch {
    persisted = {};
  }

  let state = normalizeState({ ...DEFAULT_STATE, ...(options.fallbackState || {}), ...persisted, ...initialState });
  const subscribers = new Set();

  function persist() {
    try {
      storage?.setItem(PERSISTENCE_KEY, JSON.stringify(persistedSnapshot(state)));
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
    subscriberCount: () => subscribers.size
  });
}
