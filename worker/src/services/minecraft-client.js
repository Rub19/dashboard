import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

// Mojang shut down the api.mojang.com/sessionserver.mojang.com username lookup endpoints
// in September 2023. mowojang.matdoes.dev is a maintained drop-in mirror that serves the
// exact same request/response shape, so the rest of this module is unchanged.
const PROFILE_ORIGIN = "https://mowojang.matdoes.dev";
const SESSION_ORIGIN = "https://mowojang.matdoes.dev";

function decodeSkinUrl(properties) {
  const texturesProperty = (Array.isArray(properties) ? properties : []).find((entry) => entry?.name === "textures");
  if (!texturesProperty?.value) return "";
  try {
    const decoded = JSON.parse(atob(texturesProperty.value));
    const url = String(decoded?.textures?.SKIN?.url || "").replace(/^http:/, "https:");
    return safePublicUrl(url, ["minecraft.net"]);
  } catch {
    return "";
  }
}

export async function getMinecraftProfile(env, username) {
  const lookupUrl = new URL(`/users/profiles/minecraft/${encodeURIComponent(username)}`, PROFILE_ORIGIN);
  const lookup = await requestExternal(lookupUrl, {
    env,
    expectedOrigin: PROFILE_ORIGIN,
    service: "minecraft",
    dedupeKey: `lookup:${username.toLowerCase()}`,
    retries: 1,
    maxBytes: 8 * 1024
  });
  const uuid = safeText(lookup.data?.id, 32);
  if (!uuid) throw httpError("PROVIDER_NOT_FOUND", 404);

  const profileUrl = new URL(`/session/minecraft/profile/${encodeURIComponent(uuid)}`, SESSION_ORIGIN);
  const profile = await requestExternal(profileUrl, {
    env,
    expectedOrigin: SESSION_ORIGIN,
    service: "minecraft",
    dedupeKey: `profile:${uuid}`,
    retries: 1,
    maxBytes: 16 * 1024
  });

  return Object.freeze({
    username: safeText(profile.data?.name || lookup.data?.name, 16),
    uuid,
    skinUrl: decodeSkinUrl(profile.data?.properties)
  });
}
