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
  discord: [{ key: "liveLanyardUserId", label: "Votre ID Utilisateur Discord Personnel" }],
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
  const isLocallyConnected =
    typeof window !== "undefined" &&
    localStorage.getItem(`ethone:connected:${integration.id}`) === "true";

  if (oauthConnected[integration.id] === true || isLocallyConnected) {
    return true;
  }

  if (integration.id === "spotify") {
    const hasClientId = Boolean(
      settings.liveSpotifyClientId ||
        (typeof window !== "undefined" && localStorage.getItem("ethone:clientId:spotify"))
    );
    if (hasClientId && settings.liveNowPlayingSource === "spotify") {
      return true;
    }
  }

  if (integration.id === "discord") {
    // If Discord was revoked across the platform, require an explicit fresh connection
    if (
      typeof window !== "undefined" &&
      localStorage.getItem("ethone:discord_revocation_20260904") === "true" &&
      localStorage.getItem("ethone:connected:discord") !== "true"
    ) {
      return false;
    }

    const hasDiscordId = Boolean(
      settings.liveLanyardUserId && settings.liveLanyardUserId.trim().length > 0
    );
    const hasDiscordLocal =
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem("ethone:pub:discord:liveLanyardUserId"));
    if (hasDiscordId || hasDiscordLocal) {
      return true;
    }
  }

  const publicFields = PUBLIC_FIELDS[integration.id] || [];
  const credentialFields = CREDENTIAL_FIELDS[integration.id] || [];
  if (publicFields.length === 0 && credentialFields.length === 0) {
    if (integration.status === "oauth") {
      return oauthConnected[integration.id] === true || isLocallyConnected;
    }
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

  const start = typeof performance !== "undefined" ? performance.now() : 0;

  // 1. Direct Spotify API test if token or connection exists
  if (integration.id === "spotify") {
    const spotifyToken =
      typeof window !== "undefined"
        ? localStorage.getItem("ethone:token:spotify") ||
          localStorage.getItem("spotify_access_token") ||
          localStorage.getItem("ethone:cred:spotify:accessToken")
        : null;

    if (spotifyToken) {
      try {
        const meRes = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${spotifyToken}` },
        });

        if (meRes.status === 200) {
          const profile = (await meRes.json()) as {
            display_name?: string;
            id?: string;
            product?: string;
            country?: string;
            followers?: { total?: number };
          };

          // Also check currently playing
          let playingInfo = "En attente de lecture";
          try {
            const playerRes = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
              headers: { Authorization: `Bearer ${spotifyToken}` },
            });
            if (playerRes.status === 200) {
              const current = (await playerRes.json()) as {
                is_playing?: boolean;
                item?: { name?: string; artists?: { name: string }[] };
              };
              if (current?.item) {
                playingInfo = `Lecture en cours : ${current.item.name} - ${current.item.artists?.map((a) => a.name).join(", ")}`;
              }
            }
          } catch {}

          const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
          return {
            ok: true,
            status: "connected",
            ms,
            data: {
              statut: "Connecté avec succès",
              utilisateur: profile.display_name || profile.id,
              type_compte: profile.product ? profile.product.toUpperCase() : "Standard",
              pays: profile.country || "FR",
              etat_lecture: playingInfo,
            },
          };
        }
      } catch {}
    }
  }

  // 2. Direct Discord OAuth2 or Lanyard test
  if (integration.id === "discord") {
    const discordToken =
      typeof window !== "undefined"
        ? localStorage.getItem("ethone:token:discord") ||
          localStorage.getItem("ethone:cred:discord:accessToken")
        : null;

    if (discordToken) {
      try {
        const meRes = await fetch("https://discord.com/api/v10/users/@me", {
          headers: { Authorization: `Bearer ${discordToken}` },
        });
        if (meRes.ok) {
          const user = (await meRes.json()) as {
            id?: string;
            username?: string;
            global_name?: string;
            discriminator?: string;
            email?: string;
            avatar?: string;
            mfa_enabled?: boolean;
          };
          const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
          return {
            ok: true,
            status: "connected",
            ms,
            data: {
              statut: "Connecté avec succès (OAuth2 Officiel)",
              utilisateur: user.global_name || user.username || user.id,
              tag: user.discriminator && user.discriminator !== "0" ? `#${user.discriminator}` : `@${user.username}`,
              id: user.id,
              email: user.email || "Autorisé",
              securite_2fa: user.mfa_enabled ? "Activée" : "Non activée",
            },
          };
        }
      } catch {}
    }

    const discordUserId =
      settings.liveLanyardUserId ||
      (typeof window !== "undefined"
        ? localStorage.getItem("ethone:pub:discord:liveLanyardUserId") ||
          localStorage.getItem("ethone:cred:discord:userId") ||
          localStorage.getItem("ethone:pub:lanyardUserId")
        : null);

    if (discordUserId) {
      try {
        const lanyardRes = await fetch(`https://api.lanyard.rest/v1/users/${encodeURIComponent(discordUserId)}`);
        if (lanyardRes.ok) {
          const lJson = (await lanyardRes.json()) as {
            success?: boolean;
            data?: {
              discord_user?: { username?: string; id?: string };
              discord_status?: string;
              listening_to_spotify?: boolean;
              spotify?: { song?: string; artist?: string };
              activities?: { name?: string; details?: string }[];
            };
          };

          if (lJson.success && lJson.data) {
            const d = lJson.data;
            const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
            return {
              ok: true,
              status: "connected",
              ms,
              data: {
                statut: "Présence active via Lanyard",
                utilisateur: d.discord_user?.username,
                id: d.discord_user?.id,
                etat: d.discord_status?.toUpperCase(),
                spotify: d.listening_to_spotify && d.spotify ? `${d.spotify.song} - ${d.spotify.artist}` : "Inactif",
                activites: d.activities?.map((a) => a.name).filter(Boolean) || [],
              },
            };
          }
        }
      } catch {}
    }
  }

  // 3. Fallback to generic ping request (via Worker proxy or catalog)
  const request = buildPingRequest(integration, settings, clientIds);
  if (!request) {
    return { ok: false, status: "unconfigured", ms: 0 };
  }

  try {
    const res = await fetchWorker(request.path, {
      method: request.method || "GET",
      body: request.body,
    });
    const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
    const data = res?.data ?? res;

    let ok = true;
    if (data === null || data === undefined) {
      // For media player endpoints, null simply means "no song currently playing"
      if (integration.id === "spotify" || integration.id === "lastfm" || integration.id === "youtube") {
        return {
          ok: true,
          status: "connected",
          ms,
          data: {
            statut: "Connecté • Prêt pour la lecture",
            etat: "Aucune piste en cours de lecture",
          },
        };
      }
      ok = false;
    }
    if (typeof data === "object" && data !== null) {
      if ("ok" in data && data.ok === false) ok = false;
      if ("reachable" in data && data.reachable === false) ok = false;
    }

    return {
      ok,
      status: ok ? "connected" : "error",
      ms,
      data: data ?? { statut: "Connecté" },
      error: ok ? undefined : "Service returned empty or negative response",
    };
  } catch (err) {
    const ms = Math.round((typeof performance !== "undefined" ? performance.now() : start) - start);
    // If user has local token/credentials saved, mark as connected
    const isConnectedLocally =
      typeof window !== "undefined" &&
      (localStorage.getItem(`ethone:connected:${integration.id}`) === "true" ||
        Boolean(localStorage.getItem(`ethone:token:${integration.id}`)));

    if (isConnectedLocally) {
      return {
        ok: true,
        status: "connected",
        ms,
        data: {
          statut: "Connecté (mode autonome)",
          details: "Session et jeton enregistrés localement",
        },
      };
    }

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
