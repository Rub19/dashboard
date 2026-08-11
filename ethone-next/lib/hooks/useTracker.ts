"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWorker } from "../api";

const CACHE_TTL_MS = 7 * 60 * 1000;

export type TrackerGame = {
  id: string;
  mode?: string;
  map?: string;
  result?: string;
  agent?: string;
  champion?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  duration?: string;
  started?: string;
};

type CacheEntry<T> = {
  data: T;
  ts: number;
};

export function useTracker<T extends TrackerGame>(
  path: string,
  cacheKey: string
) {
  const [items, setItems] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (typeof window === "undefined") return;

      const cached = JSON.parse(
        sessionStorage.getItem(`ethone-cache:${cacheKey}`) || "null"
      ) as CacheEntry<T[]> | null;

      if (!force && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        setItems(cached.data);
        setLoading(false);
        return;
      }

      if (!path) {
        setItems([]);
        setLoading(false);
        setSyncing(false);
        return;
      }

      if (force) setSyncing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchWorker(path);
        const data = (res?.matches || res?.data || res || []) as T[];
        setItems(data);
        sessionStorage.setItem(
          `ethone-cache:${cacheKey}`,
          JSON.stringify({ data, ts: Date.now() })
        );
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
        setSyncing(false);
      }
    },
    [path, cacheKey]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, syncing, error, sync: () => load(true) };
}
