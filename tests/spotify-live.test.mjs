import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createSpotifyLive, normalizeSpotifyPlayback } from "../v8/services/spotify-live.mjs";

class TestEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
}

function testDocument() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
      if (!listeners.get(type)?.size) listeners.delete(type);
    },
    dispatchEvent(event) {
      [...(listeners.get(event.type) || [])].forEach((listener) => listener(event));
      return true;
    }
  };
}

const TRACK = Object.freeze({
  item: {
    id: "track-1",
    name: "Midnight Build",
    artists: [{ name: "Signal North" }],
    album: { name: "Quiet Systems", images: [{ url: "https://i.scdn.co/image/cover-1" }] },
    duration_ms: 240000
  },
  progress_ms: 60000,
  is_playing: true,
  controllable: true,
  access_token: "must-never-leak"
});

test("Spotify playback normalization exposes only safe live metadata", () => {
  const playback = normalizeSpotifyPlayback(TRACK, { connected: true, origin: "https://ethone.example" });
  assert.equal(playback.available, true);
  assert.equal(playback.playing, true);
  assert.equal(playback.title, "Midnight Build");
  assert.equal(playback.artist, "Signal North");
  assert.equal(playback.album, "Quiet Systems");
  assert.equal(playback.progress, 0.25);
  assert.equal(playback.artwork, "https://i.scdn.co/image/cover-1");
  assert.equal("access_token" in playback, false);
  assert.equal(Object.isFrozen(playback), true);

  const hostile = normalizeSpotifyPlayback({ ...TRACK, item: { ...TRACK.item, album: { images: [{ url: "https://i.scdn.co.evil.example/cover" }] } } }, { connected: true, origin: "https://ethone.example" });
  assert.equal(hostile.artwork, "");
  const disconnected = normalizeSpotifyPlayback(TRACK, { connected: false, origin: "https://ethone.example" });
  assert.equal(disconnected.available, false);
  assert.equal(disconnected.playing, false);
  assert.equal(disconnected.title, "");
});

test("Spotify live controller owns one ephemeral bridge subscription and cleans it", async () => {
  const document = testDocument();
  const mediaActivity = [];
  const bridgeCommands = [];
  let bridgeListener = null;
  let bridgeReleased = 0;
  const bridge = {
    snapshot: () => ({}),
    subscribe(listener) {
      bridgeListener = listener;
      return () => { bridgeReleased += 1; bridgeListener = null; };
    },
    command(action) {
      bridgeCommands.push(action);
      return Promise.resolve();
    }
  };
  document.addEventListener("ethone:media-activity", (event) => mediaActivity.push(event.detail));
  const spotify = createSpotifyLive({
    document,
    bridge,
    isConnected: () => true,
    runtime: { CustomEvent: TestEvent, location: { origin: "https://ethone.example" } }
  });
  const states = [];
  const release = spotify.subscribe((state) => states.push(state), { immediate: false });

  assert.equal(spotify.start(), true);
  assert.equal(spotify.start(), false);
  assert.equal(document.listeners.get("ethone:spotify-playback")?.size, 1);
  bridgeListener(TRACK);
  assert.equal(spotify.state().playing, true);
  assert.deepEqual(mediaActivity.at(-1), { source: "spotify", active: true });
  bridgeListener({ progress_ms: 120000 });
  assert.equal(spotify.state().progress, 0.5);
  const result = await spotify.command("toggle");
  assert.equal(result.ok, true);
  assert.deepEqual(bridgeCommands, ["pause"]);

  bridgeListener({ is_playing: false });
  assert.equal(spotify.state().playing, false);
  assert.deepEqual(mediaActivity.at(-1), { source: "spotify", active: false });
  assert.ok(states.length >= 2);
  release();
  assert.equal(spotify.destroy(), true);
  assert.equal(bridgeReleased, 1);
  assert.equal(document.listeners.has("ethone:spotify-playback"), false);
  assert.equal(spotify.diagnostics().subscribers, 0);
});

test("Spotify controls stay disabled without an acknowledged command bridge", () => {
  const document = testDocument();
  const spotify = createSpotifyLive({
    document,
    isConnected: () => true,
    runtime: { CustomEvent: TestEvent, location: { origin: "https://ethone.example" } }
  });
  spotify.publish(TRACK);
  assert.equal(spotify.state().available, true);
  assert.equal(spotify.state().controllable, false);
  assert.equal(spotify.command("toggle").status, "unavailable");
  spotify.destroy();
});

test("Spotify Live is event driven and shared by Dashboard Activity Hub Dock and Presence", () => {
  const service = fs.readFileSync(new URL("../v8/services/spotify-live.mjs", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  const home = fs.readFileSync(new URL("../v8/pages/home.mjs", import.meta.url), "utf8");
  const activity = fs.readFileSync(new URL("../v8/pages/activity.mjs", import.meta.url), "utf8");
  const dock = fs.readFileSync(new URL("../v8/ui/dock.mjs", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");

  assert.doesNotMatch(service, /setInterval|setTimeout|requestAnimationFrame|MutationObserver|ResizeObserver|localStorage|sessionStorage/);
  assert.match(app, /createSpotifyLive/);
  assert.match(app, /media:\s*playback\.playing\s*\?\s*"playing"/);
  assert.match(home, /spotifyLiveCard/);
  assert.match(activity, /spotifyLiveCard/);
  assert.match(dock, /spotifyDockIndicator/);
  assert.match(presence, /data-presence-media="playing"/);
  assert.match(presence, /\.v8-spotify-equalizer i/);
  assert.match(presence, /prefers-reduced-motion:[ ]*reduce[\s\S]*\.v8-spotify-live__aura/);
});
