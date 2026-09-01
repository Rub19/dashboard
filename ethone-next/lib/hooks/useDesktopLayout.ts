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

const STORAGE_KEY_PREFIX = "ethone:desktop-layout:";

function storageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readLocal(userId: string): DesktopLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "widgets" in parsed &&
      Array.isArray((parsed as Record<string, unknown>).widgets)
    ) {
      return parsed as DesktopLayout;
    }
  } catch {
    // ignore corrupted cache
  }
  return null;
}

function writeLocal(userId: string, layout: DesktopLayout) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(layout));
  } catch {
    // localStorage may be unavailable (private mode, quota, etc.)
  }
}

function isRemoteNewer(
  cached: DesktopLayout | null,
  remote: DesktopLayout | null,
): boolean {
  if (!remote) return false;
  if (!cached) return true;
  const localTime = cached.updated_at
    ? new Date(cached.updated_at).getTime()
    : 0;
  const remoteTime = remote.updated_at
    ? new Date(remote.updated_at).getTime()
    : 0;
  if (Number.isNaN(remoteTime)) return true;
  return remoteTime >= localTime;
}

function mergeLayouts(
  cached: DesktopLayout | null,
  remote: DesktopLayout | null,
): DesktopLayout {
  if (!cached && !remote) {
    return { widgets: [], updated_at: new Date().toISOString() };
  }
  if (isRemoteNewer(cached, remote)) {
    return remote!;
  }
  return cached || remote!;
}

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

      const cached = readLocal(userId);
      if (cached) {
        setLayout(cached);
        setLoading(false);
      }

      const { data, error: fetchError } = await supabase
        .from("desktop_layout")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116" && !isMissingSchemaError(fetchError)) {
        throw fetchError;
      }

      const remote: DesktopLayout | null = data
        ? { id: data.id, widgets: data.widgets || [], updated_at: data.updated_at }
        : null;

      const next = mergeLayouts(cached, remote);
      setLayout(next);
      writeLocal(userId, next);
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
                const remote: DesktopLayout = {
                  id: next.id ? String(next.id) : undefined,
                  widgets: Array.isArray(next.widgets) ? (next.widgets as WidgetLayout[]) : [],
                  updated_at: next.updated_at ? String(next.updated_at) : undefined,
                };
                setLayout((current) => {
                  const chosen = mergeLayouts(current, remote);
                  writeLocal(userId, chosen);
                  return chosen;
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
      writeLocal(userId, next);

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
