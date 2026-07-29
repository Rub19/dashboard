import worker from "../src/index.js";

export const USER_ID = "4a8ad6a5-7f6e-4d41-9d07-28f6dca8719a";
export const JWT_SECRET = "s".repeat(48);

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export async function accessToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    iss: "https://project-ref.supabase.co/auth/v1",
    aud: "authenticated",
    sub: USER_ID,
    role: "authenticated",
    iat: now - 10,
    exp: now + 3600,
    ...overrides
  });
  const input = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return `${input}.${Buffer.from(signature).toString("base64url")}`;
}

export function json(data, options = {}) {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
}

export function providerFetch(counter = { calls: 0 }) {
  return async (input) => {
    counter.calls += 1;
    const url = new URL(String(input));
    if (url.hostname === "api.steampowered.com") {
      if (url.pathname.includes("ResolveVanityURL")) return json({ response: { success: 1, steamid: "76561198000000000" } });
      if (url.pathname.includes("GetPlayerSummaries")) return json({ response: { players: [{ steamid: "76561198000000000", personaname: "ETHONE QA", profileurl: "https://steamcommunity.com/id/ethoneqa/", avatarfull: "https://avatars.steamstatic.com/avatar.jpg", personastate: 1 }] } });
      if (url.pathname.includes("GetRecentlyPlayedGames")) return json({ response: { games: [{ appid: 10, name: "Recent", playtime_forever: 120 }] } });
      if (url.pathname.includes("GetOwnedGames")) return json({ response: { games: [{ appid: 20, name: "Owned", playtime_forever: 600 }] } });
      return json({ playerstats: { achievements: [{ apiname: "READY", achieved: 1, unlocktime: 1700000000, name: "Ready" }] } });
    }
    if (url.hostname === "public-api.tracker.gg") return json({ data: { platformInfo: { platformSlug: "origin", platformUserIdentifier: "Player", platformUserHandle: "Player", avatarUrl: "https://tracker.gg/avatar.png" }, segments: [{ type: "overview", metadata: { name: "Overview" }, stats: { level: { displayName: "Level", displayValue: "10", percentile: 50 } } }] } });
    if (url.hostname === "api.henrikdev.xyz") {
      if (url.pathname.includes("/status/")) return json({ status: 200, region: "eu", data: { maintenances: [] } });
      if (url.pathname.includes("/mmr/")) return json({ status: 200, data: { currenttier: 21, currenttierpatched: "Immortal 1", ranking_in_tier: 45, mmr_change_to_last_game: 12, elo: 1234, images: { small: "https://media.valorant-api.com/rank.png" } } });
      if (url.pathname.includes("/matches/")) return json({ status: 200, data: [{ metadata: { matchid: "match-1", map: "Ascent", mode: "Competitive", game_start: 1700000000, game_length: 1800 }, players: { all_players: [{ name: "Player", tag: "EUW", team: "Red", character: "Jett", stats: { kills: 20, deaths: 10, assists: 5, score: 4500 } }] }, teams: { red: { has_won: true }, blue: { has_won: false } } }] });
      return json({ status: 200, data: { puuid: "public-player-id", name: "Player", tag: "EUW", region: "eu", account_level: 42, card: "https://media.valorant-api.com/card.png" } });
    }
    if (url.hostname.endsWith(".api.riotgames.com")) {
      if (url.pathname.includes("/riot/account/v1/accounts/by-riot-id/")) return json({ puuid: "lol-puuid-test", gameName: "Player", tagLine: "EUW" });
      if (url.pathname.includes("/lol/league/v4/entries/by-puuid/")) return json([{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 45, wins: 30, losses: 25 }]);
      if (url.pathname.includes("/lol/match/v5/matches/by-puuid/")) return json(["match-lol-1"]);
      if (url.pathname.includes("/lol/match/v5/matches/")) return json({ metadata: { matchId: "match-lol-1" }, info: { gameMode: "CLASSIC", gameDuration: 1900, gameEndTimestamp: 1700003500000, participants: [{ puuid: "lol-puuid-test", championName: "Ahri", win: true, kills: 8, deaths: 2, assists: 10, totalMinionsKilled: 150, neutralMinionsKilled: 20 }] } });
    }
    if (url.hostname === "api.groq.com") return json({ choices: [{ message: { role: "assistant", content: "Bonjour, comment puis-je aider ?" } }] });
    if (url.hostname === "id.twitch.tv") return json({ access_token: "t".repeat(32), expires_in: 3600 });
    if (url.hostname === "api.twitch.tv") {
      if (url.pathname === "/helix/users") return json({ data: [{ id: "123", login: "ethoneqa", display_name: "ETHONE QA", description: "QA", profile_image_url: "https://static-cdn.jtvnw.net/avatar.png", broadcaster_type: "affiliate" }] });
      return json({ data: [{ title: "Live QA", game_name: "Testing", viewer_count: 8, started_at: "2026-07-14T08:00:00Z", language: "fr", thumbnail_url: "https://static-cdn.jtvnw.net/previews-ttv/live-{width}x{height}.jpg" }] });
    }
    if (url.hostname === "ws.audioscrobbler.com") {
      const method = url.searchParams.get("method");
      if (method === "user.getrecenttracks") return json({ recenttracks: { track: [{ name: "Track", artist: { "#text": "Artist" }, album: { "#text": "Album" }, "@attr": { nowplaying: "true" } }] } });
      if (method === "user.gettopartists") return json({ topartists: { artist: [{ name: "Artist", playcount: "12" }] } });
      return json({ toptracks: { track: [{ name: "Top Track", artist: { name: "Artist" }, playcount: "15" }] } });
    }
    if (url.hostname === "api.lanyard.rest") return json({ success: true, data: { discord_status: "online", listening_to_spotify: true, discord_user: { id: "123456789012345678", username: "ethone" }, activities: [], spotify: { track_id: "track", song: "Song", artist: "Artist", album: "Album", album_art_url: "https://i.scdn.co/image/test", timestamps: { start: 100, end: 200 } } } });
    if (url.hostname === "geocoding-api.open-meteo.com") return json({ results: [{ name: "Paris", country: "France", latitude: 48.85, longitude: 2.35 }] });
    if (url.hostname === "api.open-meteo.com") return json({ current: { temperature_2m: 21.4, weather_code: 2, wind_speed_10m: 12.3, relative_humidity_2m: 55, is_day: 1 }, daily: { time: ["2026-07-26", "2026-07-27", "2026-07-28"], temperature_2m_max: [24, 23, 22], temperature_2m_min: [16, 15, 14] } });
    if (url.hostname === "api.mojang.com") return json({ id: "069a79f444e94726a5befca90e38aaf5", name: "Notch" });
    if (url.hostname === "sessionserver.mojang.com") return json({ id: "069a79f444e94726a5befca90e38aaf5", name: "Notch", properties: [{ name: "textures", value: Buffer.from(JSON.stringify({ textures: { SKIN: { url: "http://textures.minecraft.net/texture/test" } } })).toString("base64") }] });
    if (url.hostname === "project-ref.supabase.co") {
      if (url.pathname === "/rest/v1/rpc/get_provider_credential") return json(null);
      return json([{ public_id: "public-profile", username: "ethone", display_name: "ETHONE", avatar_url: "https://project-ref.supabase.co/storage/avatar.png", email: "must-not-leak@example.test", private_note: "must-not-leak" }]);
    }
    throw new Error("Unexpected test destination");
  };
}

function limiter(success = true, remaining = 9) {
  return Object.freeze({ limit: async () => Object.freeze({ success, remaining }) });
}

export function testEnv(overrides = {}) {
  return {
    ENVIRONMENT: "test",
    WORKER_VERSION: "test",
    ALLOWED_ORIGINS: "https://ethone.dev",
    SUPABASE_URL: "https://project-ref.supabase.co",
    SUPABASE_AUDIENCE: "authenticated",
    SUPABASE_JWT_SECRET: JWT_SECRET,
    SUPABASE_SECRET_KEY: "u".repeat(32),
    STEAM_API_KEY: "a".repeat(24),
    TRACKER_API_KEY: "b".repeat(24),
    HENRIK_API_KEY: "c".repeat(24),
    RIOT_API_KEY: "k".repeat(24),
    TWITCH_CLIENT_ID: "d".repeat(24),
    TWITCH_CLIENT_SECRET: "e".repeat(32),
    LASTFM_API_KEY: "f".repeat(24),
    GITHUB_CLIENT_SECRET: "g".repeat(32),
    GOOGLE_CLIENT_SECRET: "h".repeat(32),
    NOTION_CLIENT_SECRET: "i".repeat(32),
    TODOIST_CLIENT_SECRET: "j".repeat(32),
    REDDIT_CLIENT_SECRET: "m".repeat(32),
    GROQ_API_KEY: "n".repeat(40),
    OUTBOUND_TIMEOUT_MS: "100",
    RATE_LIMIT_EDGE: limiter(),
    RATE_LIMIT_STANDARD: limiter(),
    RATE_LIMIT_STRICT: limiter(),
    __TEST_FETCH__: providerFetch(),
    __TEST_LOGGER__: { info() {} },
    ...overrides
  };
}

export async function invoke(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.origin !== null) headers.set("origin", options.origin || "https://ethone.dev");
  if (options.auth !== false && !headers.has("authorization")) headers.set("authorization", `Bearer ${options.token || await accessToken()}`);
  const request = new Request(`https://worker.example.test${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body
  });
  return worker.fetch(request, options.env || testEnv(), { waitUntil() {} });
}

export async function payload(response) {
  return response.status === 204 ? null : response.json();
}
