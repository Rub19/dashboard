"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

export type SpaceTask = {
  id: string;
  space_id: string;
  created_by: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type SpaceTaskInput = Omit<SpaceTask, "id" | "space_id" | "created_by" | "created_at" | "updated_at">;

type SyncStatus = "idle" | "syncing" | "error";

// Direct-to-Supabase, structurally the same shape as lib/hooks/useTasks.ts —
// including its realtime-resubscribe-on-account-switch fix (tracking
// currentUserId via onAuthStateChange rather than a stale closure) — but
// filtered by space_id instead of user_id, since RLS on ethone_space_tasks
// (not a client-side check) is what actually enforces membership. The effect
// also resubscribes when spaceId itself changes, so switching between spaces
// doesn't leave a stale channel behind.
export function useSpaceTasks(spaceId: string | null) {
  const [items, setItems] = useState<SpaceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id);
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const load = useCallback(async () => {
    if (!spaceId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("ethone_space_tasks")
        .select("*")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setItems((data as SpaceTask[]) || []);
    } catch (err) {
      setError(new Error(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const realtimeId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!currentUserId || !spaceId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      try {
        channel = supabase
          .channel(`space_tasks_changes:${realtimeId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ethone_space_tasks",
              filter: `space_id=eq.${spaceId}`,
            },
            (payload) => {
              setItems((prev) => {
                if (payload.eventType === "INSERT") {
                  const next = payload.new as SpaceTask;
                  if (prev.some((t) => t.id === next.id)) return prev;
                  return [next, ...prev];
                }
                if (payload.eventType === "UPDATE") {
                  const next = payload.new as SpaceTask;
                  return prev.map((t) => (t.id === next.id ? next : t));
                }
                if (payload.eventType === "DELETE") {
                  const removed = payload.old as { id: string };
                  return prev.filter((t) => t.id !== removed.id);
                }
                return prev;
              });
            },
          );
        await channel.subscribe();
      } catch {
        // Realtime optional; schema/channel errors fall back to manual sync.
      }
    }

    subscribe().catch(() => {});
    return () => {
      channel?.unsubscribe();
    };
  }, [realtimeId, currentUserId, spaceId]);

  const create = useCallback(
    async (input: SpaceTaskInput) => {
      if (!spaceId) return null;
      const userId = (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) return null;

      setStatus("syncing");
      try {
        const { data, error: insertError } = await supabase
          .from("ethone_space_tasks")
          .insert({ ...input, space_id: spaceId, created_by: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        const next = data as SpaceTask;
        setItems((prev) => (prev.some((t) => t.id === next.id) ? prev : [next, ...prev]));
        setStatus("idle");
        return next;
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        return null;
      }
    },
    [spaceId]
  );

  const update = useCallback(
    async (id: string, input: Partial<SpaceTaskInput>) => {
      setStatus("syncing");
      const optimistic = { ...items.find((t) => t.id === id), ...input, id, updated_at: new Date().toISOString() } as SpaceTask;
      setItems((prev) => prev.map((t) => (t.id === id ? optimistic : t)));

      try {
        const { data, error: updateError } = await supabase
          .from("ethone_space_tasks")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;
        const next = data as SpaceTask;
        setItems((prev) => prev.map((t) => (t.id === id ? next : t)));
        setStatus("idle");
        return next;
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        await load();
        return null;
      }
    },
    [items, load]
  );

  const remove = useCallback(
    async (id: string) => {
      setStatus("syncing");
      const previous = [...items];
      setItems((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error: deleteError } = await supabase.from("ethone_space_tasks").delete().eq("id", id);
        if (deleteError) throw deleteError;
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        setItems(previous);
      }
    },
    [items]
  );

  return { items, loading, error, status, create, update, remove, reload: load };
}
