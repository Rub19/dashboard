"use client";

const DB_NAME = "ethone-mail-cache";
const DB_VERSION = 1;

const MESSAGES_STORE = "messages";
const TEMPLATES_STORE = "templates";
const RULES_STORE = "rules";
const NOTIFICATIONS_STORE = "notifications";
const OUTBOX_STORE = "outbox";
const META_STORE = "meta";

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        db.createObjectStore(MESSAGES_STORE, { keyPath: "folder" });
      }
      if (!db.objectStoreNames.contains(TEMPLATES_STORE)) {
        db.createObjectStore(TEMPLATES_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(RULES_STORE)) {
        db.createObjectStore(RULES_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        db.createObjectStore(NOTIFICATIONS_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
  });
}

async function withStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
  const db = await openDB();
  if (!db) return null;
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

async function putAll(storeName: string, items: unknown[]) {
  const store = await withStore(storeName, "readwrite");
  if (!store) return false;
  await new Promise<void>((resolve) => {
    const clear = store.clear();
    clear.onsuccess = () => resolve();
    clear.onerror = () => resolve();
  });
  if (!Array.isArray(items)) return true;
  for (const item of items) {
    if (item == null) continue;
    store.put(item);
  }
  return true;
}

async function getAll(storeName: string) {
  const store = await withStore(storeName, "readonly");
  if (!store) return [];
  return new Promise<Record<string, unknown>[]>((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
    request.onerror = () => resolve([]);
  });
}

export interface MailCache {
  putMessages: (folder: string, messages: unknown[]) => Promise<boolean>;
  getMessages: (folder: string) => Promise<unknown[]>;
  putTemplates: (templates: unknown[]) => Promise<boolean>;
  getTemplates: () => Promise<Record<string, unknown>[]>;
  putRules: (rules: unknown[]) => Promise<boolean>;
  getRules: () => Promise<Record<string, unknown>[]>;
  putNotifications: (notifications: unknown[]) => Promise<boolean>;
  getNotifications: () => Promise<Record<string, unknown>[]>;
  queueAction: (action: unknown) => Promise<number | null>;
  getQueue: () => Promise<Record<string, unknown>[]>;
  removeAction: (id: number) => Promise<boolean>;
  clearQueue: () => Promise<boolean>;
  putMeta: (key: string, value: unknown) => Promise<boolean>;
  getMeta: (key: string) => Promise<unknown>;
}

export function createMailCache(): MailCache {
  async function putMessages(folder: string, messages: unknown[]) {
    const store = await withStore(MESSAGES_STORE, "readwrite");
    if (!store) return false;
    return new Promise<boolean>((resolve) => {
      const request = store.put({ folder, messages: Array.isArray(messages) ? messages : [] });
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async function getMessages(folder: string) {
    const store = await withStore(MESSAGES_STORE, "readonly");
    if (!store) return [];
    return new Promise<unknown[]>((resolve) => {
      const request = store.get(folder);
      request.onsuccess = () => resolve(request.result?.messages || []);
      request.onerror = () => resolve([]);
    });
  }

  async function putTemplates(templates: unknown[]) {
    return putAll(TEMPLATES_STORE, templates);
  }

  async function getTemplates() {
    return getAll(TEMPLATES_STORE);
  }

  async function putRules(rules: unknown[]) {
    return putAll(RULES_STORE, rules);
  }

  async function getRules() {
    return getAll(RULES_STORE);
  }

  async function putNotifications(notifications: unknown[]) {
    return putAll(NOTIFICATIONS_STORE, notifications);
  }

  async function getNotifications() {
    return getAll(NOTIFICATIONS_STORE);
  }

  async function queueAction(action: unknown) {
    const store = await withStore(OUTBOX_STORE, "readwrite");
    if (!store) return null;
    const payload = { action, createdAt: new Date().toISOString() };
    return new Promise<number | null>((resolve) => {
      const request = store.add(payload);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => resolve(null);
    });
  }

  async function getQueue() {
    const queue = await getAll(OUTBOX_STORE);
    return queue.sort((a, b) => {
      const ta = a.createdAt ? new Date(String(a.createdAt)).getTime() : Number(a.id);
      const tb = b.createdAt ? new Date(String(b.createdAt)).getTime() : Number(b.id);
      return ta - tb;
    });
  }

  async function removeAction(id: number) {
    const store = await withStore(OUTBOX_STORE, "readwrite");
    if (!store) return false;
    return new Promise<boolean>((resolve) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async function clearQueue() {
    const store = await withStore(OUTBOX_STORE, "readwrite");
    if (!store) return false;
    return new Promise<boolean>((resolve) => {
      const request = store.clear();
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async function putMeta(key: string, value: unknown) {
    const store = await withStore(META_STORE, "readwrite");
    if (!store) return false;
    return new Promise<boolean>((resolve) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async function getMeta(key: string) {
    const store = await withStore(META_STORE, "readonly");
    if (!store) return null;
    return new Promise<unknown>((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }

  return Object.freeze({
    putMessages,
    getMessages,
    putTemplates,
    getTemplates,
    putRules,
    getRules,
    putNotifications,
    getNotifications,
    queueAction,
    getQueue,
    removeAction,
    clearQueue,
    putMeta,
    getMeta
  });
}
