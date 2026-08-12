import { bindVisibilityRefresh } from "./live-poll.mjs";

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

function safeText(value, fallback = "", limit = 40) {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function safeSkinUrl(value) {
  const raw = safeText(value, "", 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname.endsWith("minecraft.net") ? url.href : "";
  } catch {
    return "";
  }
}

export function normalizeMinecraftPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const username = connected ? safeText(input.username, "", 16) : "";
  const available = connected && USERNAME_PATTERN.test(username);
  const rawHistory = Array.isArray(input.nameHistory) ? input.nameHistory : [];
  const history = available
    ? rawHistory.map((entry) => Object.freeze({
        name: safeText(entry?.name, "", 16),
        changedAt: safeText(entry?.changedAt, "", 48)
      })).filter((entry) => entry.name && entry.name.toLowerCase() !== username.toLowerCase())
    : [];
  return Object.freeze({
    connected,
    available,
    username: available ? username : "",
    uuid: available ? safeText(input.uuid, "", 40) : "",
    skinUrl: available ? safeSkinUrl(input.skinUrl) : "",
    capeUrl: available ? safeSkinUrl(input.capeUrl) : "",
    model: available ? (String(input.model).toLowerCase() === "slim" ? "slim" : "classic") : "classic",
    nameHistory: Object.freeze(history.slice(0, 8)),
    updatedAt: available ? new Date().toISOString() : ""
  });
}

export function createMinecraftLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const getUsername = typeof options.getUsername === "function" ? options.getUsername : () => "";
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(300000, Number(options.pollIntervalMs) || 900000);
  const subscribers = new Set();
  let state = normalizeMinecraftPresence({}, { connected: false });
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
    const username = connected ? safeText(getUsername(), "", 16) : "";
    if (!connected || !username || !externalServices?.minecraft?.profile) {
      return publish(normalizeMinecraftPresence({}, { connected }));
    }
    if (inflight) return state;
    inflight = externalServices.minecraft.profile(username);
    try {
      const response = await inflight;
      return publish(normalizeMinecraftPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeMinecraftPresence({}, { connected }));
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
    releaseVisibility = bindVisibilityRefresh(runtime, poll, { minGapMs: 60000 });
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, username: state.username, subscribers: subscribers.size }),
    destroy
  });
}
