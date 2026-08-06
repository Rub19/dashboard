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
  ["Tracker Valorant", "/api/tracker/valorant-profile?name=Player&tag=EUW", (data) => data.handle === "Player#EUW"],
  ["Tracker Valorant matches", "/api/tracker/valorant-matches?name=Player&tag=EUW&mode=all", (data) => data[0].metadata.score.team === 13 && data[0].metadata.score.opponent === 11 && data[0].metadata.score.roundsPlayed === 24 && data[0].scoreboard.players[0].isMe === true && data[0].scoreboard.players[0].assets.agent.small === "https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png"],
  ["Tracker LoL", "/api/tracker/lol-profile?name=Player&tag=EUW", (data) => data.handle === "Player#EUW"],
  ["Tracker LoL matches", "/api/tracker/lol-matches?name=Player&tag=EUW&mode=all", (data) => data.length === 1 && data[0].metadata.agentName === "Ahri" && data[0].scoreboard.players[0].isMe === true && data[0].metadata.agentImageUrl.includes("/16.15.1/img/champion/Ahri.png") && data[0].scoreboard.players[0].items.length === 7 && data[0].scoreboard.players[0].items[0].image.includes("/16.15.1/img/item/1001.png") && data[0].scoreboard.players[0].items[0].name === "Bottes de vitesse" && data[0].scoreboard.players[0].assets.spells.length === 2 && data[0].scoreboard.players[0].assets.spells[0].name === "Flash" && data[0].scoreboard.players[0].assets.rune.name === "Electrocute"],
  ["Tracker LoL ranked matches", "/api/tracker/lol-matches?name=Player&tag=EUW&mode=ranked", (data) => data.length === 2 && data.every((m) => ["Ranked Solo", "Ranked Flex"].includes(m.metadata.modeName))],
  ["Tracker LoL normal matches", "/api/tracker/lol-matches?name=Player&tag=EUW&mode=normal", (data) => data.length === 2 && data.every((m) => ["Normal Draft Pick", "Normal Blind Pick"].includes(m.metadata.modeName))],
  ["Tracker LoL ARAM matches", "/api/tracker/lol-matches?name=Player&tag=EUW&mode=aram", (data) => data.length === 1 && data[0].metadata.modeName === "ARAM"],
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
