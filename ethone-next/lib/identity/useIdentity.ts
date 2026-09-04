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

function getLocalIdentity(userId?: string | null): EthoneIdentity | null {
  if (typeof window === "undefined") return null;
  const effectiveId = userId || "local";
  try {
    const raw =
      localStorage.getItem(`ethone:identity:${effectiveId}`) ||
      localStorage.getItem("ethone:identity:current");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as EthoneIdentity;
    }

    const displayName =
      (userId ? localStorage.getItem(`ethone_user_name:${userId}`) : null) ||
      localStorage.getItem(`ethone_user_name:local`) ||
      localStorage.getItem("ethone:user_name") ||
      localStorage.getItem("ethone:user:name") ||
      "";
    const username =
      (userId ? localStorage.getItem(`ethone_user_username:${userId}`) : null) ||
      localStorage.getItem(`ethone_user_username:local`) ||
      localStorage.getItem("ethone:user:username") ||
      "";
    const bio =
      (userId ? localStorage.getItem(`ethone_user_bio:${userId}`) : null) ||
      localStorage.getItem(`ethone_user_bio:local`) ||
      localStorage.getItem("ethone:user:bio") ||
      "";
    const avatarUrl =
      (userId ? localStorage.getItem(`ethone_custom_avatar:${userId}`) : null) ||
      localStorage.getItem("ethone_custom_avatar:local") ||
      localStorage.getItem("ethone_custom_avatar") ||
      localStorage.getItem("ethone_user_avatar:local") ||
      "";
    const avatarFrameId =
      (userId ? localStorage.getItem(`ethone_user_frame:${userId}`) : null) ||
      localStorage.getItem(`ethone_user_frame:local`) ||
      localStorage.getItem("ethone:user:frame") ||
      "";

    if (displayName || username || bio || avatarUrl || avatarFrameId) {
      return {
        user_id: userId || "",
        public_id: userId || "local",
        username,
        display_name: displayName,
        avatar_url: avatarUrl,
        avatar_id: "",
        avatar_frame_id: avatarFrameId,
        profile_background_id: "",
        badge_ids: [],
        accent_color: "",
        presence_status: "online",
        bio,
        discoverable: true,
        updated_at: new Date().toISOString(),
      };
    }
  } catch {}
  return null;
}

function saveLocalIdentity(identity: EthoneIdentity, userId?: string | null) {
  if (typeof window === "undefined") return;
  const effectiveId = userId || "local";
  try {
    const str = JSON.stringify(identity);
    localStorage.setItem(`ethone:identity:${effectiveId}`, str);
    localStorage.setItem("ethone:identity:current", str);

    if (identity.display_name) {
      localStorage.setItem(`ethone_user_name:${effectiveId}`, identity.display_name);
      localStorage.setItem("ethone:user_name", identity.display_name);
      localStorage.setItem("ethone_user_name:local", identity.display_name);
    }
    if (identity.username) {
      localStorage.setItem(`ethone_user_username:${effectiveId}`, identity.username);
      localStorage.setItem("ethone:user:username", identity.username);
      localStorage.setItem("ethone_user_username:local", identity.username);
    }
    if (identity.bio !== undefined) {
      localStorage.setItem(`ethone_user_bio:${effectiveId}`, identity.bio);
      localStorage.setItem("ethone:user:bio", identity.bio);
      localStorage.setItem("ethone_user_bio:local", identity.bio);
    }
    if (identity.avatar_url) {
      localStorage.setItem(`ethone_custom_avatar:${effectiveId}`, identity.avatar_url);
      localStorage.setItem(`ethone:custom:avatar:${effectiveId}`, identity.avatar_url);
      localStorage.setItem(`ethone_user_avatar:${effectiveId}`, identity.avatar_url);
      localStorage.setItem("ethone_custom_avatar:local", identity.avatar_url);
      localStorage.setItem("ethone_custom_avatar", identity.avatar_url);
    }
    if (identity.avatar_frame_id !== undefined) {
      localStorage.setItem(`ethone_user_frame:${effectiveId}`, identity.avatar_frame_id);
      localStorage.setItem("ethone:user:frame", identity.avatar_frame_id);
      localStorage.setItem("ethone_user_frame:local", identity.avatar_frame_id);
    }
  } catch {}
}

export function useIdentity() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState<EthoneIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    // 1. Load from LocalStorage first for instant rendering
    const cached = getLocalIdentity(user?.id);
    if (cached) {
      setIdentity(cached);
      setLoading(false);
    }

    if (!user?.id) {
      if (!cached) setIdentity(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: err } = await supabase
        .from("ethone_public_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (err && err.code !== "PGRST116") throw err;
      if (data) {
        const fromDb = mapRow(data as unknown as IdentityRow);
        const merged: EthoneIdentity = {
          ...fromDb,
          ...(cached?.avatar_url && !fromDb.avatar_url ? { avatar_url: cached.avatar_url } : {}),
          ...(cached?.display_name && !fromDb.display_name ? { display_name: cached.display_name } : {}),
          ...(cached?.username && !fromDb.username ? { username: cached.username } : {}),
          ...(cached?.bio && !fromDb.bio ? { bio: cached.bio } : {}),
          ...(cached?.avatar_frame_id && !fromDb.avatar_frame_id ? { avatar_frame_id: cached.avatar_frame_id } : {}),
        };
        setIdentity(merged);
        saveLocalIdentity(merged, user.id);
      }
    } catch (err) {
      console.warn("Could not fetch remote identity, using local cache:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const save = useCallback(
    async (input: IdentityInput) => {
      const effectiveId = user?.id || "local";

      const current = identity || getLocalIdentity(user?.id) || {
        user_id: user?.id || "",
        public_id: user?.id || "local",
        username: "",
        display_name: "",
        avatar_url: "",
        avatar_id: "",
        avatar_frame_id: "",
        profile_background_id: "",
        badge_ids: [],
        accent_color: "",
        presence_status: "online",
        bio: "",
        discoverable: true,
        updated_at: new Date().toISOString(),
      };

      const next: EthoneIdentity = {
        ...current,
        ...input,
        user_id: user?.id || current.user_id || "",
        public_id: user?.id || current.public_id || "local",
        updated_at: new Date().toISOString(),
      };

      // 1. Immediate local persistence
      saveLocalIdentity(next, user?.id);
      setIdentity(next);

      // 2. Broadcast update across all open tabs, windows and hooks
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("ethone:identity:update", { detail: next })
        );
      }

      // 3. Remote persistence via Supabase UPSERT
      if (user?.id) {
        try {
          await supabase
            .from("ethone_public_profiles")
            .upsert(
              {
                user_id: user.id,
                public_id: user.id,
                username: next.username,
                display_name: next.display_name,
                avatar_url: next.avatar_url,
                avatar_id: next.avatar_id,
                avatar_frame_id: next.avatar_frame_id,
                profile_background_id: next.profile_background_id,
                badge_ids: next.badge_ids,
                accent_color: next.accent_color,
                presence_status: next.presence_status,
                bio: next.bio,
                discoverable: next.discoverable,
                updated_at: next.updated_at,
              },
              { onConflict: "user_id" }
            );

          // Update Supabase Auth user_metadata
          try {
            await supabase.auth.updateUser({
              data: {
                display_name: next.display_name,
                custom_display_name: next.display_name,
                username: next.username,
                avatar_url: next.avatar_url,
                custom_avatar_url: next.avatar_url,
                bio: next.bio,
                avatar_frame_id: next.avatar_frame_id,
              },
            });
          } catch {}

          // Update Supabase profiles table
          try {
            await supabase.from("profiles").upsert({
              id: user.id,
              display_name: next.display_name,
              username: next.username,
              avatar_url: next.avatar_url,
              updated_at: next.updated_at,
            });
          } catch {}
        } catch (dbErr) {
          console.warn("Remote identity save error (local saved):", dbErr);
        }
      }

      return next;
    },
    [user, identity]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<EthoneIdentity>;
      if (customEvent.detail) {
        setIdentity((prev) => (prev ? { ...prev, ...customEvent.detail } : customEvent.detail));
      }
    };
    window.addEventListener("ethone:identity:update", handleUpdate);
    return () => window.removeEventListener("ethone:identity:update", handleUpdate);
  }, []);

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
