"use client";

import { useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export function useConnections() {
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchWorker("/api/connections")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const set = new Set<string>();
        rows.forEach((row: { provider: string; connected: boolean }) => {
          if (row.connected) set.add(row.provider);
        });
        setConnected(set);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return { connected, loaded };
}
