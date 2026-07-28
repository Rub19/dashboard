import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { clearTwitchToken } from "../src/services/twitch-client.js";
import { invoke, payload } from "./helpers.mjs";

beforeEach(() => {
  clearCache();
  clearTwitchToken();
});

const ROUTE_CASES = Object.freeze([
  ["Steam player", "/api/steam/player?steamId=76561198000000000", (data) => data.displayName === "ETHONE QA"],
  ["Steam player via vanity name", "/api/steam/player?steamId=ethoneqa", (data) => data.displayName === "ETHONE QA"],
  ["Steam player via profile URL", "/api/steam/player?steamId=https://steamcommunity.com/id/ethoneqa/", (data) => data.displayName === "ETHONE QA"],
  ["Steam recent", "/api/steam/recent-games?steamId=76561198000000000&count=5", (data) => data[0].name === "Recent"],
  ["Steam owned", "/api/steam/owned-games?steamId=76561198000000000&limit=5", (data) => data[0].name === "Owned"],
  ["Steam achievements", "/api/steam/achievements?steamId=76561198000000000&appId=10", (data) => data[0].achieved === true],
  ["Tracker", "/api/tracker/apex-profile?platform=origin&identifier=Player", (data) => data.platform === "origin"],
  ["Henrik account", "/api/henrik/account?name=Player&tag=EUW", (data) => data.accountLevel === 42],
  ["Henrik status", "/api/henrik/status?region=eu", (data) => data.region === "eu"],
  ["Henrik rank", "/api/henrik/rank?name=Player&tag=EUW", (data) => data.tierName === "Immortal 1"],
  ["Henrik matches", "/api/henrik/matches?name=Player&tag=EUW", (data) => data[0].won === true && data[0].kills === 20],
  ["Riot LoL account", "/api/riot-lol/account?name=Player&tag=EUW", (data) => data.puuid === "lol-puuid-test"],
  ["Riot LoL rank", "/api/riot-lol/rank?name=Player&tag=EUW", (data) => data.tier === "GOLD"],
  ["Riot LoL matches", "/api/riot-lol/matches?name=Player&tag=EUW", (data) => data[0].champion === "Ahri" && data[0].win === true],
  ["Twitch", "/api/twitch/channel?login=ethoneqa", (data) => data.live === true],
  ["Last.fm recent", "/api/lastfm/recent-tracks?username=ethone&limit=5", (data) => data[0].playing === true],
  ["Last.fm artists", "/api/lastfm/top-artists?username=ethone&period=7day&limit=5", (data) => data[0].name === "Artist"],
  ["Last.fm tracks", "/api/lastfm/top-tracks?username=ethone&period=7day&limit=5", (data) => data[0].name === "Top Track"],
  ["Lanyard", "/api/lanyard/presence?userId=123456789012345678", (data) => data.spotify.playing === true],
  ["Now playing Last.fm", "/api/now-playing?source=lastfm&username=ethone", (data) => data.source === "lastfm" && data.playing === true],
  ["Now playing Lanyard", "/api/now-playing?source=lanyard&userId=123456789012345678", (data) => data.source === "lanyard" && data.playing === true],
  ["Supabase public profile", "/api/supabase/public-profile?username=ethone", (data) => data.username === "ethone"],
  ["Weather forecast", "/api/weather?city=Paris", (data) => data.city === "Paris" && data.temperature === 21.4],
  ["Minecraft profile", "/api/minecraft/profile?username=Notch", (data) => data.username === "Notch" && data.skinUrl.startsWith("https://textures.minecraft.net")],
  ["Authenticated diagnostic", "/api/diagnostic", (data) => data.worker === "connected"]
]);

for (const [name, path, verify] of ROUTE_CASES) {
  test(`${name} route returns the unified envelope`, async () => {
    const response = await invoke(path);
    const body = await payload(response);
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(typeof body.meta.timestamp, "string");
    assert.equal(typeof body.meta.requestId, "string");
    assert.equal(verify(body.data), true);
  });
}
