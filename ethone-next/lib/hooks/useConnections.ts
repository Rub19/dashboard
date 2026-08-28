import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { INTEGRATIONS } from "@/lib/integrations";

const ALL_PROVIDERS = INTEGRATIONS.map((i) => i.id);

export function useConnections() {
  const [connected, setConnected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (typeof window !== "undefined") {
      ALL_PROVIDERS.forEach((p) => {
        if (
          localStorage.getItem(`ethone:connected:${p}`) === "true" ||
          Boolean(localStorage.getItem(`ethone:token:${p}`))
        ) {
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
      ALL_PROVIDERS.forEach((p) => {
        if (
          localStorage.getItem(`ethone:connected:${p}`) === "true" ||
          Boolean(localStorage.getItem(`ethone:token:${p}`))
        ) {
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
          else if (
            row.connected === false &&
            localStorage.getItem(`ethone:connected:${row.provider}`) !== "true"
          ) {
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

  const disconnect = useCallback((provider: string) => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(`ethone:connected:${provider}`);
      localStorage.removeItem(`ethone:token:${provider}`);
      localStorage.removeItem(`ethone:clientId:${provider}`);
      localStorage.removeItem(`ethone:pub:${provider}`);
      localStorage.removeItem(`ethone:cred:${provider}`);
      // Remove any specific subkeys
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith(`ethone:pub:${provider}:`) ||
          key.startsWith(`ethone:cred:${provider}:`)
        ) {
          localStorage.removeItem(key);
        }
      });
      window.dispatchEvent(
        new CustomEvent("v8:connection-updated", {
          detail: { provider, connected: false },
        })
      );
    }
    setConnected((prev) => {
      const next = new Set(prev);
      next.delete(provider);
      return next;
    });
    void fetchWorker("/api/connections/disconnect", {
      method: "POST",
      body: JSON.stringify({ provider }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const handleUpdate = () => refresh();
    if (typeof window !== "undefined") {
      window.addEventListener("v8:connection-updated", handleUpdate);
      return () => window.removeEventListener("v8:connection-updated", handleUpdate);
    }
  }, [refresh]);

  return { connected, loaded, refresh, disconnect };
}
