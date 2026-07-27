import { bindVisibilityRefresh } from "./live-poll.mjs";

function safeText(value, fallback = "", limit = 200) {
  const normalized = String(value ?? "").replace(/[ -]/g, " ").replace(/\s+/g, " ").trim();
  return (normalized || fallback).slice(0, limit);
}

function safePublicUrl(value) {
  const raw = safeText(value, "", 2048);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname.endsWith("notion.so") ? url.href : "";
  } catch {
    return "";
  }
}

function normalizePage(input = {}) {
  return Object.freeze({
    id: safeText(input.id, "", 64),
    title: safeText(input.title, "(Sans titre)", 200),
    url: safePublicUrl(input.url),
    lastEditedTime: safeText(input.lastEditedTime, "", 40),
    kind: safeText(input.kind, "Page", 20)
  });
}

export function normalizeNotionPresence(input = {}, options = {}) {
  const connected = options.connected === true;
  const pages = connected && Array.isArray(input.pages) ? input.pages.map(normalizePage).filter((page) => page.id) : [];
  const available = connected && pages.length > 0;
  return Object.freeze({
    connected,
    available,
    pages: Object.freeze(pages),
    latestPage: available ? pages[0] : null,
    updatedAt: connected ? new Date().toISOString() : ""
  });
}

export function createNotionLive(options = {}) {
  const runtime = options.runtime || globalThis;
  const externalServices = options.externalServices || null;
  const isConnected = typeof options.isConnected === "function" ? options.isConnected : () => false;
  const pollIntervalMs = Math.max(60000, Number(options.pollIntervalMs) || 300000);
  const subscribers = new Set();
  let state = normalizeNotionPresence({}, { connected: false });
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
    if (!connected || !externalServices?.notionOAuth?.pages) return publish(normalizeNotionPresence({}, { connected }));
    if (inflight) return state;
    inflight = externalServices.notionOAuth.pages();
    try {
      const response = await inflight;
      return publish(normalizeNotionPresence(response?.data || {}, { connected }));
    } catch {
      return state.available ? state : publish(normalizeNotionPresence({}, { connected }));
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
    diagnostics: () => Object.freeze({ connected: state.connected, available: state.available, pages: state.pages.length, subscribers: subscribers.size }),
    destroy
  });
}
