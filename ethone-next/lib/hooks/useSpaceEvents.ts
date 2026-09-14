"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { notifySpaceActivity } from "@/lib/spaceNotify";

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof (err as { message?: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return String(err);
}

export type SpaceEvent = {
  id: string;
  space_id: string;
  created_by: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  created_at: string;
  updated_at: string;
};

export type SpaceEventInput = Omit<SpaceEvent, "id" | "space_id" | "created_by" | "created_at" | "updated_at">;

type SyncStatus = "idle" | "syncing" | "error";

// Direct-to-Supabase clone of lib/hooks/useSpaceTasks.ts — same
// currentUserId/realtime-resubscribe pattern, filtered by space_id, RLS
// (not a client-side check) enforces membership.
export function useSpaceEvents(spaceId: string | null) {
  const [items, setItems] = useState<SpaceEvent[]>([]);
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
        .from("ethone_space_events")
        .select("*")
        .eq("space_id", spaceId)
        .order("start_at", { ascending: true });

      if (fetchError) throw fetchError;
      setItems((data as SpaceEvent[]) || []);
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
          .channel(`space_events_changes:${realtimeId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ethone_space_events",
              filter: `space_id=eq.${spaceId}`,
            },
            (payload) => {
              setItems((prev) => {
                if (payload.eventType === "INSERT") {
                  const next = payload.new as SpaceEvent;
                  if (prev.some((e) => e.id === next.id)) return prev;
                  return [...prev, next].sort((a, b) => a.start_at.localeCompare(b.start_at));
                }
                if (payload.eventType === "UPDATE") {
                  const next = payload.new as SpaceEvent;
                  return prev.map((e) => (e.id === next.id ? next : e));
                }
                if (payload.eventType === "DELETE") {
                  const removed = payload.old as { id: string };
                  return prev.filter((e) => e.id !== removed.id);
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
    async (input: SpaceEventInput) => {
      if (!spaceId) return null;
      const userId = (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) return null;

      setStatus("syncing");
      try {
        const { data, error: insertError } = await supabase
          .from("ethone_space_events")
          .insert({ ...input, space_id: spaceId, created_by: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        const next = data as SpaceEvent;
        setItems((prev) => (prev.some((e) => e.id === next.id) ? prev : [...prev, next].sort((a, b) => a.start_at.localeCompare(b.start_at))));
        setStatus("idle");
        notifySpaceActivity(spaceId, "event", "created", next.title);
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
    async (id: string, input: Partial<SpaceEventInput>) => {
      setStatus("syncing");
      const optimistic = { ...items.find((e) => e.id === id), ...input, id, updated_at: new Date().toISOString() } as SpaceEvent;
      setItems((prev) => prev.map((e) => (e.id === id ? optimistic : e)));

      try {
        const { data, error: updateError } = await supabase
          .from("ethone_space_events")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;
        const next = data as SpaceEvent;
        setItems((prev) => prev.map((e) => (e.id === id ? next : e)));
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
      setItems((prev) => prev.filter((e) => e.id !== id));

      try {
        const { error: deleteError } = await supabase.from("ethone_space_events").delete().eq("id", id);
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
