"use client";

import { useEffect, useState, useCallback, useMemo, useRef, useId } from "react";
import { fetchWorker } from "../api";
import { supabase } from "@/lib/supabase";
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
      body: "<p>Vos notes sont synchronisées instantanément sur Supabase et disponibles sur tous vos appareils en temps réel.</p>",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  tasks: [],
  events: [],
};

export function useItems(kind: "notes" | "tasks" | "events") {
  const cacheKey = `ethone:items:${kind}`;
  const broadcastChannelName = `ethone_sync_${kind}`;
  const channelRef = useRef<BroadcastChannel | null>(null);
  const realtimeId = useId();

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

  // Tab Broadcast setup
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    try {
      const bc = new BroadcastChannel(broadcastChannelName);
      channelRef.current = bc;
      bc.onmessage = (event) => {
        if (event.data?.type === "UPDATE_ITEMS" && Array.isArray(event.data.items)) {
          setItems(event.data.items);
        }
      };
      return () => {
        bc.close();
      };
    } catch {}
  }, [broadcastChannelName]);

  const notifyTabs = useCallback(
    (newItems: Item[]) => {
      try {
        channelRef.current?.postMessage({ type: "UPDATE_ITEMS", items: newItems });
      } catch {}
    },
    []
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Try Direct Supabase Query first if user is logged in
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const { data: dbRows, error: dbError } = await supabase
          .from("ethone_items")
          .select("*")
          .eq("user_id", userId)
          .eq("kind", kind === "notes" ? "note" : kind === "tasks" ? "task" : "event")
          .order("updated_at", { ascending: false })
          .catch(() => ({ data: null, error: true }));

        if (!dbError && Array.isArray(dbRows)) {
          const mapped: Item[] = dbRows.map((row) => ({
            id: row.id,
            title: row.title || "Sans titre",
            body: row.body || "",
            done: row.done === true,
            startAt: row.start_at,
            endAt: row.end_at,
            data: row.data || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }));
          setItems(mapped);
          setIsOffline(false);
          setError(null);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(mapped));
          } catch {}
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to fetchWorker
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

  // Realtime Supabase Subscription
  useEffect(() => {
    if (typeof window === "undefined") return;

    let sbChannel: ReturnType<typeof supabase.channel> | null = null;
    const dbKind = kind === "notes" ? "note" : kind === "tasks" ? "task" : "event";

    async function subscribeRealtime() {
      try {
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;

        sbChannel = supabase
          .channel(`items_realtime_${kind}_${realtimeId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ethone_items",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              setItems((prev) => {
                let next = prev;
                if (payload.eventType === "INSERT") {
                  const r = payload.new as Record<string, unknown>;
                  if (r.kind === dbKind) {
                    const mappedItem: Item = {
                      id: String(r.id),
                      title: String(r.title || "Sans titre"),
                      body: String(r.body || ""),
                      done: r.done === true,
                      startAt: r.start_at ? String(r.start_at) : undefined,
                      endAt: r.end_at ? String(r.end_at) : undefined,
                      data: (r.data as Record<string, unknown>) || {},
                      createdAt: String(r.created_at || new Date().toISOString()),
                      updatedAt: String(r.updated_at || new Date().toISOString()),
                    };
                    if (!prev.some((i) => i.id === mappedItem.id)) {
                      next = [mappedItem, ...prev];
                    }
                  }
                } else if (payload.eventType === "UPDATE") {
                  const r = payload.new as Record<string, unknown>;
                  next = prev.map((item) =>
                    item.id === String(r.id)
                      ? {
                          ...item,
                          title: String(r.title ?? item.title),
                          body: String(r.body ?? item.body),
                          done: r.done !== undefined ? r.done === true : item.done,
                          updatedAt: String(r.updated_at || new Date().toISOString()),
                        }
                      : item
                  );
                } else if (payload.eventType === "DELETE") {
                  const oldId = String((payload.old as { id: string })?.id);
                  next = prev.filter((i) => i.id !== oldId);
                }

                try {
                  localStorage.setItem(cacheKey, JSON.stringify(next));
                } catch {}
                notifyTabs(next);
                return next;
              });
            }
          );

        await sbChannel.subscribe();
      } catch {}
    }

    subscribeRealtime();
    return () => {
      sbChannel?.unsubscribe();
    };
  }, [kind, cacheKey, realtimeId, notifyTabs]);

  const create = useCallback(
    async (input: Omit<Item, "id">) => {
      const tempId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`;
      const newItem: Item = {
        ...input,
        id: tempId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Instant local optimistic update
      setItems((prev) => {
        const next = [newItem, ...prev];
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
        notifyTabs(next);
        return next;
      });

      const actionMap = {
        notes: "v8.notes.new" as const,
        tasks: "v8.tasks.create" as const,
        events: "v8.calendar.create" as const,
      };
      activityJournal.capture(actionMap[kind], { ok: true, title: input.title });

      // 2. Instant save to Supabase
      try {
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const userId = sessionData?.session?.user?.id;
        const dbKind = kind === "notes" ? "note" : kind === "tasks" ? "task" : "event";

        if (userId) {
          const { data: inserted, error: sbError } = await supabase
            .from("ethone_items")
            .insert({
              user_id: userId,
              kind: dbKind,
              title: input.title || "Sans titre",
              body: input.body || "",
              done: input.done === true,
              start_at: input.startAt || null,
              end_at: input.endAt || null,
              data: input.data || {},
            })
            .select("*")
            .single();

          if (!sbError && inserted?.id) {
            setItems((prev) => {
              const updatedList = prev.map((i) =>
                i.id === tempId ? { ...i, id: inserted.id, createdAt: inserted.created_at, updatedAt: inserted.updated_at } : i
              );
              try {
                localStorage.setItem(cacheKey, JSON.stringify(updatedList));
              } catch {}
              notifyTabs(updatedList);
              return updatedList;
            });
            return inserted;
          }
        }

        const res = await fetchWorker(`/api/${kind}`, {
          method: "POST",
          body: JSON.stringify(input),
        });
        if (res?.data?.id) {
          setItems((prev) => {
            const updatedList = prev.map((i) => (i.id === tempId ? { ...res.data } : i));
            try {
              localStorage.setItem(cacheKey, JSON.stringify(updatedList));
            } catch {}
            notifyTabs(updatedList);
            return updatedList;
          });
        }
        return res?.data || newItem;
      } catch {
        setIsOffline(true);
        return newItem;
      }
    },
    [kind, cacheKey, notifyTabs]
  );

  const update = useCallback(
    async (id: string, input: Partial<Omit<Item, "id">>) => {
      setItems((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, ...input, updatedAt: new Date().toISOString() } : item
        );
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
        notifyTabs(next);
        return next;
      });

      if (kind === "notes") {
        activityJournal.capture("v8.notes.save", { ok: true, title: input.title });
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const userId = sessionData?.session?.user?.id;

        if (userId) {
          await supabase
            .from("ethone_items")
            .update({
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.body !== undefined ? { body: input.body } : {}),
              ...(input.done !== undefined ? { done: input.done } : {}),
              ...(input.startAt !== undefined ? { start_at: input.startAt } : {}),
              ...(input.endAt !== undefined ? { end_at: input.endAt } : {}),
              ...(input.data !== undefined ? { data: input.data } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("user_id", userId);
          return;
        }

        await fetchWorker(`/api/${kind}`, {
          method: "PATCH",
          body: JSON.stringify({ id, ...input }),
        });
      } catch {
        setIsOffline(true);
      }
    },
    [kind, cacheKey, notifyTabs]
  );

  const remove = useCallback(
    async (id: string) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(next));
        } catch {}
        notifyTabs(next);
        return next;
      });

      try {
        const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const userId = sessionData?.session?.user?.id;

        if (userId) {
          await supabase.from("ethone_items").delete().eq("id", id).eq("user_id", userId);
          return;
        }

        await fetchWorker(`/api/${kind}`, {
          method: "DELETE",
          body: JSON.stringify({ id }),
        });
      } catch {
        setIsOffline(true);
      }
    },
    [kind, cacheKey, notifyTabs]
  );

  return useMemo(
    () => ({ items, loading, error, isOffline, reload, create, update, remove }),
    [items, loading, error, isOffline, reload, create, update, remove]
  );
}
