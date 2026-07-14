import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const ORIGIN = "https://api.henrikdev.xyz";

async function henrikRequest(env, path, dedupeKey) {
  const apiKey = requireSecret(env, "HENRIK_API_KEY");
  return requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "henrik",
    dedupeKey,
    headers: { Authorization: apiKey },
    retries: 1
  });
}

export async function getValorantAccount(env, name, tag) {
  const response = await henrikRequest(env, `/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, `account:${name.toLowerCase()}:${tag.toLowerCase()}`);
  const value = response.data?.data || {};
  return Object.freeze({
    puuid: safeText(value.puuid, 80),
    name: safeText(value.name || name, 40),
    tag: safeText(value.tag || tag, 12),
    region: safeText(value.region, 12),
    accountLevel: safeNumber(value.account_level, 0, 10000),
    cardUrl: safePublicUrl(typeof value.card === "string" ? value.card : value.card?.large, ["valorant-api.com", "henrikdev.xyz", "riotcdn.net"]),
    updatedAt: safeText(value.updated_at || value.last_update, 64)
  });
}

export async function getValorantStatus(env, region) {
  const response = await henrikRequest(env, `/valorant/v1/status/${encodeURIComponent(region)}`, `status:${region}`);
  const value = response.data || {};
  return Object.freeze({
    region: safeText(value.region || region, 12),
    maintenances: Object.freeze((value.data?.maintenances || []).slice(0, 12).map((entry) => Object.freeze({
      createdAt: safeText(entry.created_at, 64),
      archiveAt: safeText(entry.archive_at, 64),
      updates: Object.freeze((entry.updates || []).slice(0, 8).map((update) => Object.freeze({
        createdAt: safeText(update.created_at, 64),
        content: safeText(update.translations?.[0]?.content, 500)
      })))
    })))
  });
}
