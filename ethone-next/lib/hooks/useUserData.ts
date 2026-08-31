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

export function useUserData(kind: "space" | "flow" | "interaction" | "macro" | "persona" | "bill" | "plugin" | "flow_automation") {
  const cacheKey = `ethone:userdata:${kind}`;
  
  const [items, setItems] = useState<UserDataRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { active, loaded: profileLoaded } = useActiveProfile();

  const basePath = `/api/user-data/${kind}s`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = active && profileLoaded ? `?profile_id=${encodeURIComponent(active)}` : "";
      const res = await fetchWorker(`${basePath}${query}`);
      if (Array.isArray(res.data)) {
        setItems(res.data);
        setError(null);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) setItems(parsed);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [basePath, active, profileLoaded, cacheKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(label: string, slug?: string, data?: Record<string, unknown>, count?: number) {
    const tempId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`;
    const newRecord: UserDataRecord = {
      id: tempId,
      kind,
      slug: slug || label.toLowerCase().replace(/\s+/g, "-"),
      label,
      data: data || {},
      count: count || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile_id: active || undefined,
    };

    setItems((prev) => {
      const next = [newRecord, ...prev];
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      const body: Record<string, unknown> = { label, slug, data, count };
      if (active) body.profile_id = active;
      const res = await fetchWorker(basePath, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return res.data || newRecord;
    } catch {
      return newRecord;
    }
  }

  async function update(id: string, input: { label?: string; data?: Record<string, unknown>; count?: number }) {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...input, updated_at: new Date().toISOString() } : i));
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      const body: Record<string, unknown> = { id, ...input };
      if (active) body.profile_id = active;
      await fetchWorker(basePath, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } catch {}
  }

  async function remove(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {}
      return next;
    });

    try {
      await fetchWorker(basePath, {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
    } catch {}
  }

  return { items, loading, error, reload: load, create, update, remove };
}

