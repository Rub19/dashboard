export const THEME_MODES = Object.freeze(["night", "graphite", "day", "auto"]);

const MODE_SET = new Set(THEME_MODES);

export function normalizeThemeMode(value, fallback = "night") {
  return MODE_SET.has(value) ? value : fallback;
}

export function systemPrefersLight(runtime = globalThis) {
  try {
    return runtime.matchMedia?.("(prefers-color-scheme: light)")?.matches === true;
  } catch {
    return false;
  }
}

export function resolveTheme(requested, options = {}) {
  const mode = normalizeThemeMode(requested);
  if (mode !== "auto") return Object.freeze({ requested: mode, effective: mode, reason: "explicit" });
  const light = options.systemPrefersLight === true;
  return Object.freeze({ requested: mode, effective: light ? "day" : "night", reason: light ? "system-light" : "system-dark" });
}

export function createThemeWatcher(options = {}) {
  const runtime = options.runtime || globalThis;
  const onChange = typeof options.onChange === "function" ? options.onChange : () => {};
  const query = runtime.matchMedia?.("(prefers-color-scheme: light)") || null;
  let started = false;

  function handleChange() {
    onChange(query?.matches === true);
  }

  function start() {
    if (started || !query) return false;
    started = true;
    query.addEventListener?.("change", handleChange);
    return true;
  }

  function destroy() {
    if (!started || !query) return false;
    started = false;
    query.removeEventListener?.("change", handleChange);
    return true;
  }

  return Object.freeze({ start, destroy, matches: () => query?.matches === true });
}
