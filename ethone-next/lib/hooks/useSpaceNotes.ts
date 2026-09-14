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

export type SpaceNote = {
  id: string;
  space_id: string;
  created_by: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type SpaceNoteInput = Omit<SpaceNote, "id" | "space_id" | "created_by" | "created_at" | "updated_at">;

type SyncStatus = "idle" | "syncing" | "error";

// Direct-to-Supabase clone of lib/hooks/useSpaceTasks.ts — same
// currentUserId/realtime-resubscribe pattern, filtered by space_id, RLS
// (not a client-side check) enforces membership.
export function useSpaceNotes(spaceId: string | null) {
  const [items, setItems] = useState<SpaceNote[]>([]);
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
        .from("ethone_space_notes")
        .select("*")
        .eq("space_id", spaceId)
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;
      setItems((data as SpaceNote[]) || []);
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
          .channel(`space_notes_changes:${realtimeId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ethone_space_notes",
              filter: `space_id=eq.${spaceId}`,
            },
            (payload) => {
              setItems((prev) => {
                if (payload.eventType === "INSERT") {
                  const next = payload.new as SpaceNote;
                  if (prev.some((n) => n.id === next.id)) return prev;
                  return [next, ...prev];
                }
                if (payload.eventType === "UPDATE") {
                  const next = payload.new as SpaceNote;
                  return prev.map((n) => (n.id === next.id ? next : n));
                }
                if (payload.eventType === "DELETE") {
                  const removed = payload.old as { id: string };
                  return prev.filter((n) => n.id !== removed.id);
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
    async (input: SpaceNoteInput) => {
      if (!spaceId) return null;
      const userId = (await supabase.auth.getSession()).data?.session?.user?.id;
      if (!userId) return null;

      setStatus("syncing");
      try {
        const { data, error: insertError } = await supabase
          .from("ethone_space_notes")
          .insert({ ...input, space_id: spaceId, created_by: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        const next = data as SpaceNote;
        setItems((prev) => (prev.some((n) => n.id === next.id) ? prev : [next, ...prev]));
        setStatus("idle");
        notifySpaceActivity(spaceId, "note", "created", next.title);
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
    async (id: string, input: Partial<SpaceNoteInput>) => {
      setStatus("syncing");
      const optimistic = { ...items.find((n) => n.id === id), ...input, id, updated_at: new Date().toISOString() } as SpaceNote;
      setItems((prev) => prev.map((n) => (n.id === id ? optimistic : n)));

      try {
        const { data, error: updateError } = await supabase
          .from("ethone_space_notes")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();

        if (updateError) throw updateError;
        const next = data as SpaceNote;
        setItems((prev) => prev.map((n) => (n.id === id ? next : n)));
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
      setItems((prev) => prev.filter((n) => n.id !== id));

      try {
        const { error: deleteError } = await supabase.from("ethone_space_notes").delete().eq("id", id);
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
