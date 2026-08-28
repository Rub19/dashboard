import { fetchWorker } from "./api";

export const REDIRECT_URI = typeof window !== "undefined" ? window.location.origin + "/" : "https://ethone.dev/";

// PKCE helpers for providers that require it (Spotify public app)
function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return base64UrlEncode(array);
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(verifier));
}

export async function startOAuthConnect(provider: string, clientId: string, state?: object) {
  const stateValue = state || { provider, clientId };
  let codeChallenge: string | undefined;
  if (provider === "spotify") {
    const verifier = generateCodeVerifier();
    codeChallenge = await generateCodeChallenge(verifier);
    try {
      localStorage.setItem(`ethone:oauth:verifier:${provider}`, verifier);
    } catch {}
  }
  return buildAuthUrl(provider, clientId, stateValue, codeChallenge);
}

// Public OAuth app Client IDs. Client secrets remain exclusively in the Worker.
const GOOGLE_CLIENT_ID = "644274299172-hsan3pc3a2fri6p5m4olmeiont98dk15.apps.googleusercontent.com";

export const OAUTH_APP_CLIENT_IDS: Record<string, string> = {
  spotify: "6619fbf6315e4e68948dc08532251912",
  github: "Ov23li7gnklQJ7ipkgZG",
  discord: "1339597090232078376",
  "google-calendar": GOOGLE_CLIENT_ID,
  notion: "3aad872b-594c-81d4-84e4-00377bd542e3",
  todoist: "498125e861a443339edf551bb605413e",
  "google-drive": GOOGLE_CLIENT_ID,
  youtube: GOOGLE_CLIENT_ID,
  reddit: "",
  twitch: "",
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
  discord: {
    authUrl: "https://discord.com/api/oauth2/authorize",
    exchangePath: "/api/discord/oauth/exchange",
    scopes: "identify email guilds",
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
    scopes: "user-read-email user-read-currently-playing user-read-playback-state user-read-recently-played user-library-read user-library-modify user-modify-playback-state",
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
  twitch: {
    authUrl: "https://id.twitch.tv/oauth2/authorize",
    exchangePath: "/api/twitch/oauth/exchange",
    scopes: "user:read:email user:read:follows",
  },
};

export function buildAuthUrl(provider: string, clientId: string, state?: object, codeChallenge?: string) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error("Unknown provider: " + provider);
  const url = new URL(cfg.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  const stateValue = state ? JSON.stringify(state) : provider;
  url.searchParams.set("state", stateValue);
  if (cfg.scopes) url.searchParams.set("scope", cfg.scopes);
  if (codeChallenge) {
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", codeChallenge);
  }
  if (provider === "spotify") {
    url.searchParams.set("show_dialog", "true");
  }
  if (provider.startsWith("google")) {
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }
  return url.toString();
}

export async function exchangeCode(
  provider: string,
  code: string,
  clientId: string,
  token?: string | { clientSecret?: string; codeVerifier?: string }
) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new Error("Unknown provider: " + provider);
  const body: Record<string, string> = { code, clientId, redirectUri: REDIRECT_URI };
  if (token) {
    if (typeof token === "string") {
      body.clientSecret = token;
    } else {
      if (token.clientSecret) body.clientSecret = token.clientSecret;
      if (token.codeVerifier) body.codeVerifier = token.codeVerifier;
    }
  }
  return fetchWorker(cfg.exchangePath, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function parseOAuthState(value: string) {
  try {
    let raw = value;
    try {
      raw = decodeURIComponent(raw);
    } catch {}
    try {
      raw = decodeURIComponent(raw);
    } catch {}
    return JSON.parse(raw);
  } catch {
    return { provider: value, clientId: "" };
  }
}
