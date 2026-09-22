"use client";

import { useEffect, useState } from "react";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const CACHE_TTL_MS = 60_000;
const BOT_GUILD_IDS_STORAGE_KEY = "ethone:discord:bot_guild_ids";

interface GuildLike {
  id: string;
}

function getStoredBotGuildIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOT_GUILD_IDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    }
  } catch {}
  return [];
}

function saveStoredBotGuildIds(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const existing = new Set(getStoredBotGuildIds());
    for (const id of ids) existing.add(id);
    localStorage.setItem(BOT_GUILD_IDS_STORAGE_KEY, JSON.stringify(Array.from(existing)));
  } catch {}
}

// Un seul appel par lot d'identifiants, partagé entre toutes les pages et tous les composants
// (sinon chaque page /discord/* refaisait le même appel à chaque montage).
const cache = new Map<string, { at: number; ids: string[] }>();
const inflight = new Map<string, Promise<string[]>>();

async function fetchPresent(key: string): Promise<string[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.ids;
  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/guild-presence?ids=${encodeURIComponent(key)}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      const json = await res.json();
      const ids: string[] = Array.isArray(json?.present) ? json.present.map(String) : [];
      cache.set(key, { at: Date.now(), ids });
      saveStoredBotGuildIds(ids);
      return ids;
    } catch {
      return [];
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  return promise;
}

/**
 * Identifiants des serveurs (parmi `guilds`) où le bot est présent.
 * `null` tant que la réponse n'est pas arrivée ; un tableau (éventuellement vide si le bot est
 * injoignable) ensuite, pour que les pages n'attendent jamais indéfiniment.
 */
export function useBotGuildIds(guilds: GuildLike[] | undefined | null): string[] | null {
  const key = (guilds ?? []).map((g) => g.id).join(",");
  const [ids, setIds] = useState<string[] | null>(() => {
    const hit = key ? cache.get(key) : undefined;
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.ids;
    const stored = getStoredBotGuildIds();
    if (stored.length > 0 && guilds && guilds.length > 0) {
      const guildIdSet = new Set(guilds.map((g) => g.id));
      const matching = stored.filter((id) => guildIdSet.has(id));
      if (matching.length > 0) return matching;
    }
    return null;
  });

  useEffect(() => {
    if (!key) return;
    if (!BOT_API_URL) {
      setIds((prev) => prev || []);
      return;
    }
    let cancelled = false;
    fetchPresent(key).then((present) => {
      if (!cancelled) {
        saveStoredBotGuildIds(present);
        const stored = getStoredBotGuildIds();
        const guildIdSet = new Set(key.split(",").filter(Boolean));
        const combined = Array.from(new Set([...present, ...stored.filter((id) => guildIdSet.has(id))]));
        setIds(combined);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return key ? ids : [];
}

/** Premier serveur où le bot est présent, sinon le premier de la liste. */
export function pickBotGuild<T extends GuildLike>(guilds: T[], botGuildIds: string[] | null): T | undefined {
  if (guilds.length === 0) return undefined;
  const withBot = botGuildIds ? guilds.find((g) => botGuildIds.includes(g.id)) : undefined;
  return withBot ?? guilds[0];
}

/**
 * Serveur à utiliser pour une page qui n'a pas de sélecteur : celui de l'adresse (`?guildId=`),
 * sinon le premier serveur où le bot est présent. Renvoie "" seulement si l'utilisateur n'a aucun
 * serveur connu : la page ne doit alors rien appeler.
 */
export function useResolvedGuildId(param: string | null | undefined, guilds: GuildLike[] | undefined | null): string {
  const botGuildIds = useBotGuildIds(guilds);
  if (param) return param;
  // Pendant que la présence du bot se charge, on propose le premier serveur connu (la liste vient du
  // cache local, donc immédiate) ; la page se recharge toute seule si un autre serveur est meilleur.
  return pickBotGuild(guilds ?? [], botGuildIds)?.id ?? "";
}
