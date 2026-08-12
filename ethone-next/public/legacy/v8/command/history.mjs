export const COMMAND_HISTORY_KEY = "ethone:v8-command-history";

const MAX_RECENT = 6;
const MAX_PINNED = 8;
const SAFE_ID = /^[a-z0-9.-]{1,48}$/;
const MAX_FREQUENCY = 1_000_000;

function sanitizeList(value, max) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((id) => SAFE_ID.test(id)))].slice(0, max);
}

function sanitizeFrequency(value) {
  const map = {};
  if (!value || typeof value !== "object") return map;
  Object.keys(value).forEach((id) => {
    if (SAFE_ID.test(id)) {
      const count = Number.isFinite(value[id]) ? Math.max(0, Math.min(MAX_FREQUENCY, Math.floor(value[id]))) : 0;
      if (count > 0) map[id] = count;
    }
  });
  return map;
}

export function createCommandHistory(storage = globalThis.localStorage) {
  let state = { recent: [], pinned: [], frequency: {} };

  try {
    const raw = storage?.getItem(COMMAND_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state = {
      recent: sanitizeList(parsed.recent, MAX_RECENT),
      pinned: sanitizeList(parsed.pinned, MAX_PINNED),
      frequency: sanitizeFrequency(parsed.frequency)
    };
  } catch {
    state = { recent: [], pinned: [], frequency: {} };
  }

  function persist() {
    try {
      storage?.setItem(COMMAND_HISTORY_KEY, JSON.stringify({
        version: 2,
        recent: state.recent,
        pinned: state.pinned,
        frequency: state.frequency
      }));
      return true;
    } catch {
      return false;
    }
  }

  function record(id) {
    id = String(id || "");
    if (!SAFE_ID.test(id)) return false;
    state.recent = [id, ...state.recent.filter((entry) => entry !== id)].slice(0, MAX_RECENT);
    state.frequency[id] = Math.min(MAX_FREQUENCY, (state.frequency[id] || 0) + 1);
    persist();
    return true;
  }

  function togglePin(id) {
    id = String(id || "");
    if (!SAFE_ID.test(id)) return false;
    state.pinned = state.pinned.includes(id)
      ? state.pinned.filter((entry) => entry !== id)
      : [...state.pinned, id].slice(0, MAX_PINNED);
    persist();
    return state.pinned.includes(id);
  }

  function frequency() {
    return { ...state.frequency };
  }

  return Object.freeze({
    record,
    togglePin,
    recent: () => state.recent.slice(),
    pinned: () => state.pinned.slice(),
    frequency
  });
}
