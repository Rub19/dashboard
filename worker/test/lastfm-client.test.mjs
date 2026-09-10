import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { clearCache } from "../src/utils/cache.js";
import { getRecentTracks, getTopArtists, getTopTracks } from "../src/services/lastfm-client.js";
import { getNowPlaying } from "../src/services/now-playing-client.js";
import { invoke, json, payload, testEnv } from "./helpers.mjs";

beforeEach(() => clearCache());

// Last.fm's JSON API collapses a singleton list to a bare object instead of a
// one-element array (recenttracks.track / toptracks.track / topartists.artist).
// now-playing always requests limit=1, so a user with exactly one scrobble in
// range hits this shape on essentially every call.
function singletonFetch(method, singleValue) {
  return async (input) => {
    const url = new URL(String(input));
    if (url.hostname !== "ws.audioscrobbler.com") throw new Error(`Unexpected destination: ${url.href}`);
    assert.equal(url.searchParams.get("method"), method);
    return json({ [method === "user.getrecenttracks" ? "recenttracks" : method === "user.gettoptracks" ? "toptracks" : "topartists"]: { [method === "user.gettopartists" ? "artist" : "track"]: singleValue } });
  };
}

test("getRecentTracks does not crash when Last.fm returns a single track as a bare object", async () => {
  const env = testEnv({
    __TEST_FETCH__: singletonFetch("user.getrecenttracks", { name: "Solo Track", artist: { "#text": "Solo Artist" }, "@attr": { nowplaying: "true" } })
  });
  const tracks = await getRecentTracks(env, "ethone", 1);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, "Solo Track");
  assert.equal(tracks[0].playing, true);
});

test("getTopTracks does not crash when Last.fm returns a single track as a bare object", async () => {
  const env = testEnv({
    __TEST_FETCH__: singletonFetch("user.gettoptracks", { name: "Solo Top", artist: { name: "Solo Artist" }, playcount: "3" })
  });
  const tracks = await getTopTracks(env, "ethone", "7day", 1);
  assert.equal(tracks.length, 1);
  assert.equal(tracks[0].name, "Solo Top");
});

test("getTopArtists does not crash when Last.fm returns a single artist as a bare object", async () => {
  const env = testEnv({
    __TEST_FETCH__: singletonFetch("user.gettopartists", { name: "Solo Artist", playcount: "9" })
  });
  const artists = await getTopArtists(env, "ethone", "7day", 1);
  assert.equal(artists.length, 1);
  assert.equal(artists[0].name, "Solo Artist");
});

test("getRecentTracks still handles the normal array shape", async () => {
  const env = testEnv({
    __TEST_FETCH__: singletonFetch("user.getrecenttracks", [{ name: "A" }, { name: "B" }])
  });
  const tracks = await getRecentTracks(env, "ethone", 5);
  assert.deepEqual(tracks.map((t) => t.name), ["A", "B"]);
});

test("getNowPlaying (source=lastfm, limit=1) survives the Last.fm singleton-object response", async () => {
  const env = testEnv({
    __TEST_FETCH__: singletonFetch("user.getrecenttracks", { name: "Now Playing Track", artist: { "#text": "Artist" }, "@attr": { nowplaying: "true" } })
  });
  const result = await getNowPlaying(env, "lastfm", "ethone");
  assert.equal(result.playing, true);
  assert.equal(result.track.name, "Now Playing Track");
});

test("GET /api/now-playing?source=lastfm survives a real-shaped singleton Last.fm response", async () => {
  const env = testEnv({
    __TEST_FETCH__: singletonFetch("user.getrecenttracks", { name: "Now Playing Track", artist: { "#text": "Artist" }, "@attr": { nowplaying: "true" } })
  });
  const response = await invoke("/api/now-playing?source=lastfm&username=ethone", { env });
  const body = await payload(response);
  assert.equal(response.status, 200);
  assert.equal(body.data.playing, true);
  assert.equal(body.data.track.name, "Now Playing Track");
});
