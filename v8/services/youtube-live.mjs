import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

export function normalizeYoutubePresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const channel = connected ? input.channel || null : null;
  const available = connected && Boolean(channel?.title);
  const video = available ? input.latestVideo || null : null;
  return Object.freeze({
    connected,
    available,
    channelTitle: available ? safeText(channel.title, "", 120) : "",
    thumbnailUrl: available ? safeText(channel.thumbnailUrl, "", 500) : "",
    subscriberCount: available ? Math.max(0, Number(channel.subscriberCount) || 0) : 0,
    latestVideoTitle: video ? safeText(video.title, "", 200) : "",
    latestVideoThumbnailUrl: video ? safeText(video.thumbnailUrl, "", 500) : "",
    latestVideoPublishedAt: video ? safeText(video.publishedAt, "", 40) : "",
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createYoutubeLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getClientId = typeof options.getClientId === "function" ? options.getClientId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(60000, Number(options.pollIntervalMs) || 300000);
  const subscribers = new Set();
  let state = normalizeYoutubePresence({}, { connected: false });
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
    if (!connected || !clientId || !externalServices?.youtubeOAuth?.activity) {
      return publish(normalizeYoutubePresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.youtubeOAuth.activity(clientId);
    try {
      const response = await inflight;
      return publish(normalizeYoutubePresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeYoutubePresence({}, { connected }));
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
