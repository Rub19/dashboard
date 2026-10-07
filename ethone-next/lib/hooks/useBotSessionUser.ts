"use client";

import { useEffect, useState } from "react";

const BOT_API_URL = process.env.NEXT_PUBLIC_DISCORD_BOT_API || "";
const CACHE_TTL_MS = 60_000;

export type BotSessionUser = {
  id: string;
  username: string;
  globalName: string;
  avatarUrl: string;
};

type RawBotUser = {
  id?: string;
  username?: string;
  globalName?: string | null;
  avatar?: string | null;
};

let cached: { at: number; value: BotSessionUser | null } | null = null;
let inflight: Promise<BotSessionUser | null> | null = null;

function buildAvatarUrl(id: string, avatar: string | null | undefined): string {
  if (!id || !avatar) return "";
  const ext = avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${encodeURIComponent(id)}/${encodeURIComponent(avatar)}.${ext}?size=256`;
}

async function loadBotSessionUser(): Promise<BotSessionUser | null> {
  if (!BOT_API_URL) return null;
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${BOT_API_URL}/api/auth/me`, { credentials: "include" });
      if (!res.ok) return null;
      const json = (await res.json()) as { user?: RawBotUser };
      const u = json?.user;
      if (!u?.id) return null;
      return {
        id: u.id,
        username: u.username || "",
        globalName: u.globalName || u.username || "",
        avatarUrl: buildAvatarUrl(u.id, u.avatar),
      };
    } catch {
      return null;
    }
  })().then((value) => {
    cached = { at: Date.now(), value };
    inflight = null;
    return value;
  });
  return inflight;
}

export function useBotSessionUser(): BotSessionUser | null {
  const [user, setUser] = useState<BotSessionUser | null>(() =>
    cached && Date.now() - cached.at < CACHE_TTL_MS ? cached.value : null
  );

  useEffect(() => {
    let active = true;
    loadBotSessionUser().then((value) => {
      if (active) setUser(value);
    });
    return () => {
      active = false;
    };
  }, []);

  return user;
}
