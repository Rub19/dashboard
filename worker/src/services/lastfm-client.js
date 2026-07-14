import { requireSecret } from "../middleware/validation.js";
import { requestExternal } from "../utils/external-request.js";
import { safeIsoSeconds, safeNumber, safePublicUrl, safeText } from "../utils/normalize.js";

const ORIGIN = "https://ws.audioscrobbler.com";
const PERIODS = Object.freeze(["overall", "7day", "1month", "3month", "6month", "12month"]);

async function lastFmRequest(env, method, username, options = {}) {
  const apiKey = requireSecret(env, "LASTFM_API_KEY");
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

export async function getRecentTracks(env, username, limit = 20) {
  const response = await lastFmRequest(env, "user.getrecenttracks", username, { limit });
  return Object.freeze((response.data?.recenttracks?.track || []).slice(0, limit).map(track));
}

export async function getTopTracks(env, username, period = "7day", limit = 20) {
  const response = await lastFmRequest(env, "user.gettoptracks", username, { period, limit });
  return Object.freeze((response.data?.toptracks?.track || []).slice(0, limit).map(track));
}

export async function getTopArtists(env, username, period = "7day", limit = 20) {
  const response = await lastFmRequest(env, "user.gettopartists", username, { period, limit });
  return Object.freeze((response.data?.topartists?.artist || []).slice(0, limit).map((value) => Object.freeze({
    name: safeText(value.name, 160),
    playCount: safeNumber(value.playcount, 0, 1000000000),
    artworkUrl: imageUrl(value.image),
    profileUrl: safePublicUrl(value.url, ["last.fm"])
  })));
}
