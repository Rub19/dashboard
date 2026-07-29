import { bindVisibilityRefresh } from "./live-poll.mjs";
import { parseRiotId } from "./valorant-live.mjs";

function safeText(value, fallback = "", limit = 160) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function normalizeMatch(input = {}) {
  return Object.freeze({
    id: safeText(input.id, "", 64),
    mode: safeText(input.mode, "", 24),
    champion: safeText(input.champion, "", 32),
    win: input.win === true ? true : input.win === false ? false : null,
    kills: Number.isFinite(Number(input.kills)) ? Number(input.kills) : 0,
    deaths: Number.isFinite(Number(input.deaths)) ? Number(input.deaths) : 0,
    assists: Number.isFinite(Number(input.assists)) ? Number(input.assists) : 0,
    cs: Number.isFinite(Number(input.cs)) ? Number(input.cs) : 0
  });
}

export function normalizeLeaguePresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const riotId = connected ? options.riotId || null : null;
  const available = connected && Boolean(riotId) && (input.rank?.ranked === true || Array.isArray(input.matches));
  return Object.freeze({
    connected,
    available,
    name: riotId?.name || "",
    tag: riotId?.tag || "",
    ranked: available && input.rank?.ranked === true,
    tier: available ? safeText(input.rank?.tier, "", 16) : "",
    rank: available ? safeText(input.rank?.rank, "", 4) : "",
    leaguePoints: available ? Math.max(0, Number(input.rank?.leaguePoints) || 0) : 0,
    wins: available ? Math.max(0, Number(input.rank?.wins) || 0) : 0,
    losses: available ? Math.max(0, Number(input.rank?.losses) || 0) : 0,
    matches: available ? Object.freeze((input.matches || []).slice(0, 5).map(normalizeMatch)) : Object.freeze([]),
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
    if (!connected || !riotId || !externalServices?.riotLol?.rank) {
      return publish(normalizeLeaguePresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = Promise.all([
      externalServices.riotLol.rank(riotId.name, riotId.tag).catch(() => null),
      externalServices.riotLol.matches(riotId.name, riotId.tag).catch(() => null)
    ]);
    try {
      const [rankResponse, matchesResponse] = await inflight;
      return publish(normalizeLeaguePresence({ rank: rankResponse?.data || null, matches: matchesResponse?.data || null }, { connected, riotId }));
    } catch {
      return state.available ? state : publish(normalizeLeaguePresence({}, { connected }));
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, tier: state.tier, subscribers: subscribers.size }),
    destroy
  });
}
