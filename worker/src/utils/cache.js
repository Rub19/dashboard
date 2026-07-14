const values = new Map();
const pending = new Map();
const MAX_ENTRIES = 200;

function validKey(key) {
  return typeof key === "string" && key.length >= 3 && key.length <= 240 && !/(?:token|secret|password|authorization)/i.test(key);
}

function prune(now = Date.now()) {
  for (const [key, entry] of values) {
    if (entry.expiresAt <= now) values.delete(key);
  }
  while (values.size > MAX_ENTRIES) values.delete(values.keys().next().value);
}

export async function cachedLoad(key, ttlSeconds, loader) {
  if (!validKey(key) || typeof loader !== "function" || ttlSeconds <= 0) {
    return Object.freeze({ data: await loader(), cached: false });
  }
  const now = Date.now();
  const entry = values.get(key);
  if (entry && entry.expiresAt > now) return Object.freeze({ data: entry.data, cached: true });
  if (pending.has(key)) return pending.get(key);
  const operation = Promise.resolve(loader()).then((data) => {
    prune();
    values.set(key, { data, expiresAt: Date.now() + Math.min(3600, ttlSeconds) * 1000 });
    return Object.freeze({ data, cached: false });
  }).finally(() => pending.delete(key));
  pending.set(key, operation);
  return operation;
}

export function cacheDiagnostics() {
  prune();
  return Object.freeze({ entries: values.size, pending: pending.size, scope: "public-provider-data" });
}

export function clearCache() {
  values.clear();
  pending.clear();
}
