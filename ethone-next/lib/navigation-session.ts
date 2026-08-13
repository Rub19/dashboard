const STORAGE_PREFIX = "ethone:v8-navigation:";
const ROUTE_PATTERN = /^[a-z0-9-]{1,32}$/;
const MAX_SCROLL = 10_000_000;

function normalizeRoute(value: unknown): string {
  const route = String(value || "home").trim().toLowerCase();
  return ROUTE_PATTERN.test(route) ? route : "home";
}

function normalizeScroll(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(MAX_SCROLL, Math.max(0, Math.round(number)));
}

function storageFrom(options: { storage?: Storage | null; runtime?: typeof globalThis }): Storage | null {
  if (options.storage) return options.storage;
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

function readPositions(storage: Storage | null, key: string): Record<string, number> {
  try {
    const parsed = JSON.parse(storage?.getItem?.(key) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([route]) => ROUTE_PATTERN.test(route))
        .slice(0, 32)
        .map(([route, value]) => [route, normalizeScroll(value)])
    );
  } catch {
    return {};
  }
}

export type NavigationSession = {
  capture: (route?: string) => number;
  restore: (route: string, settings?: { reset?: boolean }) => number;
  destroy: (route?: string) => boolean;
  diagnostics: () => { scope: string; route: string | null; savedRoutes: number; restorePending: boolean; restores: number };
};

export function createNavigationSession(options: { scope?: string; stage?: HTMLElement | null; storage?: Storage | null } = {}): NavigationSession {
  const stage = options.stage || null;
  const storage = storageFrom(options);
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

  function cancelRestore() {
    if (!restoreFrame) return;
    cancelAnimationFrame(restoreFrame);
    restoreFrame = 0;
  }

  function capture(route = currentRoute): number {
    if (!stage || !route) return 0;
    const normalized = normalizeRoute(route);
    const scroll = normalizeScroll(stage.scrollTop);
    positions[normalized] = scroll;
    currentRoute = normalized;
    persist();
    return scroll;
  }

  function restore(route: string, settings: { reset?: boolean } = {}): number {
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
    if (typeof requestAnimationFrame === "function") {
      restoreFrame = requestAnimationFrame(apply);
    } else {
      apply();
    }
    return scroll;
  }

  function destroy(route = currentRoute): boolean {
    if (route) capture(route);
    cancelRestore();
    return true;
  }

  return Object.freeze({
    capture,
    restore,
    destroy,
    diagnostics: () => Object.freeze({ scope, route: currentRoute || null, savedRoutes: Object.keys(positions).length, restorePending: Boolean(restoreFrame), restores }),
  });
}
