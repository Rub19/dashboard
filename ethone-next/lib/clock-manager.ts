"use client";

export interface ClockSnapshot {
  time: string;
  date: string;
  timeZone: string;
  timestamp: number;
}

export interface ClockDiagnostics extends ClockSnapshot {
  started: boolean;
  timerActive: boolean;
  subscribers: number;
}

export interface ClockManager {
  start: () => boolean;
  refresh: () => void;
  subscribe: (listener: (snapshot: ClockSnapshot) => void, settings?: { immediate?: boolean }) => () => boolean;
  snapshot: () => ClockSnapshot;
  diagnostics: () => ClockDiagnostics;
  destroy: () => boolean;
}

function safeDate(value?: Date | string | number): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value ?? Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function createClockSnapshot(value: Date | string | number = new Date(), locale = "fr-FR"): ClockSnapshot {
  const date = safeDate(value);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone
  }).format(date);
  return Object.freeze({
    time,
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    timeZone,
    timestamp: date.getTime()
  });
}

export function createClockManager(options: { now?: () => Date; locale?: (() => string) | string } = {}): ClockManager {
  const runtime = typeof window !== "undefined" ? window : (globalThis as unknown as Window & typeof globalThis);
  const documentRef = typeof document !== "undefined" ? document : undefined;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const locale = typeof options.locale === "function" ? options.locale : () => (typeof options.locale === "string" ? options.locale : "fr-FR");
  const listeners = new Set<(snapshot: ClockSnapshot) => void>();
  let current = createClockSnapshot(now(), locale());
  let timer = 0;
  let started = false;
  let destroyed = false;

  function publish(force = false) {
    const next = createClockSnapshot(now(), locale());
    const changed = force || next.time !== current.time || next.date !== current.date || next.timeZone !== current.timeZone;
    current = next;
    if (changed) listeners.forEach((listener) => { try { listener(current); } catch {} });
    return current;
  }

  function schedule() {
    if (!started || destroyed) return;
    if (timer) window.clearTimeout(timer);
    const timestamp = safeDate(now()).getTime();
    const delay = Math.max(250, 60_000 - (timestamp % 60_000) + 25);
    timer = window.setTimeout(() => {
      timer = 0;
      publish();
      schedule();
    }, delay);
  }

  function refresh() {
    publish(true);
    schedule();
  }

  function handleVisibility() {
    if (documentRef?.hidden !== true) refresh();
  }

  function start() {
    if (destroyed || started) return false;
    started = true;
    documentRef?.addEventListener?.("visibilitychange", handleVisibility);
    runtime.addEventListener?.("pageshow", refresh);
    refresh();
    return true;
  }

  function subscribe(listener: (snapshot: ClockSnapshot) => void, settings: { immediate?: boolean } = {}) {
    if (typeof listener !== "function" || destroyed) return () => false;
    listeners.add(listener);
    if (settings.immediate !== false) {
      try { listener(current); } catch {}
    }
    return () => listeners.delete(listener);
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    started = false;
    if (timer) window.clearTimeout(timer);
    timer = 0;
    documentRef?.removeEventListener?.("visibilitychange", handleVisibility);
    runtime.removeEventListener?.("pageshow", refresh);
    listeners.clear();
    return true;
  }

  return Object.freeze({
    start,
    refresh,
    subscribe,
    snapshot: () => current,
    diagnostics: () => Object.freeze({ started, timerActive: Boolean(timer), subscribers: listeners.size, ...current }) as ClockDiagnostics,
    destroy
  });
}
