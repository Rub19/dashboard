"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { deepEqual } from "@/lib/equal";

type CacheEntry = {
  data: unknown;
  ts: number;
  ttl: number;
};

const globalCache = new Map<string, CacheEntry>();

function cacheKey(path: string, options: RequestInit = {}): string {
  const method = (options.method || "GET").toUpperCase();
  const body = typeof options.body === "string" ? options.body : "";
  return `${method}:${path}:${body}`;
}

function isExpired(entry: CacheEntry, now = Date.now(), ttl?: number): boolean {
  return now - entry.ts >= (ttl ?? entry.ttl);
}

export function clearFetchCache(): void {
  globalCache.clear();
}

export function getFetchCacheKey(path: string, options?: RequestInit): string {
  return cacheKey(path, options);
}

export function getCachedData<T>(
  path: string,
  options?: RequestInit,
  ttl?: number
): T | null {
  const key = cacheKey(path, options);
  const entry = globalCache.get(key) as CacheEntry | undefined;
  if (entry && !isExpired(entry, Date.now(), ttl)) {
    return entry.data as T;
  }
  if (entry) {
    globalCache.delete(key);
  }
  return null;
}

export function setCachedData<T>(
  path: string,
  data: T,
  options?: RequestInit,
  ttl = 5000
): void {
  const key = cacheKey(path, options);
  globalCache.set(key, { data, ts: Date.now(), ttl });
}

export interface UseCachedFetchOptions<T> {
  path: string | null;
  options?: RequestInit;
  ttl?: number;
  map?: (raw: unknown) => T | null;
  enabled?: boolean;
}

export function useCachedFetch<T>({
  path,
  options,
  ttl = 5000,
  map,
  enabled = true,
}: UseCachedFetchOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  const dataRef = useRef<T | null>(null);

  const stableKey = useMemo(
    () => (path !== null ? cacheKey(path, options) : null),
    [path, options]
  );

  const refresh = useCallback(() => {
    if (stableKey !== null) {
      globalCache.delete(stableKey);
    }
    setVersion((v) => v + 1);
  }, [stableKey]);

  useEffect(() => {
    if (!enabled || path === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const key = stableKey;
    if (!key) return;
    const cached = globalCache.get(key) as CacheEntry | undefined;

    if (cached && !isExpired(cached, Date.now(), ttl)) {
      const mapped = map ? map(cached.data) : (cached.data as T);
      const next = deepEqual(mapped, dataRef.current) ? dataRef.current : mapped;
      dataRef.current = next;
      setData(next);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchWorker(path, options)
      .then((raw) => {
        if (cancelled) return;
        globalCache.set(key, { data: raw, ts: Date.now(), ttl });
        const mapped = map ? map(raw) : (raw as T);
        const next = deepEqual(mapped, dataRef.current) ? dataRef.current : mapped;
        dataRef.current = next;
        setData(next);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, options, ttl, map, enabled, stableKey, version]);

  return { data, loading, error, refresh };
}

export async function fetchWorkerCached<T = unknown>(
  path: string,
  options: RequestInit = {},
  ttl = 5000
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") {
    return (await fetchWorker(path, options)) as T;
  }

  const key = cacheKey(path, options);
  const cached = globalCache.get(key) as CacheEntry | undefined;
  if (cached && !isExpired(cached, Date.now(), ttl)) {
    return cached.data as T;
  }

  const hasOptions = options && (options.method || options.body || Object.keys(options).length > 0);
  const data = (await (hasOptions ? fetchWorker(path, options) : fetchWorker(path))) as T;
  globalCache.set(key, { data, ts: Date.now(), ttl });
  return data;
}
