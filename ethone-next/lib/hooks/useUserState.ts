"use client";

import { useEffect, useState } from "react";
import { getUserState, setUserState } from "@/lib/user-state";

export function useUserState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(`ethone:${key}`) : null;
    if (saved) {
      try {
        setValue(JSON.parse(saved));
      } catch {
        setValue(saved as unknown as T);
      }
    }
    getUserState<T>(key, initial).then((remote) => {
      if (remote !== initial) setValue(remote);
      setLoaded(true);
    });
  }, [key, initial]);

  useEffect(() => {
    if (!loaded) return;
    if (typeof window !== "undefined") localStorage.setItem(`ethone:${key}`, JSON.stringify(value));
    setUserState(key, value).catch(() => {});
  }, [value, loaded, key]);

  return [value, setValue] as const;
}
