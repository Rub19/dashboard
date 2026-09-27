"use client";

import { useEffect, useRef, useState } from "react";
import { getUserState, setUserState, invalidateUserStateCache } from "@/lib/user-state";
import { supabase } from "@/lib/supabase";

export function useUserState<T>(key: string, initial: T) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  // Horodatage de la dernière écriture locale : les échos de nos propres écritures (et les frappes en cours) ne doivent pas être réappliqués.
  const lastLocalWrite = useRef(0);

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

  // Synchronisation temps réel : la ligne `ethone_user_state` (une par compte) change quand un autre appareil enregistre.
  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId) return;
    const channel = supabase
      .channel(`user_state_${key}_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ethone_user_state", filter: `user_id=eq.${currentUserId}` },
        () => {
          if (Date.now() - lastLocalWrite.current < 3000) return;
          invalidateUserStateCache();
          getUserState<T>(key, initial).then((remote) => setValue((current) => (JSON.stringify(current) === JSON.stringify(remote) ? current : remote)));
        },
      );
    void Promise.resolve(channel.subscribe()).catch(() => {});
    return () => {
      void channel.unsubscribe();
    };
    // `initial` change à chaque rendu quand c'est un littéral : seule la clé et l'utilisateur comptent ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, key]);

  useEffect(() => {
    if (!loaded) return;
    lastLocalWrite.current = Date.now();
    if (typeof window !== "undefined") localStorage.setItem(storageKey, JSON.stringify(value));
    setUserState(key, value).catch(() => {});
  }, [value, loaded, key, storageKey]);

  return [value, setValue] as const;
}
