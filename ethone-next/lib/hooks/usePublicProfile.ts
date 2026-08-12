"use client";

import { useEffect, useState } from "react";
import { getPublicProfile } from "@/lib/api";

type PublicProfile = {
  publicId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
};

export function usePublicProfile(username: string | undefined) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    getPublicProfile(username)
      .then((res) => {
        const data = res?.data as PublicProfile | undefined;
        setProfile(data || null);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error(String(err))))
      .finally(() => setLoading(false));
  }, [username]);

  return { profile, loading, error };
}

export type { PublicProfile };
