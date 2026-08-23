import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

// Mojang shut down the api.mojang.com/sessionserver.mojang.com username lookup endpoints
// in September 2023. mowojang.matdoes.dev is a maintained drop-in mirror that serves the
// exact same request/response shape, so the rest of this module is unchanged.
const PROFILE_ORIGIN = "https://mowojang.matdoes.dev";
const SESSION_ORIGIN = "https://mowojang.matdoes.dev";
const NAME_HISTORY_ORIGIN = "https://uuid.legacyminecraft.com";
const ASHCON_ORIGIN = "https://api.ashcon.app";

function decodeTextures(properties) {
  const empty = Object.freeze({ skinUrl: "", capeUrl: "", model: "classic" });
  const texturesProperty = (Array.isArray(properties) ? properties : []).find((entry) => entry?.name === "textures");
  if (!texturesProperty?.value) return empty;
  try {
    const decoded = JSON.parse(atob(texturesProperty.value));
    const skinUrl = safePublicUrl(String(decoded?.textures?.SKIN?.url || "").replace(/^http:/, "https:"), ["minecraft.net"]);
    const capeUrl = safePublicUrl(String(decoded?.textures?.CAPE?.url || "").replace(/^http:/, "https:"), ["minecraft.net"]);
    const model = String(decoded?.textures?.SKIN?.metadata?.model || "classic").toLowerCase() === "slim" ? "slim" : "classic";
    return Object.freeze({ skinUrl, capeUrl, model });
  } catch {
    return empty;
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

  const textures = decodeTextures(profile.data?.properties);

  let nameHistory = [];
  const historySources = [SESSION_ORIGIN, NAME_HISTORY_ORIGIN];
  for (const origin of historySources) {
    try {
      const historyResponse = await requestExternal(new URL(`/user/profiles/${encodeURIComponent(uuid)}/names`, origin), {
        env,
        expectedOrigin: origin,
        service: "minecraft",
        dedupeKey: `history:${origin}:${uuid}`,
        retries: 1,
        maxBytes: 16 * 1024
      });
      if (Array.isArray(historyResponse.data) && historyResponse.data.length > 0) {
        nameHistory = historyResponse.data.map((entry) => Object.freeze({
          name: safeText(entry?.name, 16),
          changedAt: entry?.changedToAt ? new Date(entry.changedToAt).toISOString() : null
        })).filter((entry) => entry.name);
        break;
      }
    } catch {
      // try next fallback
    }
  }

  // Ashcon keeps a wider observed rename history when legacy caches are empty.
  if (nameHistory.length === 0) {
    try {
      const ashconResponse = await requestExternal(new URL(`/mojang/v2/user/${encodeURIComponent(username)}`, ASHCON_ORIGIN), {
        env,
        expectedOrigin: ASHCON_ORIGIN,
        service: "minecraft",
        dedupeKey: `ashcon:${username.toLowerCase()}`,
        retries: 1,
        maxBytes: 32 * 1024
      });
      if (Array.isArray(ashconResponse.data?.username_history) && ashconResponse.data.username_history.length > 0) {
        nameHistory = ashconResponse.data.username_history.map((entry) => Object.freeze({
          name: safeText(entry?.username, 16),
          changedAt: entry?.changed_at ? new Date(entry.changed_at).toISOString() : null
        })).filter((entry) => entry.name);
      }
    } catch {
      // no ashcon data either
    }
  }

  const uuidWithDashes = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;

  return Object.freeze({
    username: safeText(profile.data?.name || lookup.data?.name, 16),
    uuid,
    uuidWithDashes,
    skinUrl: textures.skinUrl || `https://nmsr.nickac.dev/skin/${encodeURIComponent(uuidWithDashes)}`,
    avatarUrl: `https://nmsr.nickac.dev/face/${encodeURIComponent(uuidWithDashes)}`,
    bodyUrl: `https://nmsr.nickac.dev/fullbody/${encodeURIComponent(uuidWithDashes)}`,
    capeUrl: textures.capeUrl,
    model: textures.model,
    nameHistory: Object.freeze(nameHistory)
  });
}
