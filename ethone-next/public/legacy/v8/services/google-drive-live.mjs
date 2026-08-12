import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(new RegExp("[\\u0000-\\u001f\\u007f]", "g"), " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function normalizeFile(input = {}) {
  return Object.freeze({
    id: safeText(input.id, "", 128),
    name: safeText(input.name, "(Sans titre)", 200),
    mimeType: safeText(input.mimeType, "", 120),
    modifiedTime: safeText(input.modifiedTime, "", 40),
    webViewLink: safeText(input.webViewLink, "", 500),
    iconUrl: safeText(input.iconUrl, "", 500)
  });
}

export function normalizeGoogleDrivePresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const files = connected && Array.isArray(input.files) ? input.files.map(normalizeFile).filter((file) => file.id) : [];
  const available = connected && files.length > 0;
  return Object.freeze({
    connected,
    available,
    files: Object.freeze(files),
    latestFile: available ? files[0] : null,
    updatedAt: connected ? new Date().toISOString() : ""
  });
}

export function createGoogleDriveLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getClientId = typeof options.getClientId === "function" ? options.getClientId : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(20000, Number(options.pollIntervalMs) || 45000);
  const subscribers = new Set();
  let state = normalizeGoogleDrivePresence({}, { connected: false });
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
    if (!connected || !clientId || !externalServices?.googleDriveOAuth?.files) {
      return publish(normalizeGoogleDrivePresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.googleDriveOAuth.files(clientId);
    try {
      const response = await inflight;
      return publish(normalizeGoogleDrivePresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeGoogleDrivePresence({}, { connected }));
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, files: state.files.length, subscribers: subscribers.size }),
    destroy
  });
}
