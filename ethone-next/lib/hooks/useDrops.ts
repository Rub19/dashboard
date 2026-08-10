"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "../api";

export type Drop = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  visibility: "public" | "password";
  expiresAt?: string;
  maxFiles?: number;
  maxSize?: number;
  fileCount?: number;
  createdAt?: string;
};

export function useDrops() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/cloud/drops");
      setDrops(Array.isArray(res?.data?.drops) ? res.data.drops : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: { title: string; description?: string; visibility?: string; password?: string; expiresAt?: string; maxFiles?: number; maxSize?: number }) {
    const res = await fetchWorker("/api/cloud/drops", {
      method: "POST",
      body: JSON.stringify(input),
    });
    await reload();
    return res?.data?.drop as Drop | undefined;
  }

  async function revoke(slug: string) {
    await fetchWorker(`/api/cloud/drops/revoke?slug=${encodeURIComponent(slug)}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await reload();
  }

  return { drops, loading, error, reload, create, revoke };
}
