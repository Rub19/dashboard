import { getLanyardPresence } from "./lanyard-client.js";
import { getRecentTracks } from "./lastfm-client.js";

export async function getNowPlaying(env, source, identity, apiKeyOverride) {
  if (source === "lanyard") {
    const presence = await getLanyardPresence(env, identity);
    return Object.freeze({
      source: "lanyard",
      playing: presence.spotify?.playing === true,
      track: presence.spotify || null,
      availability: presence.spotify ? "public-presence" : presence.status === "offline" ? "offline" : "hidden"
    });
  }
  const tracks = await getRecentTracks(env, identity, 1, apiKeyOverride);
  const track = tracks[0] || null;
  return Object.freeze({
    source: "lastfm",
    playing: track?.playing === true,
    track,
    availability: track ? "public-history" : "empty"
  });
}
