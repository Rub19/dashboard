"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWorker } from "../api";

export type Item = {
  id: string;
  title: string;
  body: string;
  done?: boolean;
  startAt?: string;
  endAt?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export function useItems(kind: "notes" | "tasks" | "events") {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker(`/api/${kind}`);
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function create(input: Omit<Item, "id">) {
    const res = await fetchWorker(`/api/${kind}`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    await reload();
    return res?.data;
  }

  async function update(id: string, input: Partial<Omit<Item, "id">>) {
    await fetchWorker(`/api/${kind}`, {
      method: "PATCH",
      body: JSON.stringify({ id, ...input }),
    });
    await reload();
  }

  async function remove(id: string) {
    await fetchWorker(`/api/${kind}`, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await reload();
  }

  return { items, loading, error, reload, create, update, remove };
}
