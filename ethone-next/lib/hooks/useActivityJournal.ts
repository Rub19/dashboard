"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  activityJournal,
  type ActivityEntry,
  type ActivitySnapshot,
} from "@/lib/activity-journal";

export type UseActivityJournalOptions = {
  snapshot?: ActivitySnapshot;
  syncInterval?: number;
};

export function useActivityJournal(options: UseActivityJournalOptions = {}) {
  const [entries, setEntries] = useState<ActivityEntry[]>(() =>
    activityJournal.entries(options.snapshot)
  );
  const [pendingCount, setPendingCount] = useState(() => activityJournal.pendingCount());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    setEntries(activityJournal.entries(options.snapshot));
    const unsubscribe = activityJournal.subscribe(() => {
      setEntries(activityJournal.entries(options.snapshot));
      setPendingCount(activityJournal.pendingCount());
    });
    return unsubscribe;
  }, [options.snapshot]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return { ok: false, count: 0 };
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await activityJournal.sync();
      setLastSync(new Date());
      setPendingCount(activityJournal.pendingCount());
      if (!res.ok) {
        setSyncError(new Error("Échec de la synchronisation"));
      }
      return res;
    } catch (err) {
      setSyncError(err instanceof Error ? err : new Error(String(err)));
      return { ok: false, count: 0 };
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!options.syncInterval || options.syncInterval <= 0) return;
    const interval = setInterval(() => {
      sync().catch(() => {});
    }, options.syncInterval);
    return () => clearInterval(interval);
  }, [options.syncInterval, sync]);

  return {
    entries,
    pendingCount,
    syncing,
    lastSync,
    syncError,
    sync,
    capture: activityJournal.capture,
    captureRoute: activityJournal.captureRoute,
  };
}
