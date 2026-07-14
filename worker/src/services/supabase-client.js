import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

function projectOrigin(env) {
  let url;
  try {
    url = new URL(String(env.SUPABASE_URL || ""));
  } catch {
    return "";
  }
  return url.protocol === "https:" ? url.origin : "";
}

function serviceHeaders(secret) {
  const headers = {
    apikey: secret,
    "content-type": "application/json"
  };
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(secret)) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
}

export async function findPublicProfile(env, username) {
  const origin = projectOrigin(env);
  const secret = requireSecret(env, "SUPABASE_SECRET_KEY");
  if (!origin) throw new Error("Invalid Supabase project URL");
  const response = await requestExternal(new URL("/rest/v1/rpc/find_ethone_public_profile", origin), {
    env,
    expectedOrigin: origin,
    service: "supabase",
    dedupeKey: `public-profile:${username.toLowerCase()}`,
    method: "POST",
    headers: serviceHeaders(secret),
    body: JSON.stringify({ requested_username: username }),
    retries: 0,
    maxBytes: 128 * 1024
  });
  const source = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!source) return null;
  return Object.freeze({
    publicId: safeText(source.public_id, 80),
    username: safeText(source.username, 32),
    displayName: safeText(source.display_name, 80),
    avatarUrl: safePublicUrl(source.avatar_url, [new URL(origin).hostname])
  });
}
