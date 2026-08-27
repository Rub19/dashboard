"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchWorker } from "@/lib/api";

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
      const res = await fetchWorker("/api/profile");
      setProfile(res?.data || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const save = useCallback(async (input: Partial<Profile>) => {
    const method = profile ? "PATCH" : "POST";
    try {
      await fetchWorker("/api/profile", { method, body: JSON.stringify(input) });
    } catch (err) {
      throw err;
    }
    await load();
    return profile;
  }, [profile, load]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PublicProfileContext.Provider value={{ profile, loading, error, reload: load, save }}>
      {children}
    </PublicProfileContext.Provider>
  );
}
