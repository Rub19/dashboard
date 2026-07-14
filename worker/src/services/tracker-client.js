import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeStats, safeText } from "../utils/normalize.js";

const ORIGIN = "https://public-api.tracker.gg";

export async function getTrackerApexProfile(env, platform, identifier) {
  const apiKey = requireSecret(env, "TRACKER_API_KEY");
  const path = `/v2/apex/standard/profile/${encodeURIComponent(platform)}/${encodeURIComponent(identifier)}`;
  const response = await requestExternal(new URL(path, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "tracker",
    dedupeKey: `apex:${platform}:${identifier.toLowerCase()}`,
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
