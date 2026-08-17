"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSyncStore } from "@/lib/stores/sync";

type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type UserSettings = {
  theme: string;
  language: string;
  dynamic_island_visible: boolean;
  dock_position: string;
  wallpaper_url: string | null;
  updated_at?: string;
};

export type UpdateableUserSettings = Partial<Omit<UserSettings, "updated_at">>;

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
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
        setSettings(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      setSettings(
        data
          ? {
              theme: data.theme,
              language: data.language,
              dynamic_island_visible: data.dynamic_island_visible,
              dock_position: data.dock_position,
              wallpaper_url: data.wallpaper_url,
              updated_at: data.updated_at,
            }
          : {
              theme: "dark",
              language: "fr",
              dynamic_island_visible: true,
              dock_position: "bottom",
              wallpaper_url: null,
            },
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(
    async (partial: UpdateableUserSettings) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) return;

      setStatus("syncing");
      const next = { ...settings, ...partial, updated_at: new Date().toISOString() } as UserSettings;
      setSettings(next);

      try {
        const payload = {
          user_id: uid,
          theme: next.theme,
          language: next.language,
          dynamic_island_visible: next.dynamic_island_visible,
          dock_position: next.dock_position,
          wallpaper_url: next.wallpaper_url,
          updated_at: next.updated_at,
        };

        const { error: upsertError } = await supabase
          .from("user_settings")
          .upsert(payload, { onConflict: "user_id" });

        if (upsertError) throw upsertError;
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err : new Error(String(err)));
        // Optimistic rollback: reload server state on error.
        await load();
      }
    },
    [settings, load],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!settings || typeof window === "undefined") return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe() {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) return;

      channel = supabase
        .channel("user_settings_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_settings",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            if (payload.new && typeof payload.new === "object") {
              const next = payload.new as Record<string, unknown>;
              setSettings({
                theme: String(next.theme ?? "dark"),
                language: String(next.language ?? "fr"),
                dynamic_island_visible: Boolean(next.dynamic_island_visible),
                dock_position: String(next.dock_position ?? "bottom"),
                wallpaper_url: next.wallpaper_url ? String(next.wallpaper_url) : null,
                updated_at: next.updated_at ? String(next.updated_at) : undefined,
              });
            }
          },
        )
        .subscribe((subStatus) => {
          if (subStatus === "CHANNEL_ERROR" || subStatus === "TIMED_OUT") {
            setStatus("offline");
          }
        });
    }

    subscribe();
    return () => {
      channel?.unsubscribe();
    };
  }, [settings]);

  useEffect(() => {
    useSyncStore.getState().setStatus("user_settings", status);
  }, [status]);

  return { settings, loading, error, status, update, reload: load };
}
