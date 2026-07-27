function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

export function createSpotifyOAuthLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getClientId = typeof options.getClientId === "function" ? options.getClientId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const onTrack = typeof options.onTrack === "function" ? options.onTrack : () => {};
  const pollIntervalMs = Math.max(15000, Number(options.pollIntervalMs) || 20000);
  let timer = 0;
  let started = false;
  let destroyed = false;
  let inflight = null;

  async function poll() {
    if (destroyed) return;
    const connected = isConnected() === true;
    const clientId = connected ? safeText(getClientId(), "", 64) : "";
    if (!connected || !clientId || !externalServices?.spotifyOAuth?.nowPlaying || inflight) return;
    inflight = externalServices.spotifyOAuth.nowPlaying(clientId);
    try {
      const response = await inflight;
      const track = response?.data?.track;
      onTrack(track ? {
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artworkUrl,
        is_playing: response.data.playing,
        progress_ms: track.progressMs,
        duration_ms: track.durationMs,
        id: track.id
      } : { track: null });
    } catch {
      // Transient failure: keep the last known playback state and retry next tick.
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
    return true;
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    if (timer) runtime.clearTimeout?.(timer);
    timer = 0;
    return true;
  }

  return Object.freeze({ start, refresh: () => poll(), destroy });
}
