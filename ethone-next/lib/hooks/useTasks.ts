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
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskInput = Omit<Task, "id" | "completed_at" | "created_at" | "updated_at" | "user_id">;

type SyncStatus = "idle" | "syncing" | "error";

let tasksInFlight: { userId: string; at: number; promise: Promise<Task[]> } | null = null;

/** Lecture des tâches partagée entre les composants montés en même temps (et réutilisée pendant 2 s). */
function readTasksShared(userId: string): Promise<Task[]> {
  if (tasksInFlight && tasksInFlight.userId === userId && Date.now() - tasksInFlight.at < 2000) return tasksInFlight.promise;
  const promise = (async () => {
    const { data, error } = await supabase.from("tasks").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) throw error;
    return (data as Task[]) || [];
  })();
  tasksInFlight = { userId, at: Date.now(), promise };
  promise.catch(() => {
    if (tasksInFlight?.promise === promise) tasksInFlight = null;
  });
  return promise;
}

export function useTasks() {
  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  // Track the authenticated user id: useId() below is stable for the life of
  // the component instance and does NOT change on account switch, so without
  // this the realtime effect would never re-subscribe under the new user
  // (see useItems.ts for the reference pattern this mirrors).
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
    // Plusieurs composants montent useTasks en même temps : une seule lecture partagée par utilisateur.
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

      setItems(await readTasksShared(userId));
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
    if (!currentUserId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      try {
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
  }, [realtimeId, currentUserId]);

  const withUserId = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData?.session?.user?.id ?? null;
  }, []);

  const create = useCallback(
    async (input: TaskInput) => {
      tasksInFlight = null; // une écriture rend la lecture partagée périmée
      const userId = await withUserId();
      if (!userId) {
        setStatus("idle");
        return null;
      }

      setStatus("syncing");
      try {
        const { data, error: insertError } = await supabase
          .from("tasks")
          .insert({ ...input, completed_at: input.is_completed ? new Date().toISOString() : null, user_id: userId })
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
      tasksInFlight = null; // une écriture rend la lecture partagée périmée
      const userId = await withUserId();
      if (!userId) {
        setStatus("idle");
        return null;
      }

      // Transparent so every existing caller (a checkbox toggle just does
      // update(id, {is_completed})) gets a real completion timestamp for
      // free — this is what makes a "completed over time" trend possible on
      // the Analytics page instead of only "created over time".
      const patch: Partial<TaskInput> & { completed_at?: string | null } = { ...input };
      if (typeof input.is_completed === "boolean") {
        patch.completed_at = input.is_completed ? new Date().toISOString() : null;
      }

      setStatus("syncing");
      const optimistic = { ...items.find((t) => t.id === id), ...patch, id, updated_at: new Date().toISOString() } as Task;
      setItems((prev) => prev.map((t) => (t.id === id ? optimistic : t)));

      try {
        const { data, error: updateError } = await supabase
          .from("tasks")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId)
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
        tasksInFlight = null;
        await load();
        return null;
      }
    },
    [items, load, withUserId],
  );

  const remove = useCallback(
    async (id: string) => {
      tasksInFlight = null; // une écriture rend la lecture partagée périmée
      const userId = await withUserId();
      if (!userId) {
        setStatus("idle");
        return;
      }

      setStatus("syncing");
      const previous = [...items];
      setItems((prev) => prev.filter((t) => t.id !== id));

      try {
        const { error: deleteError } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);
        if (deleteError) throw deleteError;
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        setItems(previous);
      }
    },
    [items, withUserId],
  );

  useEffect(() => {
    useSyncStore.getState().setStatus("tasks", status);
  }, [status]);

  const reload = useCallback(async () => {
    tasksInFlight = null;
    await load();
  }, [load]);

  return { items, loading, error, status, create, update, remove, reload };
}
