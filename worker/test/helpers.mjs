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
    if (url.hostname === "valorant-api.com" && url.pathname === "/v1/agents") return json({ data: [{ displayName: "Jett", displayIcon: "https://media.valorant-api.com/agents/jett/displayicon.png" }] });
    if (url.hostname === "api.henrikdev.xyz") {
      if (url.pathname.startsWith("/valorant/v1/account")) return json({ data: { puuid: "123", region: "eu", account_level: 10, name: "Player", tag: "EUW" } });
      if (url.pathname.startsWith("/valorant/v2/mmr")) return json({ data: { current_data: { currenttier: 10, currenttierpatched: "Gold 1" } } });
      if (url.pathname.startsWith("/valorant/v3/matches")) return json({ data: [{ metadata: { matchid: "m1", mode: "Unrated", map: "Ascent", rounds_played: 24 }, teams: { red: { rounds_won: 13 }, blue: { rounds_won: 11 } }, players: { all_players: [{ name: "Player", tag: "EUW", team: "Red", assets: { agent: { small: "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png" } }, stats: { kills: 10, score: 2400 } }] } }] });
    }
    if (url.hostname === "europe.api.riotgames.com") {
      if (url.pathname.startsWith("/riot/account/v1/accounts/by-riot-id")) return json({ puuid: "p1" });
      if (url.pathname.startsWith("/lol/match/v5/matches/by-puuid")) {
        const queue = Number(url.searchParams.get("queue")) || 420;
        return json([`EUW1_${queue}`]);
      }
      if (url.pathname.startsWith("/lol/match/v5/matches/")) {
        const matchId = url.pathname.split("/").pop() || "EUW1_123";
        const queueId = Number(matchId.split("_")[1]) || 420;
        return json({
          metadata: { matchId },
          info: {
            gameId: queueId,
            gameMode: queueId === 450 ? "ARAM" : "CLASSIC",
            queueId,
            mapId: queueId === 450 ? 12 : 11,
            gameDuration: 1800,
            gameCreation: Date.now() - 3600000,
            gameVersion: "16.15.1.111",
            participants: [{ puuid: "p1", championName: "Ahri", kills: 5, deaths: 2, assists: 3, win: true, teamId: 100, champLevel: 12, totalMinionsKilled: 100, neutralMinionsKilled: 20, goldEarned: 9000, totalDamageDealtToChampions: 12000, summoner1Id: 4, summoner2Id: 14, item0: 1001, item1: 2003, item2: 3006, item3: 0, item4: 0, item5: 0, item6: 0, perks: { styles: [{ style: 8100, selections: [{ perk: 8112 }] }] } }]
          }
        });
      }
    }
    if (url.hostname.endsWith(".api.riotgames.com")) {
      if (url.pathname.startsWith("/lol/summoner/v4/summoners/by-puuid")) return json({ id: "s1", summonerLevel: 30 });
      if (url.pathname.startsWith("/lol/league/v4/entries/by-summoner")) return json([{ queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "I", leaguePoints: 50 }]);
    }
    if (url.hostname === "ddragon.leagueoflegends.com") {
      if (url.pathname === "/api/versions.json") return json(["16.15.1"]);
      if (url.pathname.endsWith("/champion.json")) {
        return json({
          type: "champion",
          version: "16.15.1",
          data: {
            Ahri: { id: "Ahri", key: "103", name: "Ahri", title: "la Voleuse de Charme" },
            Sett: { id: "Sett", key: "875", name: "Sett", title: "le Boss" },
            Fizz: { id: "Fizz", key: "105", name: "Fizz", title: "le Bouffon des Mers" }
          }
        });
      }
      if (url.pathname.endsWith("/summoner.json")) {
        return json({
          type: "summoner",
          version: "16.15.1",
          data: {
            SummonerFlash: { id: "SummonerFlash", name: "Flash", key: "4", image: { full: "SummonerFlash.png" } },
            SummonerDot: { id: "SummonerDot", name: "Ignite", key: "14", image: { full: "SummonerDot.png" } }
          }
        });
      }
      if (url.pathname.endsWith("/item.json")) {
        return json({
          type: "item",
          version: "16.15.1",
          data: {
            1001: { name: "Bottes de vitesse", image: { full: "1001.png" } },
            2003: { name: "Potion de soin", image: { full: "2003.png" } },
            3006: { name: "Bottes de l'Arpenteur", image: { full: "3006.png" } }
          }
        });
      }
      if (url.pathname.endsWith("/runesReforged.json")) {
        return json([
          { id: 8100, name: "Domination", icon: "perk-images/Styles/7200_Domination.png", slots: [{ runes: [{ id: 8112, name: "Electrocute", icon: "perk-images/Styles/Domination/Electrocute/Electrocute.png" }] }] }
        ]);
      }
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
    if (url.hostname === "mowojang.matdoes.dev" && url.pathname.startsWith("/users/profiles/minecraft/")) return json({ id: "069a79f444e94726a5befca90e38aaf5", name: "Notch" });
    if (url.hostname === "mowojang.matdoes.dev" && url.pathname.startsWith("/session/minecraft/profile/")) return json({ id: "069a79f444e94726a5befca90e38aaf5", name: "Notch", properties: [{ name: "textures", value: Buffer.from(JSON.stringify({ textures: { SKIN: { url: "http://textures.minecraft.net/texture/test" } } })).toString("base64") }] });
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
    RIOT_API_KEY: "r".repeat(24),
    TWITCH_CLIENT_ID: "d".repeat(24),
    TWITCH_CLIENT_SECRET: "e".repeat(32),
    LASTFM_API_KEY: "f".repeat(24),
    GITHUB_CLIENT_SECRET: "g".repeat(32),
    GOOGLE_CLIENT_ID: "google-client-id-mock.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "h".repeat(32),
    MICROSOFT_CLIENT_ID: "microsoft-client-id",
    MICROSOFT_CLIENT_SECRET: "ms".repeat(16),
    NOTION_CLIENT_SECRET: "i".repeat(32),
    TODOIST_CLIENT_SECRET: "j".repeat(32),
    REDDIT_CLIENT_SECRET: "m".repeat(32),
    GROQ_API_KEY: "n".repeat(40),
    VAPID_PUBLIC_KEY: "vapid-public-key-mock",
    VAPID_PRIVATE_KEY: "vapid-private-key-mock",
    WEBHOOK_SECRET: "webhook-secret-mock",
    PUSH_ENCRYPTION_ENABLED: "false",
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
