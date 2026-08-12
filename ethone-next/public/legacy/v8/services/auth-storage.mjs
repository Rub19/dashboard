export const AUTH_REMEMBER_KEY = "ethone_remember_auth";

function safeGet(storage, key) {
  try { return storage?.getItem?.(key) ?? null; } catch { return null; }
}

function safeSet(storage, key, value) {
  try {
    storage?.setItem?.(key, String(value));
    return true;
  } catch {
    return false;
  }
}

function safeRemove(storage, key) {
  try { storage?.removeItem?.(key); } catch {}
}

export function createAuthStorage(runtime = globalThis) {
  const local = runtime?.localStorage || null;
  const session = runtime?.sessionStorage || null;
  const memory = new Map();

  function remembered() {
    return safeGet(local, AUTH_REMEMBER_KEY) !== "0";
  }

  function selectedStorage() {
    return remembered() ? local : session;
  }

  function otherStorage() {
    return remembered() ? session : local;
  }

  return Object.freeze({
    getItem(key) {
      const value = safeGet(selectedStorage(), key);
      return value ?? memory.get(String(key)) ?? null;
    },
    setItem(key, value) {
      const normalizedKey = String(key);
      safeRemove(otherStorage(), normalizedKey);
      if (safeSet(selectedStorage(), normalizedKey, value)) memory.delete(normalizedKey);
      else memory.set(normalizedKey, String(value));
    },
    removeItem(key) {
      const normalizedKey = String(key);
      safeRemove(local, normalizedKey);
      safeRemove(session, normalizedKey);
      memory.delete(normalizedKey);
    }
  });
}
