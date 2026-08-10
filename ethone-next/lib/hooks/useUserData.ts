"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type UserDataRecord = {
  id: string;
  kind: string;
  slug: string;
  label: string;
  data: Record<string, unknown>;
  count: number;
  created_at: string;
  updated_at: string;
};

export function useUserData(kind: "space" | "flow" | "interaction" | "macro" | "persona") {
  const [items, setItems] = useState<UserDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker(`/api/user-data/${kind}s`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(label: string, slug?: string, data?: Record<string, unknown>, count?: number) {
    const res = await fetchWorker(`/api/user-data/${kind}s`, {
      method: "POST",
      body: JSON.stringify({ label, slug, data, count }),
    });
    await load();
    return res.data;
  }

  async function update(id: string, input: { label?: string; data?: Record<string, unknown>; count?: number }) {
    await fetchWorker(`/api/user-data/${kind}s`, {
      method: "PATCH",
      body: JSON.stringify({ id, ...input }),
    });
    setItems(items.map((i) => (i.id === id ? { ...i, ...input, updated_at: new Date().toISOString() } : i)));
  }

  async function remove(id: string) {
    await fetchWorker(`/api/user-data/${kind}s`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setItems(items.filter((i) => i.id !== id));
  }

  return { items, loading, error, reload: load, create, update, remove };
}
