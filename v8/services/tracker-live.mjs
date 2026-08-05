import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function normalizeStat(input = {}) {
  return Object.freeze({
    displayName: safeText(input.displayName, "", 80),
    displayValue: safeText(input.displayValue, "", 80)
  });
}

function normalizeSegment(input = {}) {
  const stats = input.stats && typeof input.stats === "object" ? input.stats : {};
  return Object.freeze({
    name: safeText(input.name, "", 100),
    stats: Object.freeze(Object.values(stats).slice(0, 4).map(normalizeStat))
  });
}

export function normalizeTrackerPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const handle = connected ? safeText(input.handle || options.identifier, "Rub19", 80) : "";
  const available = connected;
  const overview = available ? (input.segments || []).find((segment) => segment.type === "overview") || input.segments?.[0] : null;
  return Object.freeze({
    connected,
    available,
    handle,
    avatarUrl: available ? safeText(input.avatarUrl, "", 400) : "",
    overview: available && overview ? normalizeSegment(overview) : null,
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createTrackerLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getIdentifier = typeof options.getIdentifier === "function" ? options.getIdentifier : () => "";
  const platform = safeText(options.platform, "origin", 12);
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(45000, Number(options.pollIntervalMs) || 90000);
  const subscribers = new Set();
  let state = normalizeTrackerPresence({}, { connected: false });
  let timer = 0;
  let started = false;
  let destroyed = false;
  let inflight = null;
  let releaseVisibility = null;

  function publish(next) {
    if (JSON.stringify(next) === JSON.stringify(state)) return state;
    state = next;
    subscribers.forEach((subscriber) => {
      try { subscriber(state); } catch {}
    });
    return state;
  }

  async function poll() {
    if (destroyed) return state;
    const connected = isConnected() === true;
    const identifier = connected ? safeText(getIdentifier(), "", 64) : "";
    if (!connected || !identifier || !externalServices?.tracker?.apexProfile) {
      return publish(normalizeTrackerPresence({}, { connected, identifier }));
    }
    if (inflight) return state;
    inflight = externalServices.tracker.apexProfile(platform, identifier);
    try {
      const response = await inflight;
      return publish(normalizeTrackerPresence(response?.data || {}, { connected, identifier }));
    } catch {
      return state.available ? state : publish(normalizeTrackerPresence({}, { connected, identifier }));
    } finally {
      inflight = null;
    }
  }

  function schedule() {
    if (destroyed) return;
    timer = runtime.setTimeout?.(() => {
      timer = 0;
      poll().finally(schedule);
    }, pollIntervalMs) || 0;
  }

  function start() {
    if (destroyed || started) return false;
    started = true;
    poll().finally(schedule);
    releaseVisibility = bindVisibilityRefresh(runtime, poll, { minGapMs: 30000 });
    return true;
  }

  function subscribe(subscriber, config = {}) {
    if (destroyed || typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    if (config.immediate !== false) {
      try { subscriber(state); } catch {}
    }
    return () => subscribers.delete(subscriber);
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    if (timer) runtime.clearTimeout?.(timer);
    timer = 0;
    releaseVisibility?.();
    releaseVisibility = null;
    subscribers.clear();
    return true;
  }

  return Object.freeze({
    start,
    refresh: () => poll(),
    subscribe,
    state: () => state,
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, subscribers: subscribers.size }),
    destroy
  });
}
