import { bindVisibilityRefresh } from "./live-poll.mjs";

const STATUSES = new Set(["online", "idle", "dnd", "offline"]);
const AVATAR_HOSTS = new Set(["cdn.discordapp.com"]);
const ARTWORK_HOSTS = new Set(["i.scdn.co"]);

function safeText(value, fallback = "", limit = 180) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function safeUrl(value, hosts) {
  const raw = safeText(value, "", 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && hosts.has(url.hostname) ? url.href : "";
  } catch {
    return "";
  }
}

function activitySummary(activities) {
  const list = Array.isArray(activities) ? activities : [];
  const activity = list.find((entry) => Number(entry?.type) !== 4 && safeText(entry?.name));
  if (!activity) return null;
  return Object.freeze({
    name: safeText(activity.name, "", 80),
    detail: safeText(activity.details, "", 160) || safeText(activity.state, "", 160)
  });
}

export function normalizeSpotifyFromLanyard(spotify) {
  if (!spotify || typeof spotify !== "object") return Object.freeze({ available: false });
  const title = safeText(spotify.title);
  const artist = safeText(spotify.artist);
  const available = Boolean(title && artist);
  const startedAt = Number(spotify.startedAt) || 0;
  const endsAt = Number(spotify.endsAt) || 0;
  const durationMs = available && endsAt > startedAt ? endsAt - startedAt : 0;
  const progressMs = available && startedAt ? Math.min(durationMs, Math.max(0, Date.now() - startedAt)) : 0;
  return Object.freeze({
    available,
    title: available ? title : "",
    artist: available ? artist : "",
    album: available ? safeText(spotify.album) : "",
    artwork: available ? safeUrl(spotify.artworkUrl, ARTWORK_HOSTS) : "",
    playing: available && spotify.playing === true,
    progressMs,
    durationMs,
    trackId: available ? safeText(spotify.trackId, `${title}|${artist}`, 240) : ""
  });
}

export function normalizeDiscordPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const displayName = connected ? safeText(input.displayName) : "";
  const available = connected && Boolean(displayName);
  const activity = available ? activitySummary(input.activities) : null;
  return Object.freeze({
    connected,
    available,
    displayName,
    avatarUrl: available ? safeUrl(input.avatarUrl, AVATAR_HOSTS) : "",
    status: available && STATUSES.has(input.status) ? input.status : "offline",
    activityName: activity?.name || "",
    activityDetail: activity?.detail || "",
    spotify: normalizeSpotifyFromLanyard(available ? input.spotify : null),
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createDiscordLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getUserId = typeof options.getUserId === "function" ? options.getUserId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(15000, Number(options.pollIntervalMs) || 25000);
  const subscribers = new Set();
  let state = normalizeDiscordPresence({}, { connected: false });
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
    const userId = connected ? safeText(getUserId(), "", 24) : "";
    if (!connected || !userId || !externalServices?.lanyard?.presence) {
      return publish(normalizeDiscordPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.lanyard.presence(userId);
    try {
      const response = await inflight;
      return publish(normalizeDiscordPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeDiscordPresence({}, { connected }));
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
    releaseVisibility = bindVisibilityRefresh(runtime, poll);
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
