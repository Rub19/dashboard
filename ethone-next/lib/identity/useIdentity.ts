"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { EthoneIdentity, IdentityPresenceStatus } from "./types";

export type IdentityInput = Partial<
  Omit<EthoneIdentity, "user_id" | "public_id" | "updated_at">
>;

type IdentityRow = {
  user_id: string;
  public_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  avatar_id: string;
  avatar_frame_id: string;
  profile_background_id: string;
  badge_ids: unknown;
  accent_color: string;
  presence_status: string;
  bio: string;
  discoverable: boolean;
  updated_at: string;
};

export function useIdentity() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState<EthoneIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setIdentity(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("ethone_public_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (err && err.code !== "PGRST116") throw err;
      if (data) setIdentity(mapRow(data as unknown as IdentityRow));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const save = useCallback(
    async (input: IdentityInput) => {
      if (!user?.id) return null;

      try {
        setError(null);
        const { data, error: err } = await supabase
          .from("ethone_public_profiles")
          .update({
            ...input,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (err) throw err;
        const next = data ? mapRow(data as unknown as IdentityRow) : null;
        setIdentity(next);

        if (next && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ethone:identity:update", { detail: next })
          );
        }

        return next;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [user]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { identity, loading, error, reload: load, save };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isPresenceStatus(value: unknown): value is IdentityPresenceStatus {
  return (
    typeof value === "string" &&
    ["online", "available", "busy", "dnd", "away", "invisible", "offline"].includes(value)
  );
}

function mapRow(row: IdentityRow): EthoneIdentity {
  return {
    user_id: row.user_id ?? "",
    public_id: row.public_id ?? "",
    username: row.username ?? "",
    display_name: row.display_name ?? "",
    avatar_url: row.avatar_url ?? "",
    avatar_id: row.avatar_id ?? "",
    avatar_frame_id: row.avatar_frame_id ?? "",
    profile_background_id: row.profile_background_id ?? "",
    badge_ids: isStringArray(row.badge_ids) ? row.badge_ids : [],
    accent_color: row.accent_color ?? "",
    presence_status: isPresenceStatus(row.presence_status) ? row.presence_status : "offline",
    bio: row.bio ?? "",
    discoverable: Boolean(row.discoverable),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}
