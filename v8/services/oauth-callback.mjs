const SESSION_KEY = "ethone:oauth-pending";

function base64UrlEncode(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateRandomToken(runtime = globalThis, length = 64) {
  const bytes = new Uint8Array(length);
  (runtime.crypto || globalThis.crypto).getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function codeChallengeFor(verifier, runtime = globalThis) {
  const digest = await (runtime.crypto || globalThis.crypto).subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function beginOAuthAuthorize(options = {}, runtime = globalThis) {
  const { provider, clientId, authorizeUrl, scope, extraParams = {}, pkce = false } = options;
  if (!provider || !clientId || !authorizeUrl) return false;
  const state = generateRandomToken(runtime, 24);
  const pending = { provider, state, clientId };
  let challenge = "";
  if (pkce) {
    pending.verifier = generateRandomToken(runtime, 64).slice(0, 128);
    challenge = await codeChallengeFor(pending.verifier, runtime);
  }
  try {
    runtime.sessionStorage?.setItem(SESSION_KEY, JSON.stringify(pending));
  } catch {
    return false;
  }
  const url = new URL(authorizeUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", new URL("./", runtime.location.href).href);
  url.searchParams.set("state", state);
  if (scope) url.searchParams.set("scope", scope);
  if (pkce) {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", challenge);
  }
  Object.entries(extraParams).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  runtime.location.assign(url.href);
  return true;
}

export function readPendingOAuthAuthorize(runtime = globalThis) {
  try {
    const raw = runtime.sessionStorage?.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingOAuthAuthorize(runtime = globalThis) {
  try { runtime.sessionStorage?.removeItem(SESSION_KEY); } catch {}
}

export function consumeOAuthCallback(runtime = globalThis) {
  let url;
  try {
    url = new URL(runtime.location.href);
  } catch {
    return null;
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (!code && !error) return null;
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  const cleanUrl = `${url.pathname}${url.search}${url.hash}`;
  try { runtime.history?.replaceState?.(null, "", cleanUrl); } catch {}
  return Object.freeze({ code, state, error });
}
