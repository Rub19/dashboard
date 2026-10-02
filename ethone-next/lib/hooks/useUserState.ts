"use client";

import { useEffect, useRef, useState } from "react";
import { getUserState, setUserState, invalidateUserStateCache } from "@/lib/user-state";
import { supabase } from "@/lib/supabase";

// Valeur témoin : getUserState la renvoie quand la clé n'existe pas encore sur le serveur.
const ABSENT = Symbol("absent");

export function useUserState<T>(key: string, initial: T) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  // Vrai une fois la session connue : avant, la copie « invité » (souvent ancienne) était lue puis écrite sur le compte.
  const [authReady, setAuthReady] = useState(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const initialKey = JSON.stringify(initial);
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  // Horodatage de la dernière écriture locale : les échos de nos propres écritures (et les frappes en cours) ne doivent pas être réappliqués.
  const lastLocalWrite = useRef(0);
  // Dernière valeur connue côté serveur (JSON) : on n'écrit que ce qui a réellement changé. Avant, chaque clé était
  // réécrite juste après avoir été lue (une écriture inutile par clé et par composant à chaque chargement).
  const persisted = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data?.session?.user?.id);
      setAuthReady(true);
    });
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id);
      setAuthReady(true);
    });
    return () => {
      authSub?.subscription?.unsubscribe();
    };
  }, []);

  const storageKey = currentUserId ? `ethone:state:${currentUserId}:${key}` : `ethone:state:guest:${key}`;

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoaded(false);
    const fallback = initialRef.current;
    const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    let local: T = fallback;
    if (raw) {
      try {
        local = JSON.parse(raw);
      } catch {
        local = raw as unknown as T;
      }
    }
    setValue(local);
    // Invité : tout reste local.
    if (!currentUserId) {
      persisted.current = null;
      setLoaded(true);
      return;
    }
    getUserState<T | typeof ABSENT>(key, ABSENT).then((remote) => {
      if (cancelled) return;
      if (remote === ABSENT) {
        // Rien sur le serveur pour cette clé : la copie locale y sera envoyée une fois (si elle diffère du défaut).
        persisted.current = JSON.stringify(fallback);
      } else {
        // Le serveur fait foi : la copie locale n'écrase plus jamais la valeur du compte.
        persisted.current = JSON.stringify(remote);
        setValue(remote as T);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // `initial` littéral = nouvel objet à chaque rendu : on suit son contenu (initialKey), pas sa référence.
  }, [key, initialKey, storageKey, authReady, currentUserId]);

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
          getUserState<T>(key, initial).then((remote) => {
            persisted.current = JSON.stringify(remote);
            setValue((current) => (JSON.stringify(current) === persisted.current ? current : remote));
          });
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
    const json = JSON.stringify(value);
    if (typeof window !== "undefined") localStorage.setItem(storageKey, json);
    if (!currentUserId || json === persisted.current) return;
    persisted.current = json;
    lastLocalWrite.current = Date.now();
    setUserState(key, value).catch(() => {});
  }, [value, loaded, key, storageKey, currentUserId]);

  return [value, setValue] as const;
}
