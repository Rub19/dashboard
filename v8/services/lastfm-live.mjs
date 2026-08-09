import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

export function normalizeLastfmPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const track = connected ? input.track || null : null;
  const available = connected && Boolean(track?.name);
  return Object.freeze({
    connected,
    available,
    playing: available && track.playing === true,
    title: available ? safeText(track.name, "", 180) : "",
    artist: available ? safeText(track.artist, "", 160) : "",
    album: available ? safeText(track.album, "", 160) : "",
    artworkUrl: available ? safeText(track.artworkUrl, "", 400) : "",
    profileUrl: available ? safeText(track.profileUrl, "", 400) : "",
    playCount: available ? Math.max(0, Number(track.playCount) || 0) : 0,
    playedAt: available ? safeText(track.playedAt, "", 48) : "",
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createLastfmLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getUsername = typeof options.getUsername === "function" ? options.getUsername : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(15000, Number(options.pollIntervalMs) || 20000);
  const subscribers = new Set();
  let state = normalizeLastfmPresence({}, { connected: false });
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
    const username = connected ? safeText(getUsername(), "", 32) : "";
    if (!connected || !username || !externalServices?.lastfm?.recentTracks) {
      return publish(normalizeLastfmPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.lastfm.recentTracks(username, 1);
    try {
      const response = await inflight;
      const track = Array.isArray(response?.data) ? response.data[0] : null;
      return publish(normalizeLastfmPresence({ track }, { connected }));
    } catch {
      return state.available ? state : publish(normalizeLastfmPresence({}, { connected }));
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
    releaseVisibility = bindVisibilityRefresh(runtime, poll, { minGapMs: 15000 });
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, playing: state.playing, subscribers: subscribers.size }),
    destroy
  });
}
