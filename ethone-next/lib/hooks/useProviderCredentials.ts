"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWorker } from "@/lib/api";

export type ProviderCredential = {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  henrikApiKey?: string;
  riotApiKey?: string;
  url?: string;
  domain?: string;
  email?: string;
  token?: string;
};

const ALLOWED = new Set([
  "steam", "twitch", "lastfm", "henrik", "tracker", "tracker-gg", "tracker.gg",
  "riot", "riotgames", "valorant", "leagueoflegends", "openai", "anthropic",
  "gemini", "groq", "plex", "jellyfin", "emby", "bluesky", "linear", "clickup",
  "jira", "gitlab", "obsidian", "vscode", "fitbit", "discord", "spotify",
  "youtube", "reddit", "minecraft", "github", "notion", "todoist",
  "google-calendar", "google-drive", "email", "weather", "rss", "ollama", "lm-studio"
]);

export function useProviderCredentials() {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWorker("/api/provider-credentials");
      const providers = Array.isArray(res?.data?.providers) ? res.data.providers : [];
      const map: Record<string, boolean> = {};
      providers.forEach((p: string) => {
        map[p] = true;
      });

      // Also read local saved keys if available
      if (typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith("ethone:cred:")) {
            const parts = k.split(":");
            if (parts[2]) map[parts[2]] = true;
          }
        }
      }

      setConnected(map);
    } catch {
      const map: Record<string, boolean> = {};
      if (typeof window !== "undefined") {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith("ethone:cred:")) {
            const parts = k.split(":");
            if (parts[2]) map[parts[2]] = true;
          }
        }
      }
      setConnected(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(provider: string, credential: ProviderCredential) {
    // Save to localStorage immediately
    if (typeof window !== "undefined") {
      Object.entries(credential).forEach(([k, v]) => {
        if (v) localStorage.setItem(`ethone:cred:${provider}:${k}`, String(v));
      });
    }

    try {
      const res = await fetchWorker(`/api/provider-credentials?provider=${encodeURIComponent(provider)}`, {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      setConnected((c) => ({ ...c, [provider]: true }));
      return res?.data;
    } catch {
      setConnected((c) => ({ ...c, [provider]: true }));
      return { success: true };
    }
  }

  async function remove(provider: string) {
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(`ethone:cred:${provider}:`)) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
    try {
      await fetchWorker(`/api/provider-credentials?provider=${encodeURIComponent(provider)}`, { method: "DELETE" });
    } catch {}
    setConnected((c) => ({ ...c, [provider]: false }));
  }

  return { connected, loading, save, remove, reload: load };
}
