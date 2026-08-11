"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";
import { useActiveProfile } from "@/components/SettingsProvider";

export type UserDataRecord = {
  id: string;
  kind: string;
  slug: string;
  label: string;
  data: Record<string, unknown>;
  count: number;
  created_at: string;
  updated_at: string;
  profile_id?: string;
  workspace_id?: string;
};

export function useUserData(kind: "space" | "flow" | "interaction" | "macro" | "persona" | "bill" | "plugin") {
  const [items, setItems] = useState<UserDataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { active, loaded: profileLoaded } = useActiveProfile();

  const basePath = `/api/user-data/${kind}s`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = active && profileLoaded ? `?profile_id=${encodeURIComponent(active)}` : "";
      const res = await fetchWorker(`${basePath}${query}`);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [basePath, active, profileLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(label: string, slug?: string, data?: Record<string, unknown>, count?: number) {
    const body: Record<string, unknown> = { label, slug, data, count };
    if (active) body.profile_id = active;

    const res = await fetchWorker(basePath, {
      method: "POST",
      body: JSON.stringify(body),
    });
    await load();
    return res.data;
  }

  async function update(id: string, input: { label?: string; data?: Record<string, unknown>; count?: number }) {
    const body: Record<string, unknown> = { id, ...input };
    if (active) body.profile_id = active;

    await fetchWorker(basePath, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    setItems(items.map((i) => (i.id === id ? { ...i, ...input, updated_at: new Date().toISOString() } : i)));
  }

  async function remove(id: string) {
    await fetchWorker(basePath, {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    setItems(items.filter((i) => i.id !== id));
  }

  return { items, loading, error, reload: load, create, update, remove };
}
