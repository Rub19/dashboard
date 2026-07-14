const COMMANDS = new Set(["play", "pause", "toggle", "next", "previous"]);
const SPOTIFY_IMAGE_HOSTS = new Set(["i.scdn.co"]);

function safeText(value, fallback = "", limit = 180) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function boundedNumber(value, maximum = 86400000) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, number)) : 0;
}

function artistName(value) {
  if (Array.isArray(value)) return value.map((artist) => safeText(artist?.name || artist, "", 80)).filter(Boolean).join(", ").slice(0, 180);
  return safeText(value, "", 180);
}

function safeArtwork(value, origin) {
  const raw = safeText(value, "", 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw, origin);
    if (url.origin === origin || (url.protocol === "https:" && SPOTIFY_IMAGE_HOSTS.has(url.hostname))) return url.href;
  } catch {}
  return "";
}

export function normalizeSpotifyPlayback(input = {}, options = {}) {
  const track = input.track && typeof input.track === "object"
    ? input.track
    : input.item && typeof input.item === "object"
      ? input.item
      : input;
  const album = track.album && typeof track.album === "object" ? track.album : {};
  const title = safeText(track.title || track.name || input.title, "", 180);
  const artist = artistName(track.artist || track.artists || input.artist || input.artists);
  const albumName = safeText(album.name || track.albumName || input.album, "", 180);
  const durationMs = boundedNumber(track.durationMs ?? track.duration_ms ?? input.durationMs ?? input.duration_ms);
  const progressMs = Math.min(durationMs || 86400000, boundedNumber(input.progress_ms ?? input.position_ms ?? input.progressMs ?? input.positionMs ?? input.position));
  const connected = options.connected === true;
  const available = connected && Boolean(title && artist);
  const origin = String(options.origin || "https://ethone.dev");
  const artwork = available ? safeArtwork(
    track.artwork || album.images?.[0]?.url || input.artwork || input.image,
    origin
  ) : "";
  const playing = available && (Object.hasOwn(input, "is_playing")
    ? input.is_playing === true
    : Object.hasOwn(input, "playing")
      ? input.playing === true
      : input.state === "playing");
  const controllable = available && (input.controllable === true || input.capabilities?.playback === true);
  const progress = durationMs ? Math.min(1, progressMs / durationMs) : 0;

  return Object.freeze({
    connected,
    available,
    playing,
    controllable,
    title: available ? title : "",
    artist: available ? artist : "",
    album: available ? albumName : "",
    artwork,
    progressMs,
    durationMs,
    progress,
    remainingMs: playing && durationMs ? Math.max(0, durationMs - progressMs) : 0,
    trackId: available ? safeText(track.id || input.trackId, `${title}|${artist}`, 240) : "",
    updatedAt: available ? safeText(input.updatedAt || input.timestamp, "", 48) : ""
  });
}

function completed(message, data = null) {
  return Object.freeze({ ok: true, status: "completed", message, data });
}

function unavailable(message) {
  return Object.freeze({ ok: false, status: "unavailable", message, data: null });
}

function failed(message, error) {
  return Object.freeze({ ok: false, status: "failed", message, data: error || null });
}

export function createSpotifyLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const documentRef = options.document || runtime.document;
  const bridge = options.bridge || runtime.ETHONESpotify || null;
  const commandBridge = typeof options.command === "function"
    ? options.command
    : typeof bridge?.command === "function"
      ? (action) => bridge.command(action)
      : null;
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const origin = runtime.location?.origin || options.origin || "https://ethone.dev";
  const subscribers = new Set();
  const connected = () => {
    try { return isConnected() === true; } catch { return false; }
  };
  let state = normalizeSpotifyPlayback({}, { connected: connected(), origin });
  let bridgeCleanup = null;
  let started = false;
  let destroyed = false;

  function dispatch(name, detail) {
    const EventType = runtime.CustomEvent || globalThis.CustomEvent;
    if (!documentRef?.dispatchEvent || typeof EventType !== "function") return false;
    try { return documentRef.dispatchEvent(new EventType(name, { detail })); } catch { return false; }
  }

  function announceMedia(previous, next) {
    if (previous.playing === next.playing) return;
    dispatch("ethone:media-activity", Object.freeze({ source: "spotify", active: next.playing }));
  }

  function publish(input = {}) {
    if (destroyed) return state;
    const clearTrack = input.track === null || input.item === null;
    const merged = clearTrack
      ? { ...input, title: "", artist: "", album: "", artwork: "", progressMs: 0, durationMs: 0 }
      : { ...state, ...input };
    if (Object.hasOwn(input, "is_playing")) merged.playing = input.is_playing === true;
    else if (Object.hasOwn(input, "state") && !Object.hasOwn(input, "playing")) merged.playing = input.state === "playing";
    if (Object.hasOwn(input, "progress_ms")) merged.progressMs = input.progress_ms;
    else if (Object.hasOwn(input, "position_ms")) merged.progressMs = input.position_ms;
    merged.controllable = merged.controllable === true && Boolean(commandBridge);
    const next = normalizeSpotifyPlayback(merged, { connected: connected(), origin });
    const changed = JSON.stringify(next) !== JSON.stringify(state);
    if (!changed) return state;
    const previous = state;
    state = next;
    announceMedia(previous, next);
    subscribers.forEach((subscriber) => {
      try { subscriber(state, previous); } catch {}
    });
    return state;
  }

  function handlePlayback(event) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    publish(detail);
  }

  function start() {
    if (destroyed || started) return false;
    started = true;
    documentRef?.addEventListener?.("ethone:spotify-playback", handlePlayback);
    if (typeof bridge?.subscribe === "function") {
      try {
        const cleanup = bridge.subscribe((playback = {}) => publish(playback));
        if (typeof cleanup === "function") bridgeCleanup = cleanup;
      } catch {}
    }
    if (typeof bridge?.snapshot === "function") {
      try {
        const snapshot = bridge.snapshot();
        if (snapshot?.then) snapshot.then((playback) => publish(playback || {}), () => publish({}));
        else publish(snapshot || {});
      } catch { publish({}); }
    } else publish({});
    return true;
  }

  function subscribe(subscriber, config = {}) {
    if (destroyed || typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    if (config.immediate !== false) {
      try { subscriber(state, state); } catch {}
    }
    return () => subscribers.delete(subscriber);
  }

  function command(requested) {
    const commandName = safeText(requested, "", 16).toLowerCase();
    if (!COMMANDS.has(commandName)) return unavailable("Commande Spotify invalide.");
    if (!state.available || !state.controllable) return unavailable("Le contrôle Spotify n'est pas disponible.");
    const action = commandName === "toggle" ? (state.playing ? "pause" : "play") : commandName;
    try {
      if (!commandBridge) return unavailable("Le bridge Spotify n'est pas disponible.");
      const response = commandBridge(action);
      if (response?.then) {
        return response.then(() => completed("Commande Spotify transmise.", { action }), (error) => failed("Spotify n'a pas répondu.", error));
      }
      return completed("Commande Spotify transmise.", { action });
    } catch (error) {
      return failed("Spotify n'a pas répondu.", error);
    }
  }

  function destroy() {
    if (destroyed) return false;
    if (state.playing) dispatch("ethone:media-activity", Object.freeze({ source: "spotify", active: false }));
    destroyed = true;
    documentRef?.removeEventListener?.("ethone:spotify-playback", handlePlayback);
    try { bridgeCleanup?.(); } catch {}
    bridgeCleanup = null;
    subscribers.clear();
    return true;
  }

  return Object.freeze({
    start,
    publish,
    subscribe,
    command,
    refresh: () => publish({}),
    state: () => state,
    diagnostics: () => Object.freeze({
      connected: state.connected,
      available: state.available,
      playing: state.playing,
      controllable: state.controllable,
      subscribers: subscribers.size,
      bridge: Boolean(bridge)
    }),
    destroy
  });
}
