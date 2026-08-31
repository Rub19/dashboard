"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { fetchWorker } from "../api";
import { activityJournal } from "@/lib/activity-journal";

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

const DEFAULT_DEMO_ITEMS: Record<string, Item[]> = {
  notes: [
    {
      id: "demo-note-1",
      title: "Bienvenue sur ETHONE Notes",
      body: "<p>Vos notes sont synchronisées localement et sur le cloud en toute sécurité. Vous pouvez organiser vos idées, créer des listes et formater votre contenu.</p>",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  tasks: [],
  events: [],
};

export function useItems(kind: "notes" | "tasks" | "events") {
  const cacheKey = `ethone:items:${kind}`;
  
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DEMO_ITEMS[kind] || [];
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_DEMO_ITEMS[kind] || [];
  });

  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorker(`/api/${kind}`);
      if (Array.isArray(res?.data)) {
        setItems(res.data);
        setIsOffline(false);
        setError(null);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(res.data));
        } catch {}
      }
    } catch (err) {
      // Graceful offline fallback
      setIsOffline(true);
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
  }, [kind, cacheKey]);

  useEffect(() => {
    reload();
  }, [reload]);

  const create = useCallback(
    async (input: Omit<Item, "id">) => {
      const tempId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`;
      const newItem: Item = {
        ...input,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic update
      setItems((prev) => {
        const next = [newItem, ...prev];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      const actionMap = {
        notes: "v8.notes.new" as const,
        tasks: "v8.tasks.create" as const,
        events: "v8.calendar.create" as const,
      };
      const actionId = actionMap[kind];
      activityJournal.capture(actionId, { ok: true, title: input.title });

      try {
        const res = await fetchWorker(`/api/${kind}`, {
          method: "POST",
          body: JSON.stringify(input),
        });
        if (res?.data?.id) {
          setItems((prev) =>
            prev.map((i) => (i.id === tempId ? { ...res.data } : i))
          );
        }
        return res?.data || newItem;
      } catch {
        setIsOffline(true);
        return newItem;
      }
    },
    [kind, cacheKey]
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<Item, "id">>) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id
            ? { ...item, ...input, updatedAt: new Date().toISOString() }
            : item
        );
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      if (kind === "notes") {
        activityJournal.capture("v8.notes.save", { ok: true, title: input.title });
      }
      if (kind === "tasks" && input.done === true) {
        const item = items.find((i) => i.id === id);
        activityJournal.capture("v8.tasks.complete", { ok: true, title: item?.title });
      }

      try {
        await fetchWorker(`/api/${kind}`, {
          method: "PATCH",
          body: JSON.stringify({ id, ...input }),
        });
      } catch {
        setIsOffline(true);
      }
    },
    [kind, items, cacheKey]
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
        return next;
      });

      try {
        await fetchWorker(`/api/${kind}`, {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
      } catch {
        setIsOffline(true);
      }
    },
    [kind, cacheKey]
  );

  return useMemo(
    () => ({ items, loading, error, isOffline, reload, create, update, remove }),
    [items, loading, error, isOffline, reload, create, update, remove]
  );
}

