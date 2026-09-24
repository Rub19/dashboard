"use client";

import { useEffect, useState } from "react";
import { subscribeGuildLive } from "@/lib/guildLive";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";

/**
 * Interrupteur général de chaque module d'un serveur (vrai état côté bot, pas une valeur locale). Se met à jour tout
 * seul quand une configuration change, que ce soit depuis le dashboard ou depuis Discord. Un module absent du résultat
 * n'a pas d'interrupteur unique : aucune pastille n'est alors affichée.
 */
export function useModuleStatus(guildId: string | undefined, active: boolean): Record<string, boolean> {
  const [status, setStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!guildId || !active || !BOT_API_URL) {
      setStatus({});
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = () => {
      fetch(`${BOT_API_URL}/api/guilds/${encodeURIComponent(guildId)}/module-status`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data?.modules && typeof data.modules === "object") setStatus(data.modules as Record<string, boolean>);
        })
        .catch(() => {
          // bot injoignable : on garde l'état précédent, sans pastille inventée
        });
    };
    load();
    const unsubscribe = subscribeGuildLive(guildId, (event) => {
      if (event.type !== "CONFIG_UPDATED") return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 300);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [guildId, active]);

  return status;
}
