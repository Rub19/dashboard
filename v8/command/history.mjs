export const COMMAND_HISTORY_KEY = "ethone:v8-command-history";

const MAX_RECENT = 6;
const MAX_PINNED = 8;
const SAFE_ID = /^[a-z0-9.-]{1,48}$/;

function sanitizeList(value, max) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).filter((id) => SAFE_ID.test(id)))].slice(0, max);
}

export function createCommandHistory(storage = globalThis.localStorage) {
  let state = { recent: [], pinned: [] };

  try {
    const raw = storage?.getItem(COMMAND_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state = {
      recent: sanitizeList(parsed.recent, MAX_RECENT),
      pinned: sanitizeList(parsed.pinned, MAX_PINNED)
    };
  } catch {
    state = { recent: [], pinned: [] };
  }

  function persist() {
    try {
      storage?.setItem(COMMAND_HISTORY_KEY, JSON.stringify({
        version: 1,
        recent: state.recent,
        pinned: state.pinned
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

  return Object.freeze({
    record,
    togglePin,
    recent: () => state.recent.slice(),
    pinned: () => state.pinned.slice()
  });
}
