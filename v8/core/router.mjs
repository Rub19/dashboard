export const V8_ROUTES = Object.freeze([
  "home",
  "notes",
  "tasks",
  "calendar",
  "files",
  "activity",
  "connections",
  "spaces",
  "flows",
  "widgets",
  "brain",
  "settings",
  "matches"
]);

const ROUTE_SET = new Set(V8_ROUTES);

export function normalizeRoute(value) {
  const safeStr = String(value || "").replace(/[\x00-\x1F\x7F]/g, "");
  const raw = safeStr
    .replace(/^#\/?/, "")
    .replace(/^\//, "")
    .split(/[?&]/)[0]
    .trim()
    .toLowerCase();
  if (raw === "__proto__" || raw === "constructor" || raw === "prototype") {
    return "home";
  }
  return ROUTE_SET.has(raw) ? raw : "home";
}

export function createRouter(options = {}) {
  const runtime = options.runtime || globalThis.window;
  const onRoute = typeof options.onRoute === "function" ? options.onRoute : () => {};
  let started = false;
  let current = "home";
  let lastCommitTime = 0;
  let commitBurst = 0;

  function routeFromLocation() {
    return normalizeRoute(runtime?.location?.hash || "");
  }

  function getRouteSuffix(value) {
    const safeStr = String(value || "");
    const hashIndex = safeStr.indexOf("#");
    const base = hashIndex >= 0 ? safeStr.substring(hashIndex) : safeStr;
    const match = base.match(/[?&].*/);
    return match ? match[0] : "";
  }

  function canonicalizeLocation(route) {
    const next = normalizeRoute(route);
    const suffix = getRouteSuffix(runtime?.location?.hash || "");
    const url = `#/${next}${suffix}`;
    if (runtime?.location?.hash !== url) {
      runtime?.history?.replaceState?.({ ethoneV8Route: next }, "", url);
    }
    return next;
  }

  function commit(route, mode = "push") {
    const now = Date.now();
    if (now - lastCommitTime < 50) {
      commitBurst++;
      if (commitBurst > 25) {
        return current;
      }
    } else {
      commitBurst = 0;
    }
    lastCommitTime = now;
    const next = normalizeRoute(route);
    const previous = current;
    const suffix = getRouteSuffix(String(route).includes("?") ? route : runtime?.location?.hash || "");
    const url = `#/${next}${suffix}`;
    if (mode === "replace") runtime?.history?.replaceState?.({ ethoneV8Route: next }, "", url);
    else runtime?.history?.pushState?.({ ethoneV8Route: next }, "", url);
    current = next;
    onRoute(next, Object.freeze({ type: mode, previous, state: runtime?.history?.state || null }));
    return next;
  }

  function handleLocationChange(event = {}) {
    const next = canonicalizeLocation(routeFromLocation());
    if (next === current) return;
    const previous = current;
    current = next;
    onRoute(next, Object.freeze({
      type: event.type === "popstate" ? "history" : "hash",
      previous,
      state: event.state || runtime?.history?.state || null
    }));
  }

  function start() {
    if (started) return current;
    started = true;
    runtime?.addEventListener?.("popstate", handleLocationChange);
    runtime?.addEventListener?.("hashchange", handleLocationChange);
    return commit(routeFromLocation(), "replace");
  }

  function stop() {
    if (!started) return false;
    runtime?.removeEventListener?.("popstate", handleLocationChange);
    runtime?.removeEventListener?.("hashchange", handleLocationChange);
    started = false;
    return true;
  }

  function navigate(route, options = {}) {
    const next = normalizeRoute(route);
    if (next === current && options.force !== true) return current;
    return commit(next, options.replace ? "replace" : "push");
  }

  return Object.freeze({
    start,
    stop,
    navigate,
    current: () => current,
    routes: V8_ROUTES
  });
}
