"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";

export type PomodoroMode = "work" | "short_break" | "long_break";

export type PomodoroSession = {
  id?: string;
  mode: PomodoroMode;
  time_remaining_seconds: number;
  is_running: boolean;
  started_at: string | null;
  updated_at?: string;
};

type SyncStatus = "idle" | "syncing" | "error";

export function usePomodoroSession() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
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
        setSession(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("pomodoro_sessions")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      setSession(
        data
          ? {
              id: data.id,
              mode: data.mode,
              time_remaining_seconds: data.time_remaining_seconds,
              is_running: data.is_running,
              started_at: data.started_at,
              updated_at: data.updated_at,
            }
          : {
              mode: "work",
              time_remaining_seconds: 0,
              is_running: false,
              started_at: null,
            },
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      channel = supabase
        .channel("pomodoro_sessions_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "pomodoro_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (payload.new && typeof payload.new === "object") {
              const next = payload.new as Record<string, unknown>;
              setSession({
                id: next.id ? String(next.id) : undefined,
                mode: String(next.mode ?? "work") as PomodoroMode,
                time_remaining_seconds: Number(next.time_remaining_seconds ?? 0),
                is_running: Boolean(next.is_running),
                started_at: next.started_at ? String(next.started_at) : null,
                updated_at: next.updated_at ? String(next.updated_at) : undefined,
              });
            }
          },
        )
        .subscribe();
    }

    subscribe();
    return () => {
      channel?.unsubscribe();
    };
  }, []);

  const update = useCallback(
    async (partial: Partial<PomodoroSession>) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      setStatus("syncing");
      const next = {
        ...session,
        ...partial,
        updated_at: new Date().toISOString(),
      } as PomodoroSession;
      setSession(next);

      try {
        const { error: upsertError } = await supabase
          .from("pomodoro_sessions")
          .upsert(
            {
              user_id: userId,
              mode: next.mode,
              time_remaining_seconds: next.time_remaining_seconds,
              is_running: next.is_running,
              started_at: next.started_at,
              updated_at: next.updated_at,
            },
            { onConflict: "user_id" },
          );

        if (upsertError) throw upsertError;
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err : new Error(String(err)));
        await load();
      }
    },
    [session, load],
  );

  useEffect(() => {
    useSyncStore.getState().setStatus("pomodoro", status);
  }, [status]);

  return { session, loading, error, status, update, reload: load };
}
