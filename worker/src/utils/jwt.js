function base64Url(value) {
  const base64 = btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return base64;
}

function encodeJwtPart(part) {
  return base64Url(JSON.stringify(part));
}

export async function signServiceToken(env, userId, sessionId = null, ttlSeconds = 3600) {
  const secret = env.SUPABASE_JWT_SECRET;
  if (typeof secret !== "string" || secret.length < 32) throw new Error("Missing JWT signing secret");

  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    role: "authenticated",
    aud: "authenticated",
    iss: `${supabaseUrl}/auth/v1`,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    nbf: nowSeconds
  };
  if (sessionId) payload.session_id = sessionId;

  const header = { alg: "HS256", typ: "JWT" };
  const input = `${encodeJwtPart(header)}.${encodeJwtPart(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  const signatureBase64 = base64Url(String.fromCharCode(...new Uint8Array(signature)));
  return `${input}.${signatureBase64}`;
}
