"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err && typeof err === "object" && !(err instanceof Error)) {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export type Task = {
  id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInput = Omit<Task, "id" | "created_at" | "updated_at" | "user_id">;

type SyncStatus = "idle" | "syncing" | "error";

export function useTasks() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;
      setItems((data as Task[]) || []);
    } catch (err) {
      setError(new Error(errorMessage(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const realtimeId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel(`tasks_changes:${realtimeId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            setItems((prev) => {
              if (payload.eventType === "INSERT") {
                const next = payload.new as Task;
                if (prev.some((t) => t.id === next.id)) return prev;
                return [next, ...prev];
              }
              if (payload.eventType === "UPDATE") {
                const next = payload.new as Task;
                return prev.map((t) => (t.id === next.id ? next : t));
              }
              if (payload.eventType === "DELETE") {
                const removed = payload.old as { id: string };
                return prev.filter((t) => t.id !== removed.id);
              }
              return prev;
            });
          },
        )
        .subscribe();
    }

    subscribe();
    return () => {
      channel?.unsubscribe();
    };
  }, [realtimeId]);

  const withUserId = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.user?.id ?? null;
  }, []);

  const create = useCallback(
    async (input: TaskInput) => {
      const userId = await withUserId();
      if (!userId) return null;

      setStatus("syncing");
      try {
        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert({ ...input, user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        const next = data as Task;
        setItems((prev) => (prev.some((t) => t.id === next.id) ? prev : [next, ...prev]));
        setStatus("idle");
        return next;
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        return null;
      }
    },
    [withUserId],
  );

  const update = useCallback(
    async (id: string, input: Partial<TaskInput>) => {
      setStatus("syncing");
      const optimistic = { ...items.find((t) => t.id === id), ...input, id, updated_at: new Date().toISOString() } as Task;
      setItems((prev) => prev.map((t) => (t.id === id ? optimistic : t)));

      try {
        const { data, error: updateError } = await supabase
          .from("tasks")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;
        const next = data as Task;
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
    [items, load],
  );

  const remove = useCallback(
    async (id: string) => {
      setStatus("syncing");
      const previous = [...items];
      setItems((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id);
        if (deleteError) throw deleteError;
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        setItems(previous);
      }
    },
    [items],
  );

  useEffect(() => {
    useSyncStore.getState().setStatus("tasks", status);
  }, [status]);

  return { items, loading, error, status, create, update, remove, reload: load };
}
