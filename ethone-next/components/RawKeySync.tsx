"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getUserState, setUserState } from "@/lib/user-state";
import { subscribeUserStateChanges } from "@/lib/hooks/useUserState";

/**
 * Rattache au compte quelques données que leurs modules lisent directement dans localStorage (préréglages, historique
 * et objectif Focus). Le serveur fait foi : à la connexion et à chaque changement venu d'un autre appareil, la valeur
 * du compte est recopiée en local (avec un événement `storage` pour les écrans qui l'écoutent) ; les écritures locales
 * sont envoyées au compte.
 */
const RAW_KEYS = ["ethone-presets", "ethone-focus-history", "ethone_focus_daily_goal_minutes"];
const ABSENT = Symbol("absent");
// ponytail: comparaison périodique (3 s) plutôt qu'un événement émis par chaque module ; à remplacer si un module en émet un.
const POLL_MS = 3000;

export default function RawKeySync() {
  useEffect(() => {
    let userId: string | null = null;
    let unsubscribe: (() => void) | null = null;
    const known = new Map<string, string | null>(); // dernière valeur alignée avec le compte

    const pull = async () => {
      if (!userId) return;
      for (const key of RAW_KEYS) {
        const remote = await getUserState<string | typeof ABSENT>(`raw:${key}`, ABSENT);
        const local = localStorage.getItem(key);
        if (remote === ABSENT) {
          if (local !== null) await setUserState(`raw:${key}`, local).catch(() => undefined);
          known.set(key, local);
        } else if (remote !== local) {
          localStorage.setItem(key, remote);
          known.set(key, remote);
          window.dispatchEvent(new StorageEvent("storage", { key, newValue: remote, oldValue: local }));
        } else {
          known.set(key, local);
        }
      }
    };

    const push = () => {
      if (!userId || known.size === 0) return;
      for (const key of RAW_KEYS) {
        const local = localStorage.getItem(key);
        if (local !== null && local !== known.get(key)) {
          known.set(key, local);
          void setUserState(`raw:${key}`, local).catch(() => undefined);
        }
      }
    };

    const attach = (id: string | null) => {
      if (id === userId) return;
      unsubscribe?.();
      unsubscribe = null;
      known.clear();
      userId = id;
      if (!id) return;
      void pull();
      unsubscribe = subscribeUserStateChanges(id, () => void pull());
    };

    supabase.auth.getSession().then(({ data }) => attach(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => attach(session?.user?.id ?? null));
    const timer = window.setInterval(push, POLL_MS);
    const onHide = () => document.visibilityState === "hidden" && push();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      sub.subscription.unsubscribe();
      unsubscribe?.();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);
  return null;
}
