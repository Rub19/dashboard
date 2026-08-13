"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(activityJournal.syncing());
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);

  useEffect(() => {
    setEntries(activityJournal.entries(options.snapshot));
    setPendingCount(activityJournal.pendingCount());
    const unsubscribe = activityJournal.subscribe(() => {
      setEntries(activityJournal.entries(options.snapshot));
      setPendingCount(activityJournal.pendingCount());
    });
    return unsubscribe;
  }, [options.snapshot]);

  useEffect(() => {
    const unsubscribe = activityJournal.subscribeSync(setSyncing);
    return unsubscribe;
  }, []);

  const sync = useCallback(async () => {
    setSyncError(null);
    try {
      const res = await activityJournal.sync();
      if (res.ok && res.count > 0) {
        setLastSync(new Date());
      }
      setPendingCount(activityJournal.pendingCount());
      if (!res.ok) {
        setSyncError(new Error("Échec de la synchronisation"));
      }
      return res;
    } catch (err) {
      setSyncError(err instanceof Error ? err : new Error(String(err)));
      return { ok: false, count: 0 };
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
