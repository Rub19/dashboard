import { bindVisibilityRefresh } from "./live-poll.mjs";

const STATUS_BY_STATE = Object.freeze({
  0: "offline",
  1: "online",
  2: "dnd",
  3: "idle",
  4: "idle",
  5: "online",
  6: "online"
});

function safeText(value, fallback = "", limit = 160) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function safeUrl(value, hosts) {
  const raw = safeText(value, "", 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && hosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : "";
  } catch {
    return "";
  }
}

export function normalizeSteamPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const displayName = connected ? safeText(input.displayName, "", 100) : "";
  const available = connected && Boolean(displayName);
  const gameName = available ? safeText(input.gameName, "", 120) : "";
  return Object.freeze({
    connected,
    available,
    displayName,
    avatarUrl: available ? safeUrl(input.avatarUrl, ["steamstatic.com", "akamaihd.net"]) : "",
    profileUrl: available ? safeUrl(input.profileUrl, ["steamcommunity.com"]) : "",
    status: available ? (STATUS_BY_STATE[Number(input.personaState)] || "offline") : "offline",
    inGame: available && Boolean(gameName),
    gameName,
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createSteamLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getSteamId = typeof options.getSteamId === "function" ? options.getSteamId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(60000, Number(options.pollIntervalMs) || 120000);
  const subscribers = new Set();
  let state = normalizeSteamPresence({}, { connected: false });
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
    const steamId = connected ? safeText(getSteamId(), "", 100) : "";
    if (!connected || !steamId || !externalServices?.steam?.player) {
      return publish(normalizeSteamPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.steam.player(steamId);
    try {
      const response = await inflight;
      return publish(normalizeSteamPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeSteamPresence({}, { connected }));
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
    releaseVisibility = bindVisibilityRefresh(runtime, poll, { minGapMs: 20000 });
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, status: state.status, subscribers: subscribers.size }),
    destroy
  });
}
