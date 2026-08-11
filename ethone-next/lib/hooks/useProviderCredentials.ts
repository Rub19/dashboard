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

const ALLOWED = new Set(["steam", "twitch", "lastfm", "henrik", "tracker", "riot", "openai", "anthropic", "gemini", "groq", "plex", "jellyfin", "emby", "bluesky", "linear", "clickup", "jira", "gitlab", "obsidian", "vscode", "fitbit"]);

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
        if (ALLOWED.has(p)) map[p] = true;
      });
      setConnected(map);
    } catch {
      setConnected({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(provider: string, credential: ProviderCredential) {
    if (!ALLOWED.has(provider)) throw new Error("unsupported provider");
    const res = await fetchWorker(`/api/provider-credentials?provider=${encodeURIComponent(provider)}`, {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    setConnected((c) => ({ ...c, [provider]: true }));
    return res?.data;
  }

  async function remove(provider: string) {
    if (!ALLOWED.has(provider)) throw new Error("unsupported provider");
    await fetchWorker(`/api/provider-credentials?provider=${encodeURIComponent(provider)}`, { method: "DELETE" });
    setConnected((c) => ({ ...c, [provider]: false }));
  }

  return { connected, loading, save, remove, reload: load };
}
