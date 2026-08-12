const STORAGE_PREFIX = "ethone:v8-navigation:";
const ROUTE_PATTERN = /^[a-z0-9-]{1,32}$/;
const MAX_SCROLL = 10_000_000;

function normalizeRoute(value) {
  const route = String(value || "home").trim().toLowerCase();
  return ROUTE_PATTERN.test(route) ? route : "home";
}

function normalizeScroll(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(MAX_SCROLL, Math.max(0, Math.round(number)));
}

function storageFrom(options, runtime) {
  if (options.storage) return options.storage;
  try {
    return runtime.sessionStorage || null;
  } catch {
    return null;
  }
}

function readPositions(storage, key) {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed)
      .filter(([route]) => ROUTE_PATTERN.test(route))
      .slice(0, 32)
      .map(([route, value]) => [route, normalizeScroll(value)]));
  } catch {
    return {};
  }
}

export function createNavigationSession(options = {}) {
  const runtime = options.runtime || globalThis;
  const stage = options.stage || null;
  const storage = storageFrom(options, runtime);
  const scope = String(options.scope || "default").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 96) || "default";
  const key = `${STORAGE_PREFIX}${scope}`;
  const positions = readPositions(storage, key);
  let currentRoute = "";
  let restoreFrame = 0;
  let restores = 0;

  function persist() {
    try {
      storage?.setItem?.(key, JSON.stringify(positions));
      return true;
    } catch {
      return false;
    }
  }

  function capture(route = currentRoute) {
    if (!stage || !route) return 0;
    const normalized = normalizeRoute(route);
    const scroll = normalizeScroll(stage.scrollTop);
    positions[normalized] = scroll;
    currentRoute = normalized;
    persist();
    return scroll;
  }

  function cancelRestore() {
    if (!restoreFrame) return;
    runtime.cancelAnimationFrame?.(restoreFrame);
    restoreFrame = 0;
  }

  function restore(route, settings = {}) {
    if (!stage) return 0;
    const normalized = normalizeRoute(route);
    const scroll = settings.reset === true ? 0 : normalizeScroll(positions[normalized]);
    currentRoute = normalized;
    cancelRestore();
    const apply = () => {
      restoreFrame = 0;
      stage.scrollTo?.({ top: scroll, behavior: "auto" });
      restores += 1;
    };
    if (typeof runtime.requestAnimationFrame === "function") restoreFrame = runtime.requestAnimationFrame(apply);
    else apply();
    return scroll;
  }

  function destroy(route = currentRoute) {
    if (route) capture(route);
    cancelRestore();
    return true;
  }

  return Object.freeze({
    capture,
    restore,
    destroy,
    diagnostics: () => Object.freeze({ scope, route: currentRoute || null, savedRoutes: Object.keys(positions).length, restorePending: Boolean(restoreFrame), restores })
  });
}
