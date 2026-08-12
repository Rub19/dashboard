import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

export function normalizeRedditPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const profile = connected ? input.profile || null : null;
  const available = connected && Boolean(profile?.username);
  const post = available ? input.latestPost || null : null;
  return Object.freeze({
    connected,
    available,
    username: available ? safeText(profile.username, "", 32) : "",
    avatarUrl: available ? safeText(profile.avatarUrl, "", 500) : "",
    karma: available ? Math.max(0, Number(profile.karma) || 0) : 0,
    latestPostTitle: post ? safeText(post.title, "", 240) : "",
    latestPostSubreddit: post ? safeText(post.subreddit, "", 60) : "",
    latestPostUrl: post ? safeText(post.permalink, "", 500) : "",
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createRedditLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getClientId = typeof options.getClientId === "function" ? options.getClientId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(20000, Number(options.pollIntervalMs) || 45000);
  const subscribers = new Set();
  let state = normalizeRedditPresence({}, { connected: false });
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
    const clientId = connected ? safeText(getClientId(), "", 100) : "";
    if (!connected || !clientId || !externalServices?.redditOAuth?.activity) {
      return publish(normalizeRedditPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.redditOAuth.activity(clientId);
    try {
      const response = await inflight;
      return publish(normalizeRedditPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeRedditPresence({}, { connected }));
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
