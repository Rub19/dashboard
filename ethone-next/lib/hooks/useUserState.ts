"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getUserState, setUserState, invalidateUserStateCache } from "@/lib/user-state";
import { supabase } from "@/lib/supabase";

// Valeur témoin : getUserState la renvoie quand la clé n'existe pas encore sur le serveur.
const ABSENT = Symbol("absent");
const SAME_TAB_EVENT = "ethone:user-state";

// ───────────── Un seul abonnement temps réel par compte, partagé par tous les composants (avant : un canal par
// composant et par clé, et chaque notification relançait autant de lectures).
type Shared = { channel: RealtimeChannel; listeners: Set<() => void> };
const shared = new Map<string, Shared>();

export function subscribeUserStateChanges(userId: string, listener: () => void): () => void {
  let entry = shared.get(userId);
  if (!entry) {
    const listeners = new Set<() => void>();
    const channel = supabase
      .channel(`user_state_${userId.slice(0, 8)}_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ethone_user_state", filter: `user_id=eq.${userId}` }, () => {
        invalidateUserStateCache(); // une fois pour tout le monde ; les lectures suivantes sont partagées
        listeners.forEach((l) => l());
      });
    void Promise.resolve(channel.subscribe()).catch(() => {});
    entry = { channel, listeners };
    shared.set(userId, entry);
  }
  entry.listeners.add(listener);
  return () => {
    const e = shared.get(userId);
    if (!e) return;
    e.listeners.delete(listener);
    if (e.listeners.size === 0) {
      shared.delete(userId);
      void supabase.removeChannel(e.channel);
    }
  };
}

type Options = {
  /** Ancienne clé localStorage : sa valeur sert de départ (puis est envoyée sur le compte) et reste tenue à jour. */
  legacyKey?: string;
  /** false : le hook ne fait rien (utile pour choisir dynamiquement entre stockage local et synchronisé). */
  enabled?: boolean;
};

/**
 * État rattaché au compte (table `ethone_user_state`), synchronisé en direct entre appareils et entre composants.
 * Le serveur fait foi ; l'invité reste en local.
 */
export function useUserState<T>(key: string, initial: T, opts: Options = {}) {
  const enabled = opts.enabled !== false;
  const legacyKey = opts.legacyKey;
  const instanceId = useId();
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
  // Dernière valeur connue côté serveur (JSON) : on n'écrit que ce qui a réellement changé.
  const persisted = useRef<string | null>(null);
  // Valeur reçue d'un autre composant du même onglet : ne pas la renvoyer au serveur ni la rediffuser.
  const fromPeer = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);

  const storageKey = currentUserId ? `ethone:state:${currentUserId}:${key}` : `ethone:state:guest:${key}`;

  useEffect(() => {
    if (!enabled || !authReady) return;
    let cancelled = false;
    setLoaded(false);
    const fallback = initialRef.current;
    const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) ?? (legacyKey ? localStorage.getItem(legacyKey) : null) : null;
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
  }, [enabled, key, initialKey, storageKey, legacyKey, authReady, currentUserId]);

  // Temps réel : un autre appareil a enregistré.
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !currentUserId) return;
    return subscribeUserStateChanges(currentUserId, () => {
      if (Date.now() - lastLocalWrite.current < 3000) return;
      getUserState<T | typeof ABSENT>(key, ABSENT).then((remote) => {
        if (remote === ABSENT) return;
        const json = JSON.stringify(remote);
        persisted.current = json;
        setValue((current) => (JSON.stringify(current) === json ? current : (remote as T)));
      });
    });
  }, [enabled, currentUserId, key]);

  // Même onglet : un autre composant utilisant la même clé a changé la valeur.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onPeer = (e: Event) => {
      const d = (e as CustomEvent<{ key: string; json: string; from: string }>).detail;
      if (!d || d.key !== key || d.from === instanceId) return;
      fromPeer.current = d.json;
      persisted.current = currentUserId ? d.json : persisted.current;
      try {
        setValue(JSON.parse(d.json));
      } catch {}
    };
    window.addEventListener(SAME_TAB_EVENT, onPeer);
    return () => window.removeEventListener(SAME_TAB_EVENT, onPeer);
  }, [enabled, key, instanceId, currentUserId]);

  // Autre onglet : synchronisation instantanée sans attendre le réseau via l'événement natif storage.
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (!e.key || (e.key !== storageKey && e.key !== legacyKey) || !e.newValue) return;
      fromPeer.current = e.newValue;
      persisted.current = currentUserId ? e.newValue : persisted.current;
      try {
        setValue(JSON.parse(e.newValue));
      } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled, storageKey, legacyKey, currentUserId]);

  useEffect(() => {
    if (!enabled || !loaded) return;
    const json = JSON.stringify(value);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, json);
      if (legacyKey) localStorage.setItem(legacyKey, json);
      if (fromPeer.current === json) {
        fromPeer.current = null;
        return;
      }
      window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: { key, json, from: instanceId } }));
    }
    if (!currentUserId || json === persisted.current) return;
    persisted.current = json;
    lastLocalWrite.current = Date.now();
    setUserState(key, value).catch(() => {});
  }, [enabled, value, loaded, key, storageKey, legacyKey, currentUserId, instanceId]);

  return [value, setValue] as const;
}
