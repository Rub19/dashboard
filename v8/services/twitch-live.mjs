import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

export function normalizeTwitchPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const displayName = connected ? safeText(input.displayName, "", 80) : "";
  const available = connected && Boolean(displayName);
  const live = available && input.live === true;
  return Object.freeze({
    connected,
    available,
    displayName,
    login: available ? safeText(input.login, "", 32) : "",
    profileImageUrl: available ? safeText(input.profileImageUrl, "", 400) : "",
    live,
    title: live ? safeText(input.stream?.title, "", 240) : "",
    gameName: live ? safeText(input.stream?.gameName, "", 120) : "",
    viewers: live ? Math.max(0, Number(input.stream?.viewers) || 0) : 0,
    thumbnailUrl: live ? safeText(input.stream?.thumbnailUrl, "", 400) : "",
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createTwitchLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getLogin = typeof options.getLogin === "function" ? options.getLogin : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(60000, Number(options.pollIntervalMs) || 90000);
  const subscribers = new Set();
  let state = normalizeTwitchPresence({}, { connected: false });
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
    const login = connected ? safeText(getLogin(), "", 32) : "";
    if (!connected || !login || !externalServices?.twitch?.channel) {
      return publish(normalizeTwitchPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.twitch.channel(login);
    try {
      const response = await inflight;
      return publish(normalizeTwitchPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeTwitchPresence({}, { connected }));
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, live: state.live, subscribers: subscribers.size }),
    destroy
  });
}
