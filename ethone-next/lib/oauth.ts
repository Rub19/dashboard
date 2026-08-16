import { fetchWorker } from "./api";

export const REDIRECT_URI = typeof window !== "undefined" ? window.location.origin + "/" : "https://ethone.dev/";

// Public OAuth app Client IDs. Client secrets remain exclusively in the Worker.
const GOOGLE_CLIENT_ID = "644274299172-hsan3pc3a2fri6p5m4olmeiont98dk15.apps.googleusercontent.com";

export const OAUTH_APP_CLIENT_IDS: Record<string, string> = {
  spotify: "6619fbf6315e4e68948dc08532251912",
  github: "Ov23li7gnklQJ7ipkgZG",
  "google-calendar": GOOGLE_CLIENT_ID,
  notion: "3aad872b-594c-81d4-84e4-00377bd542e3",
  todoist: "498125e861a443339edf551bb605413e",
  "google-drive": GOOGLE_CLIENT_ID,
  youtube: GOOGLE_CLIENT_ID,
  reddit: "",
};

export function oauthClientId(provider: string): string {
  return OAUTH_APP_CLIENT_IDS[provider] || "";
}

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

export async function exchangeCode(provider: string, code: string, clientId: string, clientSecret?: string) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error("Unknown provider: " + provider);
  const body: Record<string, string> = { code, clientId };
  if (clientSecret) body.clientSecret = clientSecret;
  return fetchWorker(cfg.exchangePath, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function parseOAuthState(value: string) {
  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return { provider: value, clientId: "" };
  }
}
