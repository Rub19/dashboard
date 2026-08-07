import { element, icon } from "./dom.mjs";
import { createToastManager } from "./toast.mjs";

const HISTORY_KEY = "v8_notification_history";
const MUTED_KEY = "v8_notification_muted";
const DEFAULT_CATEGORIES = Object.freeze(["system", "brain", "updates", "focus", "tasks", "notes", "connections", "saves"]);

function loadStorage(key, fallback = []) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); } catch { /* silent */ }
}

export function createNotificationManager(region, options = {}) {
  const manager = createToastManager(region, options);
  const history = loadStorage(HISTORY_KEY, []);
  const muted = new Set(loadStorage(MUTED_KEY, []));
  const subscribers = new Set();

  function notifySubscribers() {
    subscribers.forEach((callback) => callback(unreadCount()));
  }

  function unreadCount() {
    return history.filter((item) => !item.read && !item.archived).length;
  }

  function importantCount() {
    return history.filter((item) => !item.read && !item.archived && (item.type === "error" || item.type === "warning" || item.priority === "high")).length;
  }

  function persist() {
    saveStorage(HISTORY_KEY, history.slice(-250));
  }

  function buildRecord(notice) {
    const id = String(notice.id || `${notice.title}-${Date.now()}`).slice(0, 96);
    const category = notice.category && DEFAULT_CATEGORIES.includes(notice.category) ? notice.category : "system";
    const priority = ["high", "medium", "low"].includes(notice.priority) ? notice.priority : "medium";
    return {
      id,
      title: String(notice.title || "ETHONE"),
      message: String(notice.message || ""),
      type: ["success", "error", "warning", "info", "sync", "update", "brain", "loading"].includes(notice.type) ? notice.type : "info",
      category,
      priority,
      read: false,
      archived: false,
      timestamp: notice.timestamp || Date.now(),
      action: notice.action ? { label: String(notice.action.label || "Ouvrir"), run: notice.action.run } : null
    };
  }

  function upsert(notice) {
    const record = buildRecord(notice);
    const existing = history.find((item) => item.id === record.id);
    if (existing) {
      existing.title = record.title;
      existing.message = record.message;
      existing.type = record.type;
      existing.category = record.category;
      existing.priority = record.priority;
      existing.timestamp = record.timestamp;
      existing.action = record.action;
      existing.archived = false;
    } else {
      history.unshift(record);
      if (history.length > 300) history.length = 300;
    }
    persist();
    notifySubscribers();
    return record;
  }

  function show(notice = {}) {
    const record = upsert(notice);
    if (notice.silent || muted.has(record.category)) {
      notifySubscribers();
      return record.id;
    }
    const important = record.type === "error" || record.type === "warning" || record.priority === "high" || notice.important === true;
    manager.show({
      id: record.id,
      title: record.title,
      message: record.message,
      type: record.type,
      duration: notice.duration,
      important,
      action: record.action
    });
    return record.id;
  }

  function markRead(ids, read = true) {
    [].concat(ids).forEach((id) => {
      const item = history.find((entry) => entry.id === id);
      if (item) item.read = read;
    });
    persist();
    notifySubscribers();
  }

  function archive(ids) {
    [].concat(ids).forEach((id) => {
      const item = history.find((entry) => entry.id === id);
      if (item) item.archived = true;
    });
    persist();
    notifySubscribers();
  }

  function clear() {
    history.length = 0;
    persist();
    manager.destroy();
    notifySubscribers();
  }

  function markAllRead() {
    history.forEach((item) => { if (!item.archived) item.read = true; });
    persist();
    notifySubscribers();
  }

  function muteCategory(category) {
    if (!category) return;
    muted.add(category);
    saveStorage(MUTED_KEY, [...muted]);
  }

  function unmuteCategory(category) {
    if (!category) return;
    muted.delete(category);
    saveStorage(MUTED_KEY, [...muted]);
  }

  function isMuted(category) {
    return muted.has(category);
  }

  function getHistory() {
    return history.filter((item) => !item.archived);
  }

  function getArchived() {
    return history.filter((item) => item.archived);
  }

  function getCategories() {
    return [...DEFAULT_CATEGORIES];
  }

  function subscribe(callback) {
    subscribers.add(callback);
    callback(unreadCount());
    return () => subscribers.delete(callback);
  }

  function dismiss(id) {
    manager.dismiss(id);
  }

  function destroy() {
    manager.destroy();
    subscribers.clear();
  }

  return Object.freeze({
    show,
    dismiss,
    markRead,
    archive,
    markAllRead,
    clear,
    muteCategory,
    unmuteCategory,
    isMuted,
    getHistory,
    getArchived,
    getCategories,
    unreadCount,
    importantCount,
    subscribe,
    destroy
  });
}
