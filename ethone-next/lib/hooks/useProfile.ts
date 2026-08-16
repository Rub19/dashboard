"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchWorker } from "@/lib/api";

export type Profile = {
  public_id?: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  discoverable?: boolean;
};

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWorker("/api/profile");
      setProfile(res.data || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(input: Partial<Profile>) {
    await fetchWorker("/api/profile", {
      method: profile ? "PATCH" : "POST",
      body: JSON.stringify(input),
    });
    const res = await fetchWorker("/api/profile");
    setProfile(res?.data || null);
    return res?.data;
  }

  return { profile, loading, error, reload: load, save };
}
