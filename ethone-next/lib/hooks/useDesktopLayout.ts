"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, isMissingSchemaError } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";

export type WidgetLayout = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized?: boolean;
  visible?: boolean;
};

export type DesktopLayout = {
  id?: string;
  widgets: WidgetLayout[];
  updated_at?: string;
};

type SyncStatus = "idle" | "syncing" | "error";

export function useDesktopLayout() {
  const [layout, setLayout] = useState<DesktopLayout | null>(null);
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
        setLayout(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("desktop_layout")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116" && !isMissingSchemaError(fetchError)) {
        throw fetchError;
      }

      setLayout(
        data
          ? { id: data.id, widgets: data.widgets || [], updated_at: data.updated_at }
          : { widgets: [], updated_at: new Date().toISOString() },
      );
    } catch (err) {
      if (!isMissingSchemaError(err)) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
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
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;

        channel = supabase
          .channel(`desktop_layout_changes_${userId.slice(0, 8)}_${Date.now()}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "desktop_layout",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              if (payload.new && typeof payload.new === "object") {
                const next = payload.new as Record<string, unknown>;
                setLayout({
                  id: next.id ? String(next.id) : undefined,
                  widgets: Array.isArray(next.widgets) ? (next.widgets as WidgetLayout[]) : [],
                  updated_at: next.updated_at ? String(next.updated_at) : undefined,
                });
              }
            },
          );
        await channel.subscribe();
      } catch {
        // Realtime optional; schema or channel errors fall back to manual sync.
      }
    }

    subscribe().catch(() => {});
    return () => {
      channel?.unsubscribe();
    };
  }, []);

  const update = useCallback(
    async (widgets: WidgetLayout[]) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      setStatus("syncing");
      const next = { ...layout, widgets, updated_at: new Date().toISOString() };
      setLayout(next);

      try {
        const { error: upsertError } = await supabase
          .from("desktop_layout")
          .upsert(
            { user_id: userId, widgets, updated_at: next.updated_at },
            { onConflict: "user_id" },
          );

        if (upsertError) throw upsertError;
        setStatus("idle");
      } catch (err) {
        if (!isMissingSchemaError(err)) {
          setStatus("error");
          setError(err instanceof Error ? err : new Error(String(err)));
        } else {
          setStatus("idle");
        }
      }
    },
    [layout],
  );

  useEffect(() => {
    useSyncStore.getState().setStatus("desktop_layout", status);
  }, [status]);

  return { layout, loading, error, status, update, reload: load };
}
