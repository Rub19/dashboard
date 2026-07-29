import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 160) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

export function parseRiotId(reference) {
  const raw = safeText(reference, "", 60);
  const index = raw.indexOf("#");
  if (index <= 0 || index === raw.length - 1) return null;
  return Object.freeze({ name: raw.slice(0, index), tag: raw.slice(index + 1) });
}

function normalizeMatch(input = {}) {
  return Object.freeze({
    id: safeText(input.id, "", 64),
    map: safeText(input.map, "", 32),
    mode: safeText(input.mode, "", 32),
    won: input.won === true ? true : input.won === false ? false : null,
    kills: Number.isFinite(Number(input.kills)) ? Number(input.kills) : 0,
    deaths: Number.isFinite(Number(input.deaths)) ? Number(input.deaths) : 0,
    assists: Number.isFinite(Number(input.assists)) ? Number(input.assists) : 0,
    characterName: safeText(input.characterName, "", 32)
  });
}

export function normalizeValorantPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const riotId = connected ? options.riotId || null : null;
  const available = connected && Boolean(riotId) && (Boolean(input.rank?.tierName) || Array.isArray(input.matches));
  return Object.freeze({
    connected,
    available,
    name: riotId?.name || "",
    tag: riotId?.tag || "",
    tierName: available ? safeText(input.rank?.tierName, "", 40) : "",
    rankInTier: available ? Math.max(0, Math.min(100, Number(input.rank?.rankInTier) || 0)) : 0,
    elo: available ? Math.max(0, Number(input.rank?.elo) || 0) : 0,
    lastGameDelta: available ? Math.round(Number(input.rank?.lastGameDelta) || 0) : 0,
    emblemUrl: available ? safeText(input.rank?.emblemUrl, "", 400) : "",
    matches: available ? Object.freeze((input.matches || []).slice(0, 5).map(normalizeMatch)) : Object.freeze([]),
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createValorantLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getRiotId = typeof options.getRiotId === "function" ? options.getRiotId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(45000, Number(options.pollIntervalMs) || 90000);
  const subscribers = new Set();
  let state = normalizeValorantPresence({}, { connected: false });
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
    if (!connected || !riotId || !externalServices?.henrik?.rank) {
      return publish(normalizeValorantPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = Promise.all([
      externalServices.henrik.rank(riotId.name, riotId.tag).catch(() => null),
      externalServices.henrik.matches(riotId.name, riotId.tag).catch(() => null)
    ]);
    try {
      const [rankResponse, matchesResponse] = await inflight;
      return publish(normalizeValorantPresence({ rank: rankResponse?.data || null, matches: matchesResponse?.data || null }, { connected, riotId }));
    } catch {
      return state.available ? state : publish(normalizeValorantPresence({}, { connected }));
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, tierName: state.tierName, subscribers: subscribers.size }),
    destroy
  });
}
