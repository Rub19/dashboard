import { base64UrlBytes, decodeJwtPart } from "./crypto.js";

const MAX_AGE_SECONDS = 600;

function base64Url(value) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodePart(part) {
  return base64Url(JSON.stringify(part));
}

function stateSecret(env) {
  return env.OAUTH_STATE_SECRET || env.SUPABASE_JWT_SECRET || env.DISCORD_CLIENT_SECRET || "";
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signOAuthState(env, { userId, redirectUri, returnTo }) {
  const secret = stateSecret(env);
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Missing state signing secret");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    redirect_uri: redirectUri,
    return_to: returnTo,
    iat: nowSeconds,
    exp: nowSeconds + MAX_AGE_SECONDS,
    nbf: nowSeconds,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const input = `${encodePart(header)}.${encodePart(payload)}`;
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  const signatureBase64 = base64Url(String.fromCharCode(...new Uint8Array(signature)));
  return `${input}.${signatureBase64}`;
}

export async function verifyOAuthState(env, token) {
  const secret = stateSecret(env);
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("Missing state signing secret");
  }

  const segments = String(token || "").split(".");
  if (segments.length !== 3 || segments.some((s) => !s)) throw new Error("Invalid state token");

  const header = decodeJwtPart(segments[0]);
  const payload = decodeJwtPart(segments[1]);
  const signature = base64UrlBytes(segments[2]);
  if (!header || !payload || !signature || header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Invalid state token");
  }

  const input = new TextEncoder().encode(`${segments[0]}.${segments[1]}`);
  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify("HMAC", key, signature, input);
  if (!valid) throw new Error("Invalid state signature");

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("State token expired");
  if (typeof payload.nbf === "number" && payload.nbf > now) throw new Error("State token not yet valid");
  if (typeof payload.sub !== "string" || !payload.sub) throw new Error("Missing state subject");

  return {
    userId: payload.sub,
    redirectUri: typeof payload.redirect_uri === "string" ? payload.redirect_uri : "",
    returnTo: typeof payload.return_to === "string" ? payload.return_to : "",
  };
}
