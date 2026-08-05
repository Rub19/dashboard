import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const ORIGIN = "https://public-api.tracker.gg";

async function getTrackerProfile(env, game, platform, identifier, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "TRACKER_API_KEY");
  const path = `/v2/${game}/standard/profile/${encodeURIComponent(platform)}/${encodeURIComponent(identifier)}`;
  const response = await requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `${game}:${platform}:${identifier.toLowerCase()}`,
    headers: { "TRN-Api-Key": apiKey },
    retries: 1
  });
  const profile = response.data?.data || {};
  return Object.freeze({
    platform: safeText(profile.platformInfo?.platformSlug || platform, 32),
    identifier: safeText(profile.platformInfo?.platformUserIdentifier || identifier, 80),
    handle: safeText(profile.platformInfo?.platformUserHandle, 80),
    avatarUrl: safePublicUrl(profile.platformInfo?.avatarUrl, ["tracker.gg"]),
    segments: Object.freeze((profile.segments || []).slice(0, 20).map((segment) => Object.freeze({
      type: safeText(segment.type, 40),
      name: safeText(segment.metadata?.name || segment.metadata?.legendName || segment.type, 100),
      stats: safeStats(segment.stats)
    })))
  });
}

export function getTrackerApexProfile(env, platform, identifier, apiKeyOverride) {
  return getTrackerProfile(env, "apex", platform, identifier, apiKeyOverride);
}

export function getTrackerValorantProfile(env, riotId, apiKeyOverride) {
  return getTrackerProfile(env, "valorant", "riot", riotId, apiKeyOverride);
}

export function getTrackerLolProfile(env, riotId, apiKeyOverride) {
  return getTrackerProfile(env, "lol", "riot", riotId, apiKeyOverride);
}

export async function getTrackerMatches(env, game, platform, identifier, mode, apiKeyOverride) {
  const apiKey = apiKeyOverride || requireSecret(env, "TRACKER_API_KEY");
  let path = `/v2/${game}/standard/matches/${encodeURIComponent(platform)}/${encodeURIComponent(identifier)}`;
  if (mode && mode !== "all") {
    path += `?type=${encodeURIComponent(mode)}`;
  }
  const response = await requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `${game}:matches:${platform}:${identifier.toLowerCase()}:${mode || "all"}`,
    headers: { "TRN-Api-Key": apiKey },
    retries: 1
  });
  const matches = response.data?.data || [];
  return Object.freeze(matches.map((match) => Object.freeze({
    id: safeText(match.attributes?.id),
    metadata: Object.freeze({
      modeName: safeText(match.metadata?.modeName),
      result: safeText(match.metadata?.result),
      mapName: safeText(match.metadata?.mapName),
      agentName: safeText(match.metadata?.agentName || match.metadata?.championName),
      agentImageUrl: safePublicUrl(match.metadata?.agentImageUrl || match.metadata?.championImageUrl, ["tracker.gg"])
    }),
    segments: Object.freeze((match.segments || []).map((segment) => Object.freeze({
      type: safeText(segment.type),
      stats: safeStats(segment.stats)
    })))
  })));
}

export function getTrackerValorantMatches(env, riotId, mode, apiKeyOverride) {
  return getTrackerMatches(env, "valorant", "riot", riotId, mode, apiKeyOverride);
}

export function getTrackerLolMatches(env, riotId, mode, apiKeyOverride) {
  return getTrackerMatches(env, "lol", "riot", riotId, mode, apiKeyOverride);
}
