"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type LiveFetchState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  updatedAt: Date | null;
};

export type LiveFetchOptions<T> = {
  pollMs?: number;
  ttlMs?: number;
  parse?: (raw: unknown) => T;
};

type CacheEntry = { data: unknown; ts: number };

const requestCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

function cacheKey(path: string) {
  return `ethone-live:${path}`;
}

function readMemoryCache(path: string, ttlMs: number): CacheEntry | undefined {
  const entry = requestCache.get(path);
  if (entry && Date.now() - entry.ts < ttlMs) return entry;
  return undefined;
}

function writeMemoryCache(path: string, data: unknown) {
  requestCache.set(path, { data, ts: Date.now() });
}

function readSessionCache(path: string, ttlMs: number): CacheEntry | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(cacheKey(path));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts < ttlMs) {
      requestCache.set(path, parsed);
      return parsed;
    }
  } catch {}
  return undefined;
}

function writeSessionCache(path: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey(path), JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function readCache(path: string, ttlMs: number): unknown | undefined {
  const mem = readMemoryCache(path, ttlMs);
  if (mem) return mem.data;
  const sess = readSessionCache(path, ttlMs);
  if (sess) return sess.data;
  return undefined;
}

function writeCache(path: string, data: unknown) {
  writeMemoryCache(path, data);
  writeSessionCache(path, data);
}

export function useLiveFetch<T>(
  path: string | null,
  options: LiveFetchOptions<T> = {}
): LiveFetchState<T> & { refresh: () => Promise<void> } {
  const { pollMs = 30000, parse } = options;
  const ttlMs = Math.max(1000, (options.ttlMs ?? pollMs) - 1000);

  const [state, setState] = useState<LiveFetchState<T>>({
    data: null,
    loading: !!path,
    error: null,
    updatedAt: null,
  });

  const cancelledRef = useRef(false);
  const everLoadedRef = useRef(false);

  const load = useCallback(
    async (force = false) => {
      if (typeof window === "undefined" || !path) {
        if (!cancelledRef.current) {
          setState({ data: null, loading: false, error: null, updatedAt: null });
        }
        return;
      }

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
      const cached = !force ? readCache(path, ttlMs) : undefined;

      if (cached !== undefined) {
        if (!cancelledRef.current) {
          setState({
            data: parse ? parse(cached) : (cached as T),
            loading: false,
            error: null,
            updatedAt: new Date(),
          });
        }
        return;
      }

      if (isOffline) {
        const stale = readCache(path, ttlMs * 100);
        if (!cancelledRef.current) {
          setState({
            data: stale !== undefined ? (parse ? parse(stale) : (stale as T)) : null,
            loading: false,
            error: stale === undefined ? new Error("offline") : null,
            updatedAt: stale !== undefined ? new Date() : null,
          });
        }
        return;
      }

      if (!everLoadedRef.current || force) {
        if (!cancelledRef.current) setState((s) => ({ ...s, loading: true }));
      }

      try {
        let promise = inFlight.get(path);
        if (!promise) {
          promise = fetchWorker(path)
            .then((res) => res?.data ?? null)
            .finally(() => inFlight.delete(path));
          inFlight.set(path, promise);
        }

        const raw = await promise;
        writeCache(path, raw);
        if (!cancelledRef.current) {
          setState({
            data: parse ? parse(raw) : (raw as T),
            loading: false,
            error: null,
            updatedAt: new Date(),
          });
        }
      } catch (err) {
        const stale = readCache(path, ttlMs * 100);
        if (!cancelledRef.current) {
          setState({
            data: stale !== undefined ? (parse ? parse(stale) : (stale as T)) : null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
            updatedAt: stale !== undefined ? new Date() : null,
          });
        }
      } finally {
        everLoadedRef.current = true;
      }
    },
    [path, ttlMs, parse]
  );

  useEffect(() => {
    cancelledRef.current = false;
    everLoadedRef.current = false;
    if (path) {
      load();
    } else {
      setState({ data: null, loading: false, error: null, updatedAt: null });
    }

    const interval = path ? setInterval(() => load(), pollMs) : undefined;

    const onFocus = () => {
      if (path && !document.hidden) load();
    };
    const onOnline = () => {
      if (path) load(true);
    };

    if (path) {
      window.addEventListener("focus", onFocus);
      window.addEventListener("online", onOnline);
    }

    return () => {
      cancelledRef.current = true;
      if (interval) clearInterval(interval);
      if (path) {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("online", onOnline);
      }
    };
  }, [load, path, pollMs]);

  return {
    ...state,
    refresh: load,
  };
}
