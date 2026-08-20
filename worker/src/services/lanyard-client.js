import { requestExternal } from "../utils/external-request.js";
import { safePublicUrl, safeText } from "../utils/normalize.js";

const ORIGIN = "https://api.lanyard.rest";

export async function getLanyardPresence(env, userId) {
  const response = await requestExternal(new URL(`/v1/users/${encodeURIComponent(userId)}`, ORIGIN), {
    env,
    expectedOrigin: ORIGIN,
    service: "lanyard",
    dedupeKey: `presence:${userId}`,
    retries: 1,
    maxBytes: 256 * 1024
  });
  const value = response.data?.data || {};
  const discordUser = value.discord_user || {};
  const spotify = value.spotify || null;
  const userIdForAvatar = discordUser.id || userId;
  const isAnimated = String(discordUser.avatar || "").startsWith("a_");
  const avatar = discordUser.avatar && userIdForAvatar
    ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(userIdForAvatar)}/${encodeURIComponent(discordUser.avatar)}.${isAnimated ? "gif" : "png"}?size=128`
    : "";
  return Object.freeze({
    userId: safeText(discordUser.id || userId, 24),
    displayName: safeText(discordUser.global_name || discordUser.display_name || discordUser.username, 80),
    avatarUrl: safePublicUrl(avatar, ["discordapp.com"]),
    status: safeText(value.discord_status || "offline", 16),
    discord_user: Object.freeze({
      id: safeText(discordUser.id),
      global_name: safeText(discordUser.global_name),
      display_name: safeText(discordUser.display_name),
      username: safeText(discordUser.username),
      bot: Boolean(discordUser.bot),
      public_flags: Number(discordUser.public_flags) || 0,
      flags: Number(discordUser.flags) || 0,
      premium_type: Number(discordUser.premium_type) || 0,
      avatar: safeText(discordUser.avatar),
      badges: Array.isArray(discordUser.badges) ? Object.freeze([...discordUser.badges]) : undefined
    }),
    kv: typeof value.kv === "object" && value.kv !== null ? Object.freeze({ ...value.kv }) : undefined,
    activities: Object.freeze((value.activities || []).slice(0, 12).map((activity) => Object.freeze({
      type: Number(activity.type) || 0,
      name: safeText(activity.name, 80),
      details: safeText(activity.details, 160),
      state: safeText(activity.state, 160)
    }))),
    spotify: spotify ? Object.freeze({
      playing: value.listening_to_spotify === true,
      trackId: safeText(spotify.track_id, 64),
      title: safeText(spotify.song, 180),
      artist: safeText(spotify.artist, 160),
      album: safeText(spotify.album, 160),
      artworkUrl: safePublicUrl(spotify.album_art_url, ["scdn.co", "spotifycdn.com", "spotify.com"]),
      covers: [safePublicUrl(spotify.album_art_url, ["scdn.co", "spotifycdn.com", "spotify.com"])].filter(Boolean),
      startedAt: Number(spotify.timestamps?.start) || null,
      endsAt: Number(spotify.timestamps?.end) || null
    }) : null
  });
}
