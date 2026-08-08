const DB_NAME = "ethone-cloud";
const DB_VERSION = 1;
const FILES_STORE = "files";
const FAVORITES_STORE = "favorites";
const QUEUE_STORE = "queue";
const META_STORE = "meta";

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(FILES_STORE)) db.createObjectStore(FILES_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) db.createObjectStore(FAVORITES_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(QUEUE_STORE)) db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
    };
  });
}

async function withStore(storeName, mode) {
  const db = await openDB();
  if (!db) return null;
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export function createCloudCache() {
  let online = typeof navigator !== "undefined" ? navigator.onLine !== false : true;

  function isOnline() {
    return online;
  }

  function setOnline(value) {
    online = value;
  }

  async function getFiles() {
    const store = await withStore(FILES_STORE, "readonly");
    if (!store) return [];
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => resolve([]);
    });
  }

  async function setFiles(files) {
    const store = await withStore(FILES_STORE, "readwrite");
    if (!store) return false;
    await new Promise((resolve) => {
      const clear = store.clear();
      clear.onsuccess = () => resolve();
      clear.onerror = () => resolve();
    });
    if (!Array.isArray(files)) return true;
    for (const file of files) {
      if (!file?.id) continue;
      store.put(file);
    }
    return true;
  }

  async function getFavorites() {
    const store = await withStore(FAVORITES_STORE, "readonly");
    if (!store) return [];
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => resolve([]);
    });
  }

  async function setFavorites(files) {
    const store = await withStore(FAVORITES_STORE, "readwrite");
    if (!store) return false;
    await new Promise((resolve) => {
      const clear = store.clear();
      clear.onsuccess = () => resolve();
      clear.onerror = () => resolve();
    });
    if (!Array.isArray(files)) return true;
    for (const file of files) {
      if (!file?.id) continue;
      store.put(file);
    }
    return true;
  }

  async function queue(type, payload) {
    const store = await withStore(QUEUE_STORE, "readwrite");
    if (!store) return null;
    return new Promise((resolve) => {
      const request = store.add({ type, payload, createdAt: new Date().toISOString() });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  async function drainQueue() {
    const store = await withStore(QUEUE_STORE, "readwrite");
    if (!store) return [];
    const items = await new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => resolve([]);
    });
    if (items.length) {
      await new Promise((resolve) => {
        const clear = store.clear();
        clear.onsuccess = () => resolve();
        clear.onerror = () => resolve();
      });
    }
    return items;
  }

  async function setMeta(key, value) {
    const store = await withStore(META_STORE, "readwrite");
    if (!store) return false;
    return new Promise((resolve) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async function getMeta(key) {
    const store = await withStore(META_STORE, "readonly");
    if (!store) return null;
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }

  return Object.freeze({
    isOnline,
    setOnline,
    getFiles,
    setFiles,
    getFavorites,
    setFavorites,
    queue,
    drainQueue,
    setMeta,
    getMeta
  });
}
