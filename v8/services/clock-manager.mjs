function safeDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function createClockSnapshot(value = new Date(), locale = "fr-FR") {
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

export function createClockManager(options = {}) {
  const runtime = options.runtime || globalThis;
  const documentRef = options.document || runtime.document;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const locale = typeof options.locale === "function" ? options.locale : () => options.locale || "fr-FR";
  const listeners = new Set();
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
    if (timer) runtime.clearTimeout?.(timer);
    const timestamp = safeDate(now()).getTime();
    const delay = Math.max(250, 60_000 - (timestamp % 60_000) + 25);
    timer = runtime.setTimeout?.(() => {
      timer = 0;
      publish();
      schedule();
    }, delay) || 0;
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

  function subscribe(listener, settings = {}) {
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
    if (timer) runtime.clearTimeout?.(timer);
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
    diagnostics: () => Object.freeze({ started, timerActive: Boolean(timer), subscribers: listeners.size, ...current }),
    destroy
  });
}
