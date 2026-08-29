"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker, WORKER_URL } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export type DiscordConnection = {
  type: string;
  id: string;
  name: string;
  verified: boolean;
};

export type DiscordGuild = {
  id: string;
  name: string;
  owner: boolean;
  icon?: string;
  iconUrl: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  globalName: string;
  displayName: string;
  avatarUrl: string;
  avatarUrlSmall: string;
  bannerUrl: string;
  email: string;
  verified: boolean;
  premiumType: number;
};

export type DiscordProfile = {
  connected: boolean;
  mode?: "oauth2" | "lanyard";
  user?: DiscordUser;
  connections?: DiscordConnection[];
  guilds?: DiscordGuild[];
  syncedAt?: string;
};

export function useDiscordOAuth() {
  const [profile, setProfile] = useState<DiscordProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = `${WORKER_URL}/api/discord/oauth/callback`;
  const returnTo = typeof window !== "undefined" ? `${window.location.origin}/settings?discord=connected` : "/settings?discord=connected";

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session requise");
      const url = new URL("/api/discord/oauth/url", WORKER_URL);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("return_to", returnTo);
      const result = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!result.ok) throw new Error(`Worker ${result.status}`);
      const json = await result.json();
      const authUrl = json?.data?.authUrl;
      if (!authUrl || typeof authUrl !== "string") throw new Error("Lien Discord manquant");
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }, [redirectUri, returnTo]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    // 1. Direct client-side check if token exists in localStorage
    const localToken =
      typeof window !== "undefined"
        ? localStorage.getItem("ethone:token:discord") ||
          localStorage.getItem("ethone:cred:discord:accessToken")
        : null;

    if (localToken) {
      try {
        const [meRes, guildsRes] = await Promise.all([
          fetch("https://discord.com/api/v10/users/@me", {
            headers: { Authorization: `Bearer ${localToken}` },
          }),
          fetch("https://discord.com/api/v10/users/@me/guilds", {
            headers: { Authorization: `Bearer ${localToken}` },
          }).catch(() => null),
        ]);

        if (meRes.ok) {
          const u = await meRes.json();
          let guilds: DiscordGuild[] = [];
          if (guildsRes && guildsRes.ok) {
            const rawGuilds = await guildsRes.json();
            guilds = Array.isArray(rawGuilds)
              ? rawGuilds.map((g: { id: string; name: string; owner?: boolean; icon?: string }) => ({
                  id: g.id,
                  name: g.name,
                  owner: !!g.owner,
                  iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : "",
                }))
              : [];
          }

          const avatarUrl = u.avatar
            ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
            : `https://cdn.discordapp.com/embed/avatars/${(parseInt(u.discriminator || "0", 10) % 5) || 0}.png`;

          const profileData: DiscordProfile = {
            connected: true,
            mode: "oauth2",
            user: {
              id: u.id,
              username: u.username,
              globalName: u.global_name || u.username,
              displayName: u.global_name || u.username,
              avatarUrl,
              avatarUrlSmall: avatarUrl,
              bannerUrl: u.banner ? `https://cdn.discordapp.com/banners/${u.id}/${u.banner}.png` : "",
              email: u.email || "",
              verified: !!u.verified,
              premiumType: u.premium_type || 0,
            },
            guilds,
            syncedAt: new Date().toISOString(),
          };

          setProfile(profileData);
          setLoading(false);
          return;
        }
      } catch {}
    }

    try {
      const result = await fetchWorker("/api/discord/oauth/profile");
      setProfile(result?.data || { connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProfile({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWorker("/api/discord/oauth/refresh");
      setProfile(result?.data || { connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchWorker("/api/discord/oauth/disconnect", { method: "POST" });
      setProfile({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    connect,
    disconnect,
    refresh,
    refetch: fetchProfile,
  };
}
