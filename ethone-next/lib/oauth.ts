import { fetchWorker } from "./api";

export const REDIRECT_URI = typeof window !== "undefined" ? window.location.origin + "/" : "https://ethone.dev/";

export const PROVIDERS: Record<string, { authUrl: string; exchangePath: string; scopes: string }> = {
  github: {
    authUrl: "https://github.com/login/oauth/authorize",
    exchangePath: "/api/github/oauth/exchange",
    scopes: "read:user",
  },
  "google-calendar": {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    exchangePath: "/api/google-calendar/oauth/exchange",
    scopes: "https://www.googleapis.com/auth/calendar.readonly",
  },
  "google-drive": {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    exchangePath: "/api/google-drive/oauth/exchange",
    scopes: "https://www.googleapis.com/auth/drive.readonly",
  },
  notion: {
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    exchangePath: "/api/notion/oauth/exchange",
    scopes: "",
  },
  todoist: {
    authUrl: "https://todoist.com/oauth/authorize",
    exchangePath: "/api/todoist/oauth/exchange",
    scopes: "data:read_write",
  },
  spotify: {
    authUrl: "https://accounts.spotify.com/authorize",
    exchangePath: "/api/spotify/oauth/exchange",
    scopes: "user-read-email user-read-recently-played",
  },
  youtube: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    exchangePath: "/api/youtube/oauth/exchange",
    scopes: "https://www.googleapis.com/auth/youtube.readonly",
  },
  reddit: {
    authUrl: "https://www.reddit.com/api/v1/authorize",
    exchangePath: "/api/reddit/oauth/exchange",
    scopes: "identity history",
  },
};

export function buildAuthUrl(provider: string, clientId: string, state?: object) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error("Unknown provider: " + provider);
  const url = new URL(cfg.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  const stateValue = state ? encodeURIComponent(JSON.stringify(state)) : provider;
  url.searchParams.set("state", stateValue);
  if (cfg.scopes) url.searchParams.set("scope", cfg.scopes);
  if (provider.startsWith("google")) {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

export async function exchangeCode(provider: string, code: string, clientId: string) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error("Unknown provider: " + provider);
  return fetchWorker(cfg.exchangePath, {
    method: "POST",
    body: JSON.stringify({ code, clientId }),
  });
}

export function parseOAuthState(value: string) {
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return { provider: value, clientId: "" };
  }
}
