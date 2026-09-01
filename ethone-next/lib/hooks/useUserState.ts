"use client";

import { useEffect, useState } from "react";
import { getUserState, setUserState } from "@/lib/user-state";
import { supabase } from "@/lib/supabase";

export function useUserState<T>(key: string, initial: T) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id);
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const storageKey = currentUserId ? `ethone:state:${currentUserId}:${key}` : `ethone:state:guest:${key}`;

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (saved) {
      try {
        setValue(JSON.parse(saved));
      } catch {
        setValue(saved as unknown as T);
      }
    } else {
      setValue(initial);
    }
    getUserState<T>(key, initial).then((remote) => {
      if (remote !== initial) setValue(remote);
      setLoaded(true);
    });
  }, [key, initial, storageKey]);

  useEffect(() => {
    if (!loaded) return;
    if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(value));
    setUserState(key, value).catch(() => {});
  }, [value, loaded, key, storageKey]);

  return [value, setValue] as const;
}
