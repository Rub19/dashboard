"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";
import { dateKey } from "@/components/ActivityHeatmap";

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

export type Habit = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string | null;
  target_per_week: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
};

export type HabitInput = Omit<Habit, "id" | "archived" | "created_at" | "updated_at">;

export type HabitCompletion = {
  id: string;
  habit_id: string;
  completed_on: string; // "YYYY-MM-DD"
};

type SyncStatus = "idle" | "syncing" | "error";

function todayKey(): string {
  return dateKey(new Date().toISOString());
}

export function useHabits() {
  const [items, setItems] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
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
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) {
        setItems([]);
        setCompletions([]);
        setLoading(false);
        return;
      }

      const [habitsRes, completionsRes] = await Promise.all([
        supabase.from("ethone_habits").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        // Last 90 days of completions is enough for any streak/history view
        // this hook exposes — no need to load a user's entire history.
        supabase
          .from("ethone_habit_completions")
          .select("id, habit_id, completed_on")
          .eq("user_id", userId)
          .gte("completed_on", new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
      ]);

      if (habitsRes.error) throw habitsRes.error;
      if (completionsRes.error) throw completionsRes.error;
      setItems((habitsRes.data as Habit[]) || []);
      setCompletions((completionsRes.data as HabitCompletion[]) || []);
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

  // Realtime is wired for the habit list only (v1 scope cap) — completions
  // are refreshed via the optimistic toggleToday() update plus a full
  // reload() on error, not a second realtime channel.
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
          .channel(`habits_changes:${realtimeId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "ethone_habits",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              setItems((prev) => {
                if (payload.eventType === "INSERT") {
                  const next = payload.new as Habit;
                  if (prev.some((h) => h.id === next.id)) return prev;
                  return [next, ...prev];
                }
                if (payload.eventType === "UPDATE") {
                  const next = payload.new as Habit;
                  return prev.map((h) => (h.id === next.id ? next : h));
                }
                if (payload.eventType === "DELETE") {
                  const removed = payload.old as { id: string };
                  return prev.filter((h) => h.id !== removed.id);
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
    async (input: HabitInput) => {
      const userId = await withUserId();
      if (!userId) {
        setStatus("idle");
        return null;
      }

      setStatus("syncing");
      try {
        const { data, error: insertError } = await supabase
          .from("ethone_habits")
          .insert({ ...input, user_id: userId })
          .select()
          .single();

        if (insertError) throw insertError;
        const next = data as Habit;
        setItems((prev) => (prev.some((h) => h.id === next.id) ? prev : [next, ...prev]));
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
    async (id: string, input: Partial<HabitInput> & { archived?: boolean }) => {
      const userId = await withUserId();
      if (!userId) {
        setStatus("idle");
        return null;
      }

      setStatus("syncing");
      const optimistic = { ...items.find((h) => h.id === id), ...input, id, updated_at: new Date().toISOString() } as Habit;
      setItems((prev) => prev.map((h) => (h.id === id ? optimistic : h)));

      try {
        const { data, error: updateError } = await supabase
          .from("ethone_habits")
          .update({ ...input, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) throw updateError;
        const next = data as Habit;
        setItems((prev) => prev.map((h) => (h.id === id ? next : h)));
        setStatus("idle");
        return next;
      } catch (err) {
        setStatus("error");
        setError(new Error(errorMessage(err)));
        await load();
        return null;
      }
    },
    [items, load, withUserId],
  );

  const remove = useCallback(
    async (id: string) => {
      const userId = await withUserId();
      if (!userId) {
        setStatus("idle");
        return;
      }

      setStatus("syncing");
      const previous = [...items];
      setItems((prev) => prev.filter((h) => h.id !== id));

      try {
        const { error: deleteError } = await supabase.from("ethone_habits").delete().eq("id", id).eq("user_id", userId);
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

  // Inserts today's completion if missing, deletes it if present — this is
  // the "toggle" for a single day, backed by the (habit_id, completed_on)
  // unique constraint so there's never a duplicate row for the same day.
  const toggleToday = useCallback(
    async (habitId: string) => {
      const userId = await withUserId();
      if (!userId) return;

      const today = todayKey();
      const existing = completions.find((c) => c.habit_id === habitId && c.completed_on === today);
      const previous = [...completions];

      if (existing) {
        setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
        try {
          const { error: deleteError } = await supabase.from("ethone_habit_completions").delete().eq("id", existing.id).eq("user_id", userId);
          if (deleteError) throw deleteError;
        } catch (err) {
          setCompletions(previous);
          setError(new Error(errorMessage(err)));
        }
        return;
      }

      const optimisticId = `pending-${habitId}-${today}`;
      setCompletions((prev) => [...prev, { id: optimisticId, habit_id: habitId, completed_on: today }]);
      try {
        const { data, error: insertError } = await supabase
          .from("ethone_habit_completions")
          .insert({ habit_id: habitId, user_id: userId, completed_on: today })
          .select("id, habit_id, completed_on")
          .single();
        if (insertError) throw insertError;
        setCompletions((prev) => prev.map((c) => (c.id === optimisticId ? (data as HabitCompletion) : c)));
      } catch (err) {
        setCompletions(previous);
        setError(new Error(errorMessage(err)));
      }
    },
    [completions, withUserId],
  );

  const isDoneToday = useCallback(
    (habitId: string) => completions.some((c) => c.habit_id === habitId && c.completed_on === todayKey()),
    [completions],
  );

  // Consecutive days ending today (or yesterday, so a streak isn't zeroed
  // out just because today hasn't been checked off yet).
  const getStreak = useCallback(
    (habitId: string): number => {
      const days = new Set(completions.filter((c) => c.habit_id === habitId).map((c) => c.completed_on));
      let streak = 0;
      const cursor = new Date();
      if (!days.has(dateKey(cursor.toISOString()))) {
        cursor.setDate(cursor.getDate() - 1);
        if (!days.has(dateKey(cursor.toISOString()))) return 0;
      }
      while (days.has(dateKey(cursor.toISOString()))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      }
      return streak;
    },
    [completions],
  );

  const getHistory = useCallback(
    (habitId: string): Set<string> => new Set(completions.filter((c) => c.habit_id === habitId).map((c) => c.completed_on)),
    [completions],
  );

  useEffect(() => {
    useSyncStore.getState().setStatus("habits", status);
  }, [status]);

  return { items, completions, loading, error, status, create, update, remove, toggleToday, isDoneToday, getStreak, getHistory, reload: load };
}
