"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchWorker } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type Profile = {
  public_id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  discoverable?: boolean;
};

type PublicProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
  save: (input: Partial<Profile>) => Promise<Profile | null>;
};

const PublicProfileContext = createContext<PublicProfileContextValue | null>(null);

const DEFAULT_PUBLIC_PROFILE_CONTEXT: PublicProfileContextValue = {
  profile: null,
  loading: false,
  error: null,
  reload: async () => {},
  save: async () => null,
};

export function usePublicProfileContext() {
  const value = useContext(PublicProfileContext);
  return value || DEFAULT_PUBLIC_PROFILE_CONTEXT;
}

export default function PublicProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Try Cloudflare Worker endpoint
      let workerProfile: Profile | null = null;
      try {
        const res = await fetchWorker("/api/profile");
        if (res?.data) {
          workerProfile = res.data;
        }
      } catch {
        // Worker endpoint failed, fallback to Supabase
      }

      // 2. Fetch Supabase User metadata
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      const meta = (userData?.user?.user_metadata || {}) as Record<string, unknown>;

      const resolvedAvatar =
        workerProfile?.avatar_url ||
        (typeof meta.custom_avatar_url === "string" ? meta.custom_avatar_url : undefined) ||
        (typeof meta.avatar_url === "string" ? meta.avatar_url : undefined) ||
        (typeof window !== "undefined" && currentUserId
          ? localStorage.getItem(`ethone_custom_avatar:${currentUserId}`) || undefined
          : undefined);

      const resolvedName =
        workerProfile?.display_name ||
        (typeof meta.display_name === "string" ? meta.display_name : undefined) ||
        (typeof meta.custom_display_name === "string" ? meta.custom_display_name : undefined) ||
        (typeof meta.username === "string" && meta.username.trim() ? meta.username.trim() : undefined) ||
        (typeof window !== "undefined" && currentUserId
          ? localStorage.getItem(`ethone_user_name:${currentUserId}`) || undefined
          : undefined) ||
        (userData?.user?.email ? userData.user.email.split("@")[0] : "Utilisateur");

      const resolvedUsername =
        workerProfile?.username ||
        (typeof meta.username === "string" ? meta.username : undefined) ||
        (userData?.user?.email ? userData.user.email.split("@")[0] : "utilisateur");

      const resolvedProfile: Profile = {
        public_id: workerProfile?.public_id || currentUserId || "local",
        username: resolvedUsername,
        display_name: resolvedName,
        avatar_url: resolvedAvatar,
        discoverable: workerProfile?.discoverable ?? true,
      };

      setProfile(resolvedProfile);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (input: Partial<Profile>) => {
    setError(null);

    // 1. Immediate LocalStorage persistence with user scope
    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id;
      if (typeof window !== "undefined" && currentUserId) {
        if (input.avatar_url) {
          localStorage.setItem(`ethone_custom_avatar:${currentUserId}`, input.avatar_url);
          localStorage.setItem(`ethone:custom:avatar:${currentUserId}`, input.avatar_url);
          localStorage.setItem(`ethone_user_avatar:${currentUserId}`, input.avatar_url);
        }
        if (input.display_name) {
          localStorage.setItem(`ethone_user_name:${currentUserId}`, input.display_name);
        }
      }
    } catch {}

    // 2. Supabase Auth user_metadata persistence
    try {
      await supabase.auth.updateUser({
        data: {
          custom_avatar_url: input.avatar_url,
          avatar_url: input.avatar_url,
          display_name: input.display_name,
          username: input.username,
        },
      });
    } catch (authErr) {
      console.warn("Supabase auth updateUser error:", authErr);
    }

    // 3. Supabase profiles table upsert
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        await supabase.from("profiles").upsert({
          id: userData.user.id,
          username: input.username,
          display_name: input.display_name,
          avatar_url: input.avatar_url,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (dbErr) {
      console.warn("Supabase profiles table upsert error:", dbErr);
    }

    // 4. Cloudflare Worker sync
    try {
      const method = profile ? "PATCH" : "POST";
      await fetchWorker("/api/profile", { method, body: JSON.stringify(input) });
    } catch (workerErr) {
      console.warn("Worker /api/profile sync error:", workerErr);
    }

    // 5. Update state and broadcast update to all hooks & components
    const nextProfile: Profile = {
      ...profile,
      ...input,
    };
    setProfile(nextProfile);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ethone:identity:update", { detail: nextProfile }));
    }

    return nextProfile;
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PublicProfileContext.Provider value={{ profile, loading, error, reload: load, save }}>
      {children}
    </PublicProfileContext.Provider>
  );
}
