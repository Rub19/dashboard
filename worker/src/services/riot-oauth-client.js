import { httpError } from "../middleware/errors.js";
import { requestExternal } from "../utils/external-request.js";
import { signOAuthState, verifyOAuthState } from "../utils/oauth-state.js";
import { deleteOAuthToken, getOAuthToken, setOAuthToken } from "./supabase-client.js";

const RIOT_AUTH_ORIGIN = "https://auth.riotgames.com";
const DEFAULT_SCOPES = ["openid", "offline_access"];

export function isRiotOAuthConfigured(env) {
  return Boolean(env?.RIOT_RSO_CLIENT_ID && env?.RIOT_RSO_CLIENT_SECRET);
}

export async function getRiotOAuthStatus(env, userId) {
  const configured = isRiotOAuthConfigured(env);
  if (!configured) {
    return {
      available: false,
      approvalRequired: true,
      reason: "Coming soon — Riot approval required",
      connected: false,
    };
  }

  if (!userId) {
    return {
      available: true,
      approvalRequired: false,
      connected: false,
    };
  }

  try {
    const token = await getOAuthToken(env, userId, "riot");
    if (!token?.access_token) {
      return {
        available: true,
        approvalRequired: false,
        connected: false,
      };
    }

    const expiresAt = token.expires_at ? new Date(token.expires_at).getTime() : 0;
    const isExpired = expiresAt > 0 && expiresAt < Date.now();

    return {
      available: true,
      approvalRequired: false,
      connected: !isExpired,
      expiresAt: token.expires_at || null,
      scope: token.scope || "",
    };
  } catch {
    return {
      available: true,
      approvalRequired: false,
      connected: false,
    };
  }
}

export async function buildRiotAuthUrl(env, { userId, redirectUri, returnTo, scopes = DEFAULT_SCOPES }) {
  if (!isRiotOAuthConfigured(env)) {
    throw httpError("PROVIDER_NOT_CONFIGURED", 503, {
      detail: "Riot Sign On is pending official Riot Games production approval",
    });
  }

  const clientId = String(env.RIOT_RSO_CLIENT_ID);
  const finalRedirectUri = redirectUri || "https://ethone.dev/api/auth/callback/riot";
  const state = await signOAuthState(env, {
    userId,
    redirectUri: finalRedirectUri,
    returnTo: returnTo || "https://ethone.dev/settings/connections?service=riot",
  });

  const url = new URL("/authorize", RIOT_AUTH_ORIGIN);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", finalRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);

  return url.href;
}

export async function exchangeRiotCode(env, userId, { code, redirectUri }) {
  if (!isRiotOAuthConfigured(env)) {
    throw httpError("PROVIDER_NOT_CONFIGURED", 503, {
      detail: "Riot Sign On is pending official Riot Games production approval",
    });
  }

  const clientId = String(env.RIOT_RSO_CLIENT_ID);
  const clientSecret = String(env.RIOT_RSO_CLIENT_SECRET);
  const finalRedirectUri = redirectUri || "https://ethone.dev/api/auth/callback/riot";

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: finalRedirectUri,
  });

  const response = await requestExternal(new URL("/token", RIOT_AUTH_ORIGIN), {
    env,
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    service: "riot",
    expectedOrigin: RIOT_AUTH_ORIGIN,
    retries: 1,
  });

  const data = response?.data;
  if (!data?.access_token) {
    throw httpError("PROVIDER_REQUEST_REJECTED", 502, { detail: "Invalid token response from Riot" });
  }

  const expiresIn = Number(data.expires_in) || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  await setOAuthToken(env, userId, "riot", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || "",
    scope: data.scope || DEFAULT_SCOPES.join(" "),
    expiresAt,
  });

  let userInfo = null;
  try {
    const userinfoRes = await requestExternal(new URL("/userinfo", RIOT_AUTH_ORIGIN), {
      env,
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
      service: "riot",
      expectedOrigin: RIOT_AUTH_ORIGIN,
      retries: 1,
    });
    userInfo = userinfoRes?.data;
  } catch {}

  return {
    connected: true,
    puuid: userInfo?.sub || null,
    country: userInfo?.country || null,
    expiresAt,
  };
}

export async function exchangeRiotCallback(env, { code, state }) {
  const { userId, redirectUri, returnTo } = await verifyOAuthState(env, state);
  await exchangeRiotCode(env, userId, { code, redirectUri });
  return { userId, returnTo };
}

export async function disconnectRiot(env, userId) {
  if (!userId) return;
  await deleteOAuthToken(env, userId, "riot");
}
