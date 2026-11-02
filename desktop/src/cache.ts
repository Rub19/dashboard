interface Entry {
  at: number;
  value: unknown;
}

const memory = new Map<string, Entry>();
const flying = new Map<string, Promise<unknown>>();
let database: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> | null {
  if (typeof indexedDB === "undefined") return null;
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("ethone-cache", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("items");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}

async function stored(key: string): Promise<Entry | null> {
  try {
    const db = await open();
    if (!db) return null;
    return await new Promise((resolve, reject) => {
      const request = db.transaction("items").objectStore("items").get(key);
      request.onsuccess = () => resolve((request.result as Entry | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function readCache<T>(key: string): Promise<{ at: number; value: T } | null> {
  const entry = memory.get(key) ?? (await stored(key));
  if (!entry) return null;
  memory.set(key, entry);
  return entry as { at: number; value: T };
}

export function writeCache(key: string, value: unknown) {
  const entry = { at: Date.now(), value };
  memory.set(key, entry);
  void open()?.then((db) => db.transaction("items", "readwrite").objectStore("items").put(entry, key)).catch(() => undefined);
}

export function clearCache(prefix = "") {
  for (const key of memory.keys()) if (key.startsWith(prefix)) memory.delete(key);
  void open()?.then((db) => {
    const items = db.transaction("items", "readwrite").objectStore("items");
    const request = items.getAllKeys();
    request.onsuccess = () => {
      for (const key of request.result) if (String(key).startsWith(prefix)) items.delete(key);
    };
  }).catch(() => undefined);
}

export async function cached<T>(key: string, ttl: number, load: () => Promise<T>, staleOnError = false): Promise<T> {
  const entry = await readCache<T>(key);
  if (entry && Date.now() - entry.at < ttl) return entry.value;
  const running = flying.get(key);
  if (running) return running as Promise<T>;
  const request = load()
    .then((value) => {
      writeCache(key, value);
      return value;
    })
    .catch((reason) => {
      if (staleOnError && entry) return entry.value;
      throw reason;
    })
    .finally(() => flying.delete(key));
  flying.set(key, request);
  return request;
}
