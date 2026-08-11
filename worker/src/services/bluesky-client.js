import { requestExternal } from "../utils/external-request.js";
import { safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const API_ORIGIN = "https://public.api.bsky.app";

export async function getBlueskyProfile(env, handle) {
  const url = new URL("/xrpc/app.bsky.actor.getProfile", API_ORIGIN);
  url.searchParams.set("actor", handle);
  const response = await requestExternal(url, {
    env,
    expectedOrigin: API_ORIGIN,
    service: "bluesky",
    headers: { accept: "application/json" },
    timeoutMs: 8000,
    maxBytes: 256 * 1024
  });
  const data = response.data || {};
  return Object.freeze({
    handle: safeText(data.handle, 80),
    displayName: safeText(data.displayName, 80) || safeText(data.handle, 80),
    avatarUrl: safePublicUrl(data.avatar, ["cdn.bsky.app"]),
    bannerUrl: safePublicUrl(data.banner, ["cdn.bsky.app"]),
    followers: safeNumber(data.followersCount, 0, 100_000_000),
    follows: safeNumber(data.followsCount, 0, 100_000_000),
    posts: safeNumber(data.postsCount, 0, 100_000_000),
    description: safeText(data.description, 300),
    did: safeText(data.did, 120)
  });
}
