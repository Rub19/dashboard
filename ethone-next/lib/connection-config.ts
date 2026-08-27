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
  portalUrl?: string;
  portalLabel?: string;
};

export const PUBLIC_FIELDS: Record<string, PublicFieldDef[]> = {
  discord: [{ key: "liveLanyardUserId", label: "ID Utilisateur Discord" }],
  steam: [
    { key: "liveSteamId", label: "Steam ID (64 bits)" },
    { key: "liveSteamAppId", label: "Steam App ID (optionnel)" },
  ],
  lastfm: [{ key: "liveLastfmUsername", label: "Nom d'utilisateur Last.fm" }],
  twitch: [{ key: "liveTwitchLogin", label: "Pseudo Twitch" }],
  riot: [
    { key: "liveTrackerRiotName", label: "Nom Riot (ex: Ruben)" },
    { key: "liveTrackerRiotTag", label: "Tag Riot (ex: EUW ou FR1)" },
  ],
  tracker: [
    { key: "liveTrackerApexPlatform", label: "Plateforme", options: ["origin", "xbl", "psn"] },
    { key: "liveTrackerApexIdentifier", label: "Identifiant Apex" },
  ],
  weather: [{ key: "liveWeatherCity", label: "Ville (Météo)" }],
  rss: [{ key: "liveRssUrl", label: "URL du flux RSS" }],
  minecraft: [{ key: "liveMinecraftUsername", label: "Pseudo Minecraft" }],
  bluesky: [{ key: "liveBlueskyHandle", label: "Handle Bluesky (ex: nom.bsky.social)" }],
  "lm-studio": [{ key: "liveLmStudioUrl", label: "URL LM Studio (ex: http://localhost:1234)" }],
  ollama: [{ key: "liveOllamaUrl", label: "URL Ollama (ex: http://localhost:11434)" }],
};

export const CREDENTIAL_FIELDS: Record<string, CredentialFieldDef[]> = {
  steam: [
    {
      key: "apiKey",
      label: "Clé Web API Steam",
      type: "password",
      portalUrl: "https://steamcommunity.com/dev/apikey",
      portalLabel: "Obtenir clé Steam",
    },
  ],
  lastfm: [
    {
      key: "apiKey",
      label: "Clé API Last.fm",
      type: "password",
      portalUrl: "https://www.last.fm/api/account/create",
      portalLabel: "Créer compte API",
    },
  ],
  twitch: [
    {
      key: "clientId",
      label: "Client ID Twitch",
      portalUrl: "https://dev.twitch.tv/console/apps",
      portalLabel: "Console Twitch",
    },
    { key: "clientSecret", label: "Client Secret Twitch", type: "password" },
  ],
  riot: [
    {
      key: "henrikApiKey",
      label: "Clé API Henrik (Valorant)",
      type: "password",
      portalUrl: "https://dash.henrikdev.xyz",
      portalLabel: "Obtenir clé Henrik",
    },
    {
      key: "riotApiKey",
      label: "Clé API Riot (League of Legends)",
      type: "password",
      portalUrl: "https://developer.riotgames.com/",
      portalLabel: "Portail Riot Games",
    },
  ],
  tracker: [
    {
      key: "apiKey",
      label: "Clé API Tracker Network",
      type: "password",
      portalUrl: "https://tracker.gg/developers",
      portalLabel: "Portail TRN",
    },
  ],
  openai: [
    {
      key: "apiKey",
      label: "Clé API OpenAI",
      type: "password",
      portalUrl: "https://platform.openai.com/api-keys",
      portalLabel: "Console OpenAI",
    },
  ],
  anthropic: [
    {
      key: "apiKey",
      label: "Clé API Anthropic (Claude)",
      type: "password",
      portalUrl: "https://console.anthropic.com/settings/keys",
      portalLabel: "Console Anthropic",
    },
  ],
  gemini: [
    {
      key: "apiKey",
      label: "Clé API Google Gemini",
      type: "password",
      portalUrl: "https://aistudio.google.com/app/apikey",
      portalLabel: "Google AI Studio",
    },
  ],
  groq: [
    {
      key: "apiKey",
      label: "Clé API Groq",
      type: "password",
      portalUrl: "https://console.groq.com/keys",
      portalLabel: "Console Groq",
    },
  ],
  plex: [
    { key: "url", label: "URL Plex (optionnel)" },
    {
      key: "apiKey",
      label: "Token Plex",
      type: "password",
      portalUrl: "https://app.plex.tv/desktop/#!/settings/account",
      portalLabel: "Compte Plex",
    },
  ],
  jellyfin: [
    { key: "url", label: "URL Jellyfin" },
    {
      key: "apiKey",
      label: "Clé API Jellyfin",
      type: "password",
      portalUrl: "https://jellyfin.org/docs/general/server/manage-users/",
      portalLabel: "Doc Jellyfin",
    },
  ],
  emby: [
    { key: "url", label: "URL Emby" },
    {
      key: "apiKey",
      label: "Clé API Emby",
      type: "password",
      portalUrl: "https://dev.emby.media/",
      portalLabel: "Doc Emby",
    },
  ],
  linear: [
    {
      key: "apiKey",
      label: "Token personnel Linear",
      type: "password",
      portalUrl: "https://linear.app/settings/api",
      portalLabel: "Paramètres API Linear",
    },
  ],
  clickup: [
    {
      key: "apiKey",
      label: "Token personnel ClickUp",
      type: "password",
      portalUrl: "https://app.clickup.com/settings/apps",
      portalLabel: "Paramètres ClickUp",
    },
  ],
  jira: [
    { key: "domain", label: "Domaine (ex: mondomaine.atlassian.net)" },
    { key: "email", label: "Email Atlassian" },
    {
      key: "apiKey",
      label: "Token API Jira",
      type: "password",
      portalUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
      portalLabel: "Tokens Atlassian",
    },
  ],
  gitlab: [
    {
      key: "apiKey",
      label: "Token personnel GitLab",
      type: "password",
      portalUrl: "https://gitlab.com/-/profile/personal_access_tokens",
      portalLabel: "Tokens GitLab",
    },
  ],
  obsidian: [
    { key: "url", label: "URL API locale (ex: http://localhost:27123)" },
    {
      key: "apiKey",
      label: "Token Obsidian",
      type: "password",
      portalUrl: "https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin",
      portalLabel: "Doc Obsidian",
    },
  ],
  vscode: [
    { key: "url", label: "URL VS Code Server / locale" },
    { key: "apiKey", label: "Token (optionnel)", type: "password" },
  ],
  fitbit: [
    {
      key: "apiKey",
      label: "Token Fitbit",
      type: "password",
      portalUrl: "https://dev.fitbit.com/apps",
      portalLabel: "Console Fitbit",
    },
  ],
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
    case "riot": {
      if (!settings.liveTrackerRiotName || !settings.liveTrackerRiotTag) return null;
      const cleanRiotName = settings.liveTrackerRiotName.trim();
      const cleanRiotTag = settings.liveTrackerRiotTag.trim().replace(/^#/, "");
      return { path: `/api/stats/valorant-profile?name=${q(cleanRiotName)}&tag=${q(cleanRiotTag)}` };
    }
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
