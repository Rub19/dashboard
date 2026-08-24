"use client";

import { fetchWorker } from "@/lib/api";
import type { Integration } from "@/lib/integrations";
import type { Settings } from "@/lib/settings";
import type { ProviderCredential } from "@/lib/hooks/useProviderCredentials";

export type PublicFieldDef = {
  key: keyof Settings;
  label: string;
  type?: string;
  options?: string[];
};

export type CredentialFieldDef = {
  key: keyof ProviderCredential;
  label: string;
  type?: string;
};

export const PUBLIC_FIELDS: Record<string, PublicFieldDef[]> = {
  discord: [{ key: "liveLanyardUserId", label: "liveLanyardUserId" }],
  steam: [
    { key: "liveSteamId", label: "liveSteamId" },
    { key: "liveSteamAppId", label: "liveSteamAppId" },
  ],
  lastfm: [{ key: "liveLastfmUsername", label: "liveLastfmUsername" }],
  twitch: [{ key: "liveTwitchLogin", label: "liveTwitchLogin" }],
  riot: [
    { key: "liveTrackerRiotName", label: "liveTrackerRiotName" },
    { key: "liveTrackerRiotTag", label: "liveTrackerRiotTag" },
  ],
  tracker: [
    { key: "liveTrackerApexPlatform", label: "liveTrackerApexPlatform", options: ["origin", "xbl", "psn"] },
    { key: "liveTrackerApexIdentifier", label: "liveTrackerApexIdentifier" },
  ],
  weather: [{ key: "liveWeatherCity", label: "liveWeatherCity" }],
  rss: [{ key: "liveRssUrl", label: "liveRssUrl" }],
  minecraft: [{ key: "liveMinecraftUsername", label: "liveMinecraftUsername" }],
  bluesky: [{ key: "liveBlueskyHandle", label: "liveBlueskyHandle" }],
  "lm-studio": [{ key: "liveLmStudioUrl", label: "liveLmStudioUrl" }],
  ollama: [{ key: "liveOllamaUrl", label: "liveOllamaUrl" }],
};

export const CREDENTIAL_FIELDS: Record<string, CredentialFieldDef[]> = {
  steam: [{ key: "apiKey", label: "apiKey", type: "password" }],
  lastfm: [{ key: "apiKey", label: "apiKey", type: "password" }],
  twitch: [
    { key: "clientId", label: "clientId" },
    { key: "clientSecret", label: "clientSecret", type: "password" },
  ],
  riot: [
    { key: "henrikApiKey", label: "henrikApiKey", type: "password" },
    { key: "riotApiKey", label: "riotApiKey", type: "password" },
  ],
  tracker: [{ key: "apiKey", label: "apiKey", type: "password" }],
  openai: [{ key: "apiKey", label: "apiKey", type: "password" }],
  anthropic: [{ key: "apiKey", label: "apiKey", type: "password" }],
  gemini: [{ key: "apiKey", label: "apiKey", type: "password" }],
  groq: [{ key: "apiKey", label: "apiKey", type: "password" }],
  plex: [
    { key: "url", label: "URL Plex (optionnel)" },
    { key: "apiKey", label: "Token Plex", type: "password" },
  ],
  jellyfin: [
    { key: "url", label: "URL Jellyfin" },
    { key: "apiKey", label: "Clé API Jellyfin", type: "password" },
  ],
  emby: [
    { key: "url", label: "URL Emby" },
    { key: "apiKey", label: "Clé API Emby", type: "password" },
  ],
  linear: [{ key: "apiKey", label: "Token personnel Linear", type: "password" }],
  clickup: [{ key: "apiKey", label: "Token personnel ClickUp", type: "password" }],
  jira: [
    { key: "domain", label: "Domaine (ex: mondomaine.atlassian.net)" },
    { key: "email", label: "Email Atlassian" },
    { key: "apiKey", label: "Token API Jira", type: "password" },
  ],
  gitlab: [{ key: "apiKey", label: "Token personnel GitLab", type: "password" }],
  obsidian: [
    { key: "url", label: "URL API locale (ex: http://localhost:27123)" },
    { key: "apiKey", label: "Token Obsidian", type: "password" },
  ],
  vscode: [
    { key: "url", label: "URL VS Code Server / locale" },
    { key: "apiKey", label: "Token (optionnel)", type: "password" },
  ],
  fitbit: [{ key: "apiKey", label: "Token Fitbit", type: "password" }],
};

export function isApiConfigured(
  integration: { id: string },
  settings: Settings,
  credentialConnected: Record<string, boolean>
): boolean {
  const publicFields = PUBLIC_FIELDS[integration.id] || [];
  const credentialFields = CREDENTIAL_FIELDS[integration.id] || [];
  const hasPublic = publicFields.length > 0
    ? publicFields.every((f) => {
        const value = settings[f.key];
        return typeof value === "string" && value.trim().length > 0;
      })
    : true;
  const hasCredential = credentialFields.length > 0
    ? credentialConnected[integration.id] === true
    : true;
  return hasPublic && hasCredential;
}

export function isConfigured(
  integration: { id: string; status: string },
  settings: Settings,
  credentialConnected: Record<string, boolean>,
  oauthConnected: Record<string, boolean>
): boolean {
  if (integration.status === "restricted" || integration.status === "limited") return false;
  const publicFields = PUBLIC_FIELDS[integration.id] || [];
  const credentialFields = CREDENTIAL_FIELDS[integration.id] || [];
  if (publicFields.length === 0 && credentialFields.length === 0) {
    if (integration.status === "oauth") return oauthConnected[integration.id] === true;
    return false;
  }
  return isApiConfigured(integration, settings, credentialConnected);
}

export type PingRequest = {
  path: string;
  method?: "GET" | "POST";
  body?: string;
};

export type PingResult = {
  ok: boolean;
  status: "connected" | "unconfigured" | "error" | "unavailable";
  ms: number;
  data?: unknown;
  error?: string;
};

function q(value: string) {
  return encodeURIComponent(value);
}

export function buildPingRequest(
  integration: Integration,
  settings: Settings,
  clientIds: Record<string, string>
): PingRequest | null {
  const clientId = clientIds[integration.id] || "";

  switch (integration.id) {
    case "spotify":
      if (!clientId) return null;
      return { path: `/api/spotify/now-playing?clientId=${q(clientId)}` };
    case "youtube":
      if (!clientId) return null;
      return { path: `/api/youtube/activity?clientId=${q(clientId)}` };
    case "reddit":
      if (!clientId) return null;
      return { path: `/api/reddit/activity?clientId=${q(clientId)}` };
    case "google-calendar":
      if (!clientId) return null;
      return { path: `/api/calendar/events?clientId=${q(clientId)}` };
    case "google-drive":
      if (!clientId) return null;
      return { path: `/api/google-drive/files?clientId=${q(clientId)}` };
    case "github":
      return { path: "/api/github/profile" };
    case "notion":
      return { path: "/api/notion/pages" };
    case "todoist":
      return { path: "/api/todoist/tasks" };
    case "twitch":
      if (!settings.liveTwitchLogin) return null;
      return { path: `/api/twitch/channel?login=${q(settings.liveTwitchLogin)}` };
    case "lastfm":
      if (!settings.liveLastfmUsername) return null;
      return { path: `/api/lastfm/recent-tracks?username=${q(settings.liveLastfmUsername)}` };
    case "steam":
      if (!settings.liveSteamId) return null;
      return { path: `/api/steam/player?steamId=${q(settings.liveSteamId)}` };
    case "riot":
      if (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) return null;
      return { path: `/api/stats/valorant-profile?name=${q(settings.liveTrackerRiotName)}&tag=${q(settings.liveTrackerRiotTag)}` };
    case "minecraft":
      if (!settings.liveMinecraftUsername) return null;
      return { path: `/api/minecraft/profile?username=${q(settings.liveMinecraftUsername)}` };
    case "weather":
      if (!settings.liveWeatherCity) return null;
      return { path: `/api/weather?city=${q(settings.liveWeatherCity)}` };
    case "rss":
      if (!settings.liveRssUrl) return null;
      return { path: `/api/rss?url=${q(settings.liveRssUrl)}` };
    case "discord":
      if (!settings.liveLanyardUserId) return null;
      return { path: `/api/lanyard/presence?userId=${q(settings.liveLanyardUserId)}` };
    case "bluesky":
      if (!settings.liveBlueskyHandle) return null;
      return { path: `/api/catalog/profile?provider=bluesky&handle=${q(settings.liveBlueskyHandle)}` };
    case "plex":
    case "jellyfin":
    case "emby":
    case "linear":
    case "clickup":
    case "jira":
    case "gitlab":
    case "obsidian":
    case "vscode":
    case "fitbit":
      return { path: `/api/catalog/profile?provider=${q(integration.id)}` };
    case "openai":
    case "anthropic":
    case "gemini":
    case "groq":
      return {
        path: "/api/brain/complete",
        method: "POST",
        body: JSON.stringify({ provider: integration.id, operation: "diagnostic" }),
      };
    case "lm-studio":
      if (!settings.liveLmStudioUrl) return null;
      return {
        path: "/api/brain/complete",
        method: "POST",
        body: JSON.stringify({ provider: "lm-studio", operation: "diagnostic", baseUrl: settings.liveLmStudioUrl }),
      };
    case "ollama":
      if (!settings.liveOllamaUrl) return null;
      return {
        path: "/api/brain/complete",
        method: "POST",
        body: JSON.stringify({ provider: "ollama", operation: "diagnostic", baseUrl: settings.liveOllamaUrl }),
      };
    default:
      return null;
  }
}

export async function pingIntegration(
  integration: Integration,
  settings: Settings,
  clientIds: Record<string, string>,
  credentialConnected: Record<string, boolean>,
  oauthConnected: Record<string, boolean>
): Promise<PingResult> {
  if (!isConfigured(integration, settings, credentialConnected, oauthConnected)) {
    return { ok: false, status: "unconfigured", ms: 0 };
  }

  const request = buildPingRequest(integration, settings, clientIds);
  if (!request) {
    return { ok: false, status: "unconfigured", ms: 0 };
  }

  const start = typeof performance !== "undefined" ? performance.now() : 0;
  try {
    const res = await fetchWorker(request.path, {
      method: request.method || "GET",
      body: request.body,
    });
    const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
    const data = res?.data ?? res;

    let ok = true;
    if (data === null || data === undefined) ok = false;
    if (typeof data === "object" && data !== null) {
      if ("ok" in data && data.ok === false) ok = false;
      if ("reachable" in data && data.reachable === false) ok = false;
    }

    return {
      ok,
      status: ok ? "connected" : "error",
      ms,
      data,
      error: ok ? undefined : "Service returned empty or negative response",
    };
  } catch (err) {
    const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
    return {
      ok: false,
      status: "error",
      ms,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getServiceMethodKey(status: string): string {
  if (status === "oauth") return "oauth";
  if (status === "api") return "api";
  if (status === "local") return "local";
  if (status === "feed") return "feed";
  if (status === "restricted") return "restricted";
  if (status === "limited") return "limited";
  return "local";
}
