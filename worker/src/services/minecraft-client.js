import { requestExternal } from "../utils/external-request.js";
import { httpError } from "../middleware/errors.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

// Plusieurs sources, la première qui répond gagne : PlayerDB (hébergé chez Cloudflare, joignable depuis un Worker, une
// seule réponse avec pseudo + textures), puis l'API officielle Mojang (qui refuse souvent les IP de Cloudflare), puis
// le miroir mowojang. Avant, seul le miroir était utilisé : en panne (HTTP 521), la carte Minecraft était cassée.
const PLAYERDB_ORIGIN = "https://playerdb.co";
const LOOKUP_SOURCES = [
  { origin: "https://api.minecraftservices.com", path: (name) => `/minecraft/profile/lookup/name/${encodeURIComponent(name)}` },
  { origin: "https://mowojang.matdoes.dev", path: (name) => `/users/profiles/minecraft/${encodeURIComponent(name)}` },
];
const SESSION_SOURCES = ["https://sessionserver.mojang.com", "https://mowojang.matdoes.dev"];
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

/** Première source qui répond ; un « introuvable » (404) est une vraie réponse, pas une panne : on s'arrête. */
async function firstAvailable(attempts) {
  let lastError;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      if (error?.status === 404) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

/** PlayerDB renvoie pseudo, identifiant et textures en une fois : adapté au format Mojang ({ id, name, properties }). */
async function playerDbProfile(env, username) {
  const res = await requestExternal(new URL(`/api/player/minecraft/${encodeURIComponent(username)}`, PLAYERDB_ORIGIN), {
    env,
    expectedOrigin: PLAYERDB_ORIGIN,
    service: "minecraft",
    dedupeKey: `playerdb:${username.toLowerCase()}`,
    retries: 0,
    maxBytes: 32 * 1024
  });
  const player = res.data?.data?.player;
  if (!res.data?.success || !player?.raw_id) throw httpError("PROVIDER_NOT_FOUND", 404);
  return { data: { id: player.raw_id, name: player.username, properties: player.properties || [] } };
}

export async function getMinecraftProfile(env, username) {
  const lookup = await firstAvailable([
    () => playerDbProfile(env, username),
    ...LOOKUP_SOURCES.map(({ origin, path }) => () =>
      requestExternal(new URL(path(username), origin), {
        env,
        expectedOrigin: origin,
        service: "minecraft",
        dedupeKey: `lookup:${origin}:${username.toLowerCase()}`,
        retries: 0,
        maxBytes: 8 * 1024
      })
    )
  ]);
  const uuid = safeText(lookup.data?.id, 32);
  if (!uuid) throw httpError("PROVIDER_NOT_FOUND", 404);

  // Profil complet (textures) : PlayerDB l'a déjà renvoyé avec la recherche.
  const profile = Array.isArray(lookup.data?.properties) && lookup.data.properties.length ? lookup : await firstAvailable(
    SESSION_SOURCES.map((origin) => () =>
      requestExternal(new URL(`/session/minecraft/profile/${encodeURIComponent(uuid)}`, origin), {
        env,
        expectedOrigin: origin,
        service: "minecraft",
        dedupeKey: `profile:${origin}:${uuid}`,
        retries: 0,
        maxBytes: 16 * 1024
      })
    )
  );

  const textures = decodeTextures(profile.data?.properties);

  let nameHistory = [];
  const historySources = [SESSION_SOURCES[1], NAME_HISTORY_ORIGIN];
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
