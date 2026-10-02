"use client";

import { useEffect, useState } from "react";
import { fetchWorkerCached } from "./useCachedFetch";

export function useWorker<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Cache partagé : plusieurs composants qui demandent la même ressource (ex. la météo) font une seule requête.
    fetchWorkerCached<T>(path, {}, 15_000)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path]);

  return { data, loading, error };
}
