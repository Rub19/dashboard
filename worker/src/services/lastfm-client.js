import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeIsoSeconds, safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const ORIGIN = "https://ws.audioscrobbler.com";
const PERIODS = Object.freeze(["overall", "7day", "1month", "3month", "6month", "12month"]);

async function lastFmRequest(env, method, username, options = {}) {
  const apiKey = options.apiKeyOverride || requireSecret(env, "LASTFM_API_KEY");
  const url = new URL("/2.0/", ORIGIN);
  url.searchParams.set("method", method);
  url.searchParams.set("user", username);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(options.limit || 20));
  if (options.period && PERIODS.includes(options.period)) url.searchParams.set("period", options.period);
  return requestExternal(url, {
    env,
    expectedOrigin: ORIGIN,
    service: "lastfm",
    dedupeKey: `${method}:${username.toLowerCase()}:${options.period || ""}:${options.limit || 20}`,
    retries: 1
  });
}

function imageUrl(images) {
  const values = Array.isArray(images) ? images : [];
  const selected = [...values].reverse().find((entry) => entry?.["#text"]);
  return safePublicUrl(selected?.["#text"], ["lastfm.freetls.fastly.net", "lastfm-img2.akamaized.net"]);
}

// Last.fm's JSON API collapses a singleton list to a bare object instead of a
// one-element array (a well-known quirk inherited from its XML roots) — e.g.
// recenttracks.track is an array when there are 0 or 2+ tracks, but a plain
// object when there's exactly 1. now-playing always requests limit=1, so this
// path is hit on every call for an active user; without this, `.slice()` below
// throws and the route 500s instead of returning the single track/artist.
function toArray(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

function track(value = {}) {
  return Object.freeze({
    name: safeText(value.name, 180),
    artist: safeText(value.artist?.name || value.artist?.["#text"], 160),
    album: safeText(value.album?.["#text"] || value.album?.title, 160),
    artworkUrl: imageUrl(value.image),
    profileUrl: safePublicUrl(value.url, ["last.fm"]),
    playCount: safeNumber(value.playcount, 0, 1000000000),
    playing: value["@attr"]?.nowplaying === "true",
    playedAt: safeIsoSeconds(value.date?.uts)
  });
}

export async function getRecentTracks(env, username, limit = 20, apiKeyOverride) {
  const response = await lastFmRequest(env, "user.getrecenttracks", username, { limit, apiKeyOverride });
  return Object.freeze(toArray(response.data?.recenttracks?.track).slice(0, limit).map(track));
}

export async function getTopTracks(env, username, period = "7day", limit = 20, apiKeyOverride) {
  const response = await lastFmRequest(env, "user.gettoptracks", username, { period, limit, apiKeyOverride });
  return Object.freeze(toArray(response.data?.toptracks?.track).slice(0, limit).map(track));
}

export async function getTopArtists(env, username, period = "7day", limit = 20, apiKeyOverride) {
  const response = await lastFmRequest(env, "user.gettopartists", username, { period, limit, apiKeyOverride });
  return Object.freeze(toArray(response.data?.topartists?.artist).slice(0, limit).map((value) => Object.freeze({
    name: safeText(value.name, 160),
    playCount: safeNumber(value.playcount, 0, 1000000000),
    artworkUrl: imageUrl(value.image),
    profileUrl: safePublicUrl(value.url, ["last.fm"])
  })));
}
