import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_SOUND_PREFERENCES,
  MAX_SPATIAL_PAN,
  SOUND_EVENTS,
  SOUND_PACKS,
  createSoundManager,
  normalizeSoundPreferences,
  normalizeSpatialPan,
  soundPanForEvent,
  soundEventForAction,
  soundEventForNotification,
  spatialPanFromRect
} from "../v8/services/sound-manager.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function fakeDocument() {
  const listeners = new Map();
  return {
    visibilityState: "visible",
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    listeners
  };
}

function fakeAudioHarness({ spatial = true } = {}) {
  const stats = { contexts: 0, starts: 0, closes: 0, filters: 0, gains: [], rates: [], pans: [], tones: [] };
  class FakeAudioContext {
    constructor() {
      stats.contexts += 1;
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.state = "running";
      this.destination = {};
    }
    createBuffer(channels, length, sampleRate) {
      const data = new Float32Array(length);
      return { duration: length / sampleRate, getChannelData: () => data };
    }
    createBufferSource() {
      return {
        buffer: null,
        playbackRate: { setValueAtTime(value) { stats.rates.push(value); } },
        connect() {},
        disconnect() {},
        addEventListener() {},
        start() { stats.starts += 1; }
      };
    }
    createGain() {
      return { gain: { setValueAtTime(value) { stats.gains.push(value); } }, connect() {}, disconnect() {} };
    }
    createBiquadFilter() {
      stats.filters += 1;
      return {
        type: "",
        frequency: { setValueAtTime() {} },
        gain: { setValueAtTime(value) { stats.tones.push(value); } },
        connect() {},
        disconnect() {}
      };
    }
    async resume() { this.state = "running"; }
    async close() { this.state = "closed"; stats.closes += 1; }
  }
  if (spatial) FakeAudioContext.prototype.createStereoPanner = function createStereoPanner() {
    return {
      pan: { setValueAtTime(value) { stats.pans.push(value); } },
      connect() {},
      disconnect() {}
    };
  };
  return { FakeAudioContext, stats };
}

test("sound preferences are bounded, complete and use ETHONE by default", () => {
  const normalized = normalizeSoundPreferences({
    enabled: true,
    pack: "unknown",
    master: 4,
    volumes: { interface: -2, notifications: 0.4 }
  });
  assert.equal(normalized.pack, "ethone");
  assert.equal(normalized.silent, false);
  assert.equal(normalized.spatial, true);
  assert.equal(normalized.master, 1);
  assert.equal(normalized.volumes.interface, 0);
  assert.equal(normalized.volumes.notifications, 0.4);
  assert.equal(normalized.volumes.brain, DEFAULT_SOUND_PREFERENCES.volumes.brain);
  assert.deepEqual(SOUND_PACKS.map(({ id }) => id), ["ethone", "minimal", "classic", "apple-inspired", "silent"]);
});

test("spatial audio stays subtle and forces modal and Brain cues to the center", () => {
  assert.equal(normalizeSpatialPan("left"), -MAX_SPATIAL_PAN);
  assert.equal(normalizeSpatialPan("right"), MAX_SPATIAL_PAN);
  assert.equal(normalizeSpatialPan(1), MAX_SPATIAL_PAN);
  assert.equal(normalizeSpatialPan(-1), -MAX_SPATIAL_PAN);
  assert.equal(normalizeSpatialPan(undefined), 0);
  assert.equal(soundPanForEvent("notification.info"), MAX_SPATIAL_PAN);
  assert.equal(soundPanForEvent("notification.info", { origin: "left" }), -MAX_SPATIAL_PAN);
  assert.equal(soundPanForEvent("modal.open", { origin: "right" }), 0);
  assert.equal(soundPanForEvent("brain.respond", { origin: "left" }), 0);
  assert.equal(spatialPanFromRect({ left: 0, width: 100 }, 1000), -0.063);
  assert.equal(spatialPanFromRect({ left: 450, width: 100 }, 1000), 0);
  assert.equal(spatialPanFromRect({ left: 900, width: 100 }, 1000), 0.063);
});

test("the semantic catalog covers every requested system sound", () => {
  const expected = [
    "window.open", "window.close", "modal.open", "modal.close", "space.change", "flow.change",
    "dashboard.change", "brain.open", "brain.thinking", "brain.respond", "brain.complete", "brain.error",
    "marketplace.open", "settings.open", "note.create", "delete", "save.start", "save.complete",
    "sync.start", "sync.success", "system.error", "system.warning", "notification.info",
    "notification.success", "notification.error", "notification.warning", "notification.sync",
    "notification.update", "auth.login", "auth.logout", "onboarding.complete", "widget.install",
    "widget.uninstall", "drag.drop", "hover.important", "command.open", "command.close"
  ];
  expected.forEach((eventName) => assert.ok(SOUND_EVENTS[eventName], `missing ${eventName}`));
  assert.equal(soundEventForNotification("brain"), "brain.respond");
  assert.equal(soundEventForNotification("update"), "notification.update");
  assert.equal(soundEventForNotification("success", { id: "notes-created" }), "note.create");
  assert.equal(soundEventForNotification("success", { id: "notes-saved" }), "save.complete");
  assert.equal(soundEventForNotification("info", { id: "task-deleted" }), "delete");
  assert.equal(soundEventForNotification("success", { id: "sync-refresh" }), "sync.success");
});

test("central actions resolve to sound intentions without page-level audio", () => {
  assert.equal(soundEventForAction("v8.command.open"), "command.open");
  assert.equal(soundEventForAction("v8.settings.open"), "settings.open");
  assert.equal(soundEventForAction("v8.space.focus"), "space.change");
  assert.equal(soundEventForAction("v8.dashboard.personal"), "dashboard.change");
  assert.equal(soundEventForAction("v8.notes.delete"), "modal.open");
  assert.equal(soundEventForAction("v8.notes.delete.cancel"), "modal.close");
  assert.equal(soundEventForAction("v8.unknown", { status: "failed" }), "system.error");
});

test("AudioContext stays lazy and playback stops immediately when muted", async () => {
  const document = fakeDocument();
  const { FakeAudioContext, stats } = fakeAudioHarness();
  const runtime = {
    AudioContext: FakeAudioContext,
    document,
    localStorage: memoryStorage(),
    performance: { now: () => 1000 },
    requestIdleCallback: () => 1,
    cancelIdleCallback() {}
  };
  const sounds = createSoundManager({ runtime, document, storage: runtime.localStorage });
  assert.equal(stats.contexts, 0);
  assert.equal(sounds.play("window.open"), false);
  assert.equal(stats.contexts, 0);
  assert.equal(await sounds.unlock(), true);
  assert.equal(stats.contexts, 1);
  assert.equal(sounds.diagnostics().spatialSupported, true);
  sounds.setAmbientProfile({ gain: 0.82, rate: 0.98 });
  assert.equal(sounds.play("window.open"), true);
  assert.equal(stats.starts, 1);
  assert.equal(stats.rates.at(-1), 0.98);
  assert.ok(stats.gains.at(-1) > 0 && stats.gains.at(-1) < DEFAULT_SOUND_PREFERENCES.master);
  assert.deepEqual(sounds.diagnostics().ambient, { gain: 0.82, rate: 0.98 });
  sounds.setPreferences({ silent: true });
  assert.equal(sounds.play("window.close"), false);
  assert.equal(stats.starts, 1);
  sounds.setPreferences({ silent: false });
  sounds.setPreferences({ enabled: false });
  assert.equal(sounds.play("window.close"), false);
  assert.equal(stats.starts, 1);
  sounds.destroy();
  assert.equal(stats.closes, 1);
  assert.equal(document.listeners.size, 0);
});

test("adaptive tone and media ducking protect Spotify and other playback", async () => {
  let now = 1000;
  const document = fakeDocument();
  const { FakeAudioContext, stats } = fakeAudioHarness();
  const runtime = {
    AudioContext: FakeAudioContext,
    document,
    localStorage: memoryStorage(),
    performance: { now: () => now }
  };
  const sounds = createSoundManager({ runtime, document, storage: runtime.localStorage });
  await sounds.unlock();
  sounds.setAdaptiveProfile({ tone: -1.1, context: "focus", theme: "night" });
  assert.equal(sounds.play("window.open"), true);
  const baseline = stats.gains.at(-1);
  assert.equal(stats.tones.at(-1), -1.1);
  assert.deepEqual(sounds.diagnostics().adaptive, { tone: -1.1, context: "focus", theme: "night" });

  now += 500;
  sounds.setMediaActivity("spotify", true);
  assert.equal(sounds.play("window.open"), true);
  assert.ok(Math.abs(stats.gains.at(-1) - (baseline * 0.38)) < 1e-10);
  assert.equal(sounds.diagnostics().ducking.source, "spotify");

  now += 500;
  sounds.setMediaActivity("spotify", false);
  sounds.setMediaActivity("external-player", true);
  assert.equal(sounds.play("window.open"), true);
  assert.ok(Math.abs(stats.gains.at(-1) - (baseline * 0.55)) < 1e-10);
  assert.equal(sounds.diagnostics().ducking.source, "external-player");

  sounds.setMediaActivity("external-player", false);
  assert.equal(sounds.diagnostics().ducking.gain, 1);
  sounds.destroy();
});

test("media elements, integration signals and the desktop audio bridge drive ducking without polling", () => {
  const document = fakeDocument();
  let bridgeSubscriber = null;
  let bridgeCleanups = 0;
  const sounds = createSoundManager({
    document,
    storage: memoryStorage(),
    runtime: {
      document,
      ETHONEAudioActivity: {
        subscribe(subscriber) {
          bridgeSubscriber = subscriber;
          return () => { bridgeCleanups += 1; };
        }
      }
    }
  });
  const media = { tagName: "AUDIO", paused: false, ended: false, muted: false, volume: 1, dataset: { audioSource: "local-music" } };
  document.listeners.get("play")?.({ target: media });
  assert.equal(sounds.diagnostics().ducking.gain, 0.55);
  media.paused = true;
  document.listeners.get("pause")?.({ target: media });
  assert.equal(sounds.diagnostics().ducking.gain, 1);

  document.listeners.get("ethone:media-activity")?.({ detail: { source: "spotify-web", active: true } });
  assert.equal(sounds.diagnostics().ducking.gain, 0.38);
  document.listeners.get("ethone:media-activity")?.({ detail: { source: "spotify-web", active: false } });
  bridgeSubscriber?.({ source: "desktop-player", active: true });
  assert.equal(sounds.diagnostics().ducking.gain, 0.55);

  sounds.destroy();
  assert.equal(bridgeCleanups, 1);
  assert.equal(document.listeners.size, 0);
});

test("notification origins use StereoPanner and fall back to centered mono", async () => {
  let now = 1000;
  const document = fakeDocument();
  const stereo = fakeAudioHarness();
  const runtime = {
    AudioContext: stereo.FakeAudioContext,
    document,
    innerWidth: 1000,
    localStorage: memoryStorage(),
    performance: { now: () => now },
    requestIdleCallback: () => 1,
    cancelIdleCallback() {}
  };
  const sounds = createSoundManager({ runtime, document, storage: runtime.localStorage });
  await sounds.unlock();
  assert.equal(sounds.playNotification({ type: "info" }), true);
  assert.equal(stereo.stats.pans.at(-1), MAX_SPATIAL_PAN);
  assert.equal(sounds.diagnostics().lastPan, MAX_SPATIAL_PAN);
  now += 400;
  assert.equal(sounds.playNotification({ type: "warning", origin: "left" }), true);
  assert.equal(stereo.stats.pans.at(-1), -MAX_SPATIAL_PAN);
  now += 400;
  assert.equal(sounds.playNotification({ type: "brain", origin: "right" }), true);
  assert.equal(sounds.diagnostics().lastPan, 0);
  now += 400;
  assert.equal(sounds.playAction("v8.notifications.open", { status: "completed" }, {}), true);
  assert.equal(sounds.diagnostics().lastPan, MAX_SPATIAL_PAN);
  now += 400;
  assert.equal(sounds.playAction("v8.tasks.new", { status: "completed" }, {}), true);
  assert.equal(sounds.diagnostics().lastPan, 0);
  sounds.destroy();

  const mono = fakeAudioHarness({ spatial: false });
  const monoDocument = fakeDocument();
  const monoSounds = createSoundManager({
    runtime: { AudioContext: mono.FakeAudioContext, document: monoDocument, performance: { now: () => 2000 } },
    document: monoDocument,
    storage: memoryStorage()
  });
  await monoSounds.unlock();
  assert.equal(monoSounds.diagnostics().spatialSupported, false);
  assert.equal(monoSounds.playNotification({ type: "info", origin: "right" }), true);
  assert.equal(monoSounds.diagnostics().lastPan, 0);
  assert.deepEqual(mono.stats.pans, []);
  monoSounds.destroy();
});

test("sound preferences persist per authenticated owner", () => {
  const storage = memoryStorage();
  const document = fakeDocument();
  const first = createSoundManager({ storage, document, runtime: { document } });
  first.setOwner("user-a");
  first.setPreferences({ pack: "minimal", silent: true, spatial: false, master: 0.31, volumes: { brain: 0.27 } });
  first.destroy();

  const restored = createSoundManager({ storage, document: fakeDocument(), runtime: {} });
  restored.setOwner("user-a");
  assert.equal(restored.preferences().pack, "minimal");
  assert.equal(restored.preferences().silent, true);
  assert.equal(restored.preferences().spatial, false);
  assert.equal(restored.preferences().master, 0.31);
  assert.equal(restored.preferences().volumes.brain, 0.27);
  restored.setOwner("user-b");
  assert.equal(restored.preferences().pack, "ethone");
  restored.destroy();
});

test("only the centralized sound manager owns browser audio APIs", () => {
  const modules = [];
  const visit = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (entry.name.endsWith(".mjs")) modules.push(absolute);
  });
  visit(path.join(ROOT, "v8"));
  const directAudio = modules.filter((file) => file !== path.join(ROOT, "v8", "services", "sound-manager.mjs"))
    .filter((file) => /\b(?:new\s+Audio|AudioContext|webkitAudioContext)\b/.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(directAudio, []);

  const settings = fs.readFileSync(path.join(ROOT, "v8", "pages", "settings.mjs"), "utf8");
  const runtime = fs.readFileSync(path.join(ROOT, "v8", "app", "app-runtime.mjs"), "utf8");
  const actions = fs.readFileSync(path.join(ROOT, "v8", "core", "actions.mjs"), "utf8");
  assert.match(settings, /v8\.sound\.volume/);
  assert.match(settings, /v8\.sound\.silent/);
  assert.match(settings, /v8\.sound\.spatial/);
  assert.match(settings, /v8\.sound\.pack/);
  assert.match(runtime, /createToastManager\(shell\.toastRegion, \{ sounds, presence \}\)/);
  assert.match(actions, /sounds\?\.playAction/);
  const soundManager = fs.readFileSync(path.join(ROOT, "v8", "services", "sound-manager.mjs"), "utf8");
  assert.doesNotMatch(soundManager, /setInterval|MutationObserver/);
});
