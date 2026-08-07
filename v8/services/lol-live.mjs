import { bindVisibilityRefresh } from "./live-poll.mjs";
import { parseRiotId } from "./valorant-live.mjs";

const LOL_DEFAULT_DDRAGON_VERSION = "16.15.1";

function safeText(value, fallback = "", limit = 160) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function normalizeStat(input = {}) {
  return Object.freeze({
    displayName: safeText(input.displayName, "", 80),
    displayValue: safeText(input.displayValue, "", 80)
  });
}

function normalizeOverview(input = {}) {
  const stats = input.stats && typeof input.stats === "object" ? input.stats : {};
  return Object.freeze({
    name: safeText(input.name, "", 100),
    stats: Object.freeze(Object.values(stats).slice(0, 4).map(normalizeStat))
  });
}

export function normalizeLeaguePresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const riotId = connected ? options.riotId || null : null;
  const available = connected && Boolean(riotId);
  const overview = available ? (input.segments || []).find((segment) => segment.type === "overview") || input.segments?.[0] : null;
  return Object.freeze({
    connected,
    available,
    name: riotId?.name || input.handle || "Rub19",
    tag: riotId?.tag || "EUW",
    avatarUrl: available ? safeText(input.avatarUrl, "", 400) : "",
    profileIconId: available ? (Number(input.profileIconId) || 1) : 1,
    ddragonVersion: safeText(input.ddragonVersion, LOL_DEFAULT_DDRAGON_VERSION, 32),
    overview: available && overview ? normalizeOverview(overview) : null,
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createLeagueLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getRiotId = typeof options.getRiotId === "function" ? options.getRiotId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(45000, Number(options.pollIntervalMs) || 90000);
  const subscribers = new Set();
  let state = normalizeLeaguePresence({}, { connected: false });
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
    const riotId = connected ? parseRiotId(getRiotId()) : null;
    if (!connected || !riotId || !externalServices?.tracker?.lolProfile) {
      return publish(normalizeLeaguePresence({}, { connected, riotId }));
    }
    if (inflight) return state;
    inflight = externalServices.tracker.lolProfile(riotId.name, riotId.tag);
    try {
      const response = await inflight;
      return publish(normalizeLeaguePresence(response?.data || {}, { connected, riotId }));
    } catch {
      return state.available ? state : publish(normalizeLeaguePresence({}, { connected, riotId }));
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
