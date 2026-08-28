import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

const OAUTH_PROVIDERS = ["spotify", "youtube", "reddit", "google-calendar", "google-drive", "github", "notion", "todoist"];

export function useConnections() {
  const [connected, setConnected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (typeof window !== "undefined") {
      OAUTH_PROVIDERS.forEach((p) => {
        if (localStorage.getItem(`ethone:connected:${p}`) === "true") {
          initial.add(p);
        }
      });
    }
    return initial;
  });
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const localConnected = new Set<string>();
    if (typeof window !== "undefined") {
      OAUTH_PROVIDERS.forEach((p) => {
        if (localStorage.getItem(`ethone:connected:${p}`) === "true") {
          localConnected.add(p);
        }
      });
    }

    fetchWorker("/api/connections")
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : [];
        const set = new Set<string>(localConnected);
        rows.forEach((row: { provider: string; connected: boolean }) => {
          if (row.connected) set.add(row.provider);
          else if (row.connected === false && !localStorage.getItem(`ethone:connected:${row.provider}`)) {
            set.delete(row.provider);
          }
        });
        setConnected(set);
      })
      .catch(() => {
        setConnected(localConnected);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    if (typeof window !== "undefined") {
      window.addEventListener("v8:connection-updated", handleUpdate);
      return () => window.removeEventListener("v8:connection-updated", handleUpdate);
    }
  }, [refresh]);

  return { connected, loaded, refresh };
}
