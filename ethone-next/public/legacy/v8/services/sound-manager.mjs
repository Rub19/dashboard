export const SOUND_STORAGE_PREFIX = "ethone:v8:sound";
export const MAX_SPATIAL_PAN = 0.07;

export const SOUND_CATEGORIES = Object.freeze(["interface", "notifications", "brain", "system"]);

export const SOUND_PACKS = Object.freeze([
  Object.freeze({ id: "ethone", label: "ETHONE", description: "Signature douce et lumineuse.", icon: "music" }),
  Object.freeze({ id: "minimal", label: "Minimal", description: "Retours courts et presque tactiles.", icon: "audio-lines" }),
  Object.freeze({ id: "classic", label: "Classic", description: "Tonalite chaleureuse et familiere.", icon: "disc" }),
  Object.freeze({ id: "apple-inspired", label: "Apple Inspired", description: "Clarté cristalline, composition originale.", icon: "sparkles" }),
  Object.freeze({ id: "cyber-pulse", label: "Cyber Pulse", description: "Tonalités néon synthétiques et futuristes.", icon: "zap" }),
  Object.freeze({ id: "silent", label: "Silent", description: "Aucun retour sonore.", icon: "volume-x" })
]);

export const DEFAULT_SOUND_PREFERENCES = Object.freeze({
  enabled: true,
  silent: false,
  spatial: true,
  pack: "ethone",
  master: 0.22,
  volumes: Object.freeze({ interface: 0.58, notifications: 0.68, brain: 0.56, system: 0.62 })
});

export const SOUND_EVENTS = Object.freeze({
  "window.open": Object.freeze({ cue: "open", category: "interface", gain: 0.72 }),
  "window.close": Object.freeze({ cue: "close", category: "interface", gain: 0.62 }),
  "modal.open": Object.freeze({ cue: "open", category: "interface", gain: 0.66, spatial: "center" }),
  "modal.close": Object.freeze({ cue: "close", category: "interface", gain: 0.58, spatial: "center" }),
  "space.change": Object.freeze({ cue: "launch", category: "system", gain: 0.78 }),
  "flow.change": Object.freeze({ cue: "launch", category: "system", gain: 0.72 }),
  "dashboard.change": Object.freeze({ cue: "open", category: "system", gain: 0.66 }),
  "brain.open": Object.freeze({ cue: "brain", category: "brain", gain: 0.68, spatial: "center" }),
  "brain.thinking": Object.freeze({ cue: "pulse", category: "brain", gain: 0.42, minInterval: 900, spatial: "center" }),
  "brain.respond": Object.freeze({ cue: "brain", category: "brain", gain: 0.58, spatial: "center" }),
  "brain.complete": Object.freeze({ cue: "confirm", category: "brain", gain: 0.66, spatial: "center" }),
  "brain.error": Object.freeze({ cue: "error", category: "brain", gain: 0.58, spatial: "center" }),
  "marketplace.open": Object.freeze({ cue: "open", category: "interface", gain: 0.68 }),
  "settings.open": Object.freeze({ cue: "open", category: "interface", gain: 0.62 }),
  "note.create": Object.freeze({ cue: "confirm", category: "interface", gain: 0.58 }),
  "delete": Object.freeze({ cue: "close", category: "system", gain: 0.72 }),
  "save.start": Object.freeze({ cue: "touch", category: "system", gain: 0.38, minInterval: 500 }),
  "save.complete": Object.freeze({ cue: "confirm", category: "system", gain: 0.56, minInterval: 260 }),
  "sync.start": Object.freeze({ cue: "pulse", category: "system", gain: 0.44, minInterval: 500 }),
  "sync.success": Object.freeze({ cue: "confirm", category: "system", gain: 0.62 }),
  "system.error": Object.freeze({ cue: "error", category: "system", gain: 0.72, minInterval: 300 }),
  "system.warning": Object.freeze({ cue: "warning", category: "system", gain: 0.66, minInterval: 300 }),
  "notification.info": Object.freeze({ cue: "notice", category: "notifications", gain: 0.54, minInterval: 180, spatial: "right" }),
  "notification.success": Object.freeze({ cue: "confirm", category: "notifications", gain: 0.62, minInterval: 180, spatial: "right" }),
  "notification.error": Object.freeze({ cue: "error", category: "notifications", gain: 0.68, minInterval: 300, spatial: "right" }),
  "notification.warning": Object.freeze({ cue: "warning", category: "notifications", gain: 0.62, minInterval: 300, spatial: "right" }),
  "notification.sync": Object.freeze({ cue: "pulse", category: "notifications", gain: 0.46, minInterval: 500, spatial: "right" }),
  "notification.update": Object.freeze({ cue: "launch", category: "notifications", gain: 0.58, minInterval: 300, spatial: "right" }),
  "auth.login": Object.freeze({ cue: "launch", category: "system", gain: 0.7 }),
  "auth.logout": Object.freeze({ cue: "close", category: "system", gain: 0.64 }),
  "onboarding.complete": Object.freeze({ cue: "launch", category: "system", gain: 0.74 }),
  "widget.install": Object.freeze({ cue: "confirm", category: "system", gain: 0.62 }),
  "widget.uninstall": Object.freeze({ cue: "close", category: "system", gain: 0.62 }),
  "drag.drop": Object.freeze({ cue: "touch", category: "interface", gain: 0.5, minInterval: 160 }),
  "hover.important": Object.freeze({ cue: "touch", category: "interface", gain: 0.22, minInterval: 680 }),
  "command.open": Object.freeze({ cue: "open", category: "interface", gain: 0.62, spatial: "center" }),
  "command.close": Object.freeze({ cue: "close", category: "interface", gain: 0.54, spatial: "center" }),
  "profile.enter": Object.freeze({ cue: "launch", category: "system", gain: 0.68 }),
  "settings.preview": Object.freeze({ cue: "notice", category: "interface", gain: 0.62 }),
  "action.execute": Object.freeze({ cue: "touch", category: "interface", gain: 0.52, minInterval: 120 }),
  "button.click": Object.freeze({ cue: "touch", category: "interface", gain: 0.38, minInterval: 120 }),
  "tab.switch": Object.freeze({ cue: "notice", category: "interface", gain: 0.44, minInterval: 150 }),
  "toggle.switch": Object.freeze({ cue: "confirm", category: "interface", gain: 0.48, minInterval: 150 }),
  "focus.complete": Object.freeze({ cue: "launch", category: "system", gain: 0.78, spatial: "center" }),
  "profile.switch": Object.freeze({ cue: "confirm", category: "system", gain: 0.62 })
});

const PACK_PROFILES = Object.freeze({
  ethone: Object.freeze({ pitch: 1, harmonic: 0.2, air: 0.014, release: 1 }),
  minimal: Object.freeze({ pitch: 1.08, harmonic: 0.08, air: 0, release: 0.72 }),
  classic: Object.freeze({ pitch: 0.82, harmonic: 0.28, air: 0.006, release: 1.12 }),
  "apple-inspired": Object.freeze({ pitch: 1.18, harmonic: 0.14, air: 0.01, release: 1.04 }),
  "cyber-pulse": Object.freeze({ pitch: 1.28, harmonic: 0.34, air: 0.018, release: 0.92 }),
  silent: Object.freeze({ pitch: 1, harmonic: 0, air: 0, release: 0 })
});

const CUE_RECIPES = Object.freeze({
  open: Object.freeze({ duration: 0.15, tones: Object.freeze([[440, 590, 0, 0.13, 0.74], [660, 760, 0.025, 0.1, 0.32]]) }),
  close: Object.freeze({ duration: 0.13, tones: Object.freeze([[540, 390, 0, 0.12, 0.7], [740, 570, 0, 0.09, 0.22]]) }),
  confirm: Object.freeze({ duration: 0.18, tones: Object.freeze([[520, 650, 0, 0.12, 0.56], [780, 880, 0.055, 0.115, 0.44]]) }),
  notice: Object.freeze({ duration: 0.19, tones: Object.freeze([[620, 650, 0, 0.15, 0.58], [920, 960, 0.035, 0.11, 0.3]]) }),
  warning: Object.freeze({ duration: 0.22, tones: Object.freeze([[330, 300, 0, 0.1, 0.62], [420, 390, 0.1, 0.1, 0.5]]) }),
  error: Object.freeze({ duration: 0.2, tones: Object.freeze([[300, 230, 0, 0.18, 0.7], [450, 340, 0.018, 0.13, 0.22]]) }),
  brain: Object.freeze({ duration: 0.27, tones: Object.freeze([[410, 560, 0, 0.22, 0.45], [690, 910, 0.045, 0.18, 0.3], [980, 1110, 0.1, 0.12, 0.2]]) }),
  pulse: Object.freeze({ duration: 0.12, tones: Object.freeze([[470, 520, 0, 0.1, 0.62]]) }),
  touch: Object.freeze({ duration: 0.065, tones: Object.freeze([[360, 300, 0, 0.055, 0.7]]) }),
  launch: Object.freeze({ duration: 0.3, tones: Object.freeze([[330, 470, 0, 0.22, 0.45], [520, 720, 0.055, 0.2, 0.38], [780, 980, 0.12, 0.16, 0.24]]) })
});

const ESSENTIAL_EVENTS = Object.freeze([
  "window.open",
  "window.close",
  "notification.info",
  "notification.success",
  "notification.error",
  "command.open",
  "command.close",
  "tab.switch",
  "toggle.switch"
]);

const ACTION_EVENT_MAP = Object.freeze({
  "v8.home.open": "dashboard.change",
  "v8.notes.open": "dashboard.change",
  "v8.tasks.open": "dashboard.change",
  "v8.calendar.open": "dashboard.change",
  "v8.files.open": "dashboard.change",
  "v8.activity.open": "dashboard.change",
  "v8.connections.open": "dashboard.change",
  "v8.spaces.open": "space.change",
  "v8.flows.open": "flow.change",
  "v8.brain.open": "brain.open",
  "v8.settings.open": "settings.open",
  "v8.changelog.open": "window.open",
  "v8.widgets.open": "window.open",
  "v8.profile.open": "window.open",
  "v8.notifications.open": "window.open",
  "v8.panel.close": "window.close",
  "v8.command.open": "command.open",
  "v8.command.close": "command.close",
  "v8.mission.open": "window.open",
  "v8.mission.close": "window.close",
  "v8.sidebar.toggle": "hover.important",
  "v8.theme.toggle": "settings.preview",
  "v8.theme.night": "settings.preview",
  "v8.theme.graphite": "settings.preview",
  "v8.theme.day": "settings.preview",
  "v8.theme.auto": "settings.preview",
  "v8.zen.toggle": "settings.preview",
  "v8.dock.scale": "settings.preview",
  "v8.dock.scale.compact": "settings.preview",
  "v8.dock.scale.normal": "settings.preview",
  "v8.dock.scale.large": "settings.preview",
  "v8.density.toggle": "settings.preview",
  "v8.spotlight.toggle": "settings.preview",
  "v8.motion.ambient.toggle": "settings.preview",
  "v8.motion.blur.toggle": "settings.preview",
  "v8.notes.delete": "modal.open",
  "v8.notes.delete.cancel": "modal.close",
  "v8.tasks.new": "modal.open",
  "v8.tasks.new.cancel": "modal.close",
  "v8.calendar.new": "modal.open",
  "v8.calendar.new.cancel": "modal.close",
  "v8.files.new-link": "modal.open",
  "v8.files.new-folder": "modal.open",
  "v8.files.new.cancel": "modal.close",
  "v8.sync.refresh": "sync.start",
  "v8.auth.signout": "auth.logout"
});

const ACTION_SPATIAL_MAP = Object.freeze({
  "v8.widgets.open": "right",
  "v8.profile.open": "right",
  "v8.notifications.open": "right",
  "v8.panel.close": "right",
  "v8.command.open": "center",
  "v8.command.close": "center",
  "v8.mission.open": "center",
  "v8.mission.close": "center",
  "v8.notes.delete": "center",
  "v8.notes.delete.cancel": "center",
  "v8.tasks.new": "center",
  "v8.tasks.new.cancel": "center",
  "v8.calendar.new": "center",
  "v8.calendar.new.cancel": "center",
  "v8.files.new-link": "center",
  "v8.files.new-folder": "center",
  "v8.files.new.cancel": "center"
});

function clamp(value, minimum = 0, maximum = 1) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.min(maximum, Math.max(minimum, number));
}

export function normalizeSpatialPan(value) {
  const named = { left: -MAX_SPATIAL_PAN, center: 0, right: MAX_SPATIAL_PAN };
  if (typeof value === "string" && Object.hasOwn(named, value.toLowerCase())) return named[value.toLowerCase()];
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(clamp(number, -MAX_SPATIAL_PAN, MAX_SPATIAL_PAN).toFixed(4));
}

export function spatialPanFromRect(rect = {}, viewportWidth = 0) {
  const width = Math.max(1, Number(viewportWidth) || 1);
  const center = Number(rect.left) + ((Number(rect.width) || 0) / 2);
  if (!Number.isFinite(center)) return 0;
  const position = clamp(((center / width) * 2) - 1, -1, 1);
  return Math.abs(position) < 0.18 ? 0 : normalizeSpatialPan(position * MAX_SPATIAL_PAN);
}

export function soundPanForEvent(eventName, options = {}) {
  const definition = SOUND_EVENTS[eventName];
  if (!definition) return 0;
  if (definition.spatial === "center") return 0;
  return normalizeSpatialPan(options.pan ?? options.spatial ?? options.origin ?? definition.spatial ?? "center");
}

function packExists(pack) {
  return SOUND_PACKS.some((entry) => entry.id === pack);
}

export function normalizeSoundPreferences(input = {}) {
  const volumes = input.volumes && typeof input.volumes === "object" ? input.volumes : {};
  return Object.freeze({
    enabled: input.enabled !== false,
    silent: input.silent === true,
    spatial: input.spatial !== false,
    pack: packExists(input.pack) ? input.pack : DEFAULT_SOUND_PREFERENCES.pack,
    master: clamp(input.master ?? DEFAULT_SOUND_PREFERENCES.master),
    volumes: Object.freeze(Object.fromEntries(SOUND_CATEGORIES.map((category) => [
      category,
      clamp(volumes[category] ?? DEFAULT_SOUND_PREFERENCES.volumes[category])
    ])))
  });
}

export function soundEventForAction(actionId, result = {}) {
  if (result?.status === "failed") return "system.error";
  const id = String(actionId || "");
  if (ACTION_EVENT_MAP[id]) return ACTION_EVENT_MAP[id];
  if (id.startsWith("v8.space.")) return "space.change";
  if (id.startsWith("v8.dashboard.")) return "dashboard.change";
  if (id.startsWith("v8.flow.")) return "flow.change";
  if (id.includes("marketplace") && id.endsWith(".open")) return "marketplace.open";
  if (id.includes("widget") && id.includes("install")) return id.includes("uninstall") ? "widget.uninstall" : "widget.install";
  if (id.endsWith(".cancel") || id.endsWith(".close")) return "modal.close";
  if (id.endsWith(".open")) return id.includes("brain") ? "brain.open" : id.includes("settings") ? "settings.open" : "dashboard.change";
  if (id.endsWith(".new") || id.endsWith(".create") || id.endsWith(".add")) return "note.create";
  if (id.endsWith(".delete") || id.endsWith(".remove") || id.endsWith(".signout")) return "delete";
  if (id.endsWith(".toggle") || id.endsWith(".cycle") || id.endsWith(".set") || id.endsWith(".scale") || id.includes(".theme.") || id.includes(".density.") || id.includes(".dock.") || id.includes(".zen.") || id.includes(".sidebar.") || id.includes(".spotlight.") || id.includes(".motion.") || id.includes(".accent.") || id.includes(".appearance.") || id.includes(".sound.") || id.includes(".automation.")) return "settings.preview";
  if (id.includes("spotify")) return "hover.important";
  return "action.execute";
}

export function soundEventForNotification(type, notice = {}) {
  const normalized = String(type || "info").toLowerCase();
  const id = String(notice.id || "").toLowerCase();
  if (id.includes("notes-created")) return "note.create";
  if (id.includes("saved")) return "save.complete";
  if (id.includes("deleted") || id.includes("removed")) return "delete";
  if (id.includes("widget-installed")) return "widget.install";
  if (id.includes("widget-uninstalled")) return "widget.uninstall";
  if (id.includes("onboarding") && normalized === "success") return "onboarding.complete";
  if (id === "sync-refresh" && normalized === "success") return "sync.success";
  if (id === "sync-refresh" && normalized === "error") return "system.error";
  if (["success", "error", "warning", "sync", "update"].includes(normalized)) return `notification.${normalized}`;
  if (normalized === "brain") return "brain.respond";
  if (normalized === "loading") return "sync.start";
  return "notification.info";
}

function storageKey(owner) {
  return `${SOUND_STORAGE_PREFIX}:${encodeURIComponent(String(owner || "guest"))}`;
}

function readPreferences(storage, owner) {
  try {
    const value = storage?.getItem?.(storageKey(owner));
    return normalizeSoundPreferences(value ? JSON.parse(value) : {});
  } catch {
    return normalizeSoundPreferences();
  }
}

function renderCue(context, cue, packId) {
  const recipe = CUE_RECIPES[cue] || CUE_RECIPES.touch;
  const profile = PACK_PROFILES[packId] || PACK_PROFILES.ethone;
  const sampleRate = Math.max(8000, Number(context.sampleRate) || 44100);
  const duration = Math.max(0.04, recipe.duration * profile.release);
  const frameCount = Math.max(1, Math.ceil(duration * sampleRate));
  const buffer = context.createBuffer(1, frameCount, sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1729;

  for (const tone of recipe.tones) {
    const [from, to, start, toneDuration, level] = tone;
    const adjustedStart = start * profile.release;
    const adjustedDuration = toneDuration * profile.release;
    let phase = 0;
    for (let frame = Math.max(0, Math.floor(adjustedStart * sampleRate)); frame < frameCount; frame += 1) {
      const time = frame / sampleRate;
      const local = time - adjustedStart;
      if (local > adjustedDuration) break;
      const progress = clamp(local / adjustedDuration);
      const frequency = (from + ((to - from) * progress)) * profile.pitch;
      phase += (Math.PI * 2 * frequency) / sampleRate;
      const attack = Math.min(1, local / Math.min(0.012, adjustedDuration * 0.24));
      const release = Math.pow(Math.max(0, 1 - progress), 2.15);
      const fundamental = Math.sin(phase);
      const overtone = Math.sin((phase * 2.01) + 0.28) * profile.harmonic;
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const air = (((seed / 4294967296) * 2) - 1) * profile.air;
      data[frame] += (fundamental + overtone + air) * attack * release * level;
    }
  }

  let peak = 0;
  for (let index = 0; index < data.length; index += 1) peak = Math.max(peak, Math.abs(data[index]));
  const scale = peak > 0.88 ? 0.88 / peak : 1;
  if (scale !== 1) for (let index = 0; index < data.length; index += 1) data[index] *= scale;
  return buffer;
}

export function createSoundManager(options = {}) {
  const runtime = options.runtime || globalThis;
  const documentRef = options.document || runtime.document || null;
  const storage = options.storage || runtime.localStorage || null;
  let owner = String(options.owner || "guest");
  let preferences = readPreferences(storage, owner);
  let ambientProfile = Object.freeze({ gain: 1, rate: 1 });
  let adaptiveProfile = Object.freeze({ tone: 0, context: "neutral", theme: "graphite" });
  let audioContext = null;
  let destroyed = false;
  let unlocked = false;
  let idleHandle = 0;
  let persistTimer = 0;
  let playedCount = 0;
  let droppedCount = 0;
  let lastEvent = null;
  let lastPan = 0;
  let bridgeCleanup = null;
  const cache = new Map();
  const lastPlayedAt = new Map();
  const signaledMedia = new Set();
  const activeMediaElements = new Map();
  const subscribers = new Set();

  function contextConstructor() {
    return options.AudioContext || runtime.AudioContext || runtime.webkitAudioContext || null;
  }

  function supported() {
    return Boolean(contextConstructor());
  }

  function spatialSupported() {
    const AudioContext = contextConstructor();
    return Boolean(audioContext?.createStereoPanner || AudioContext?.prototype?.createStereoPanner);
  }

  function normalizeMediaSource(value) {
    return String(value || "external")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "external";
  }

  function mediaElementSource(element) {
    return normalizeMediaSource(element?.dataset?.audioSource || element?.dataset?.integration || element?.tagName || "media");
  }

  function activeMediaSources() {
    const sources = new Set(signaledMedia);
    activeMediaElements.forEach((source) => sources.add(source));
    if (runtime.navigator?.mediaSession?.playbackState === "playing") sources.add("media-session");
    return [...sources];
  }

  function duckingProfile() {
    const sources = activeMediaSources();
    const spotify = sources.some((source) => source.includes("spotify"));
    return Object.freeze({
      active: sources.length > 0,
      gain: spotify ? 0.38 : (sources.length ? 0.55 : 1),
      source: spotify ? "spotify" : (sources[0] || "none"),
      sources: Object.freeze(sources)
    });
  }

  function setMediaActivity(source, active = true) {
    const normalized = normalizeMediaSource(source);
    if (active) signaledMedia.add(normalized);
    else signaledMedia.delete(normalized);
    return duckingProfile();
  }

  function handleMediaElementState(event) {
    const media = event?.target;
    if (!media || !/^(?:AUDIO|VIDEO)$/.test(String(media.tagName || "").toUpperCase())) return;
    const active = !media.paused && !media.ended && !media.muted && Number(media.volume ?? 1) > 0;
    if (active) activeMediaElements.set(media, mediaElementSource(media));
    else activeMediaElements.delete(media);
  }

  function handleMediaActivitySignal(event) {
    const detail = event?.detail && typeof event.detail === "object" ? event.detail : {};
    setMediaActivity(detail.source || "external", detail.active !== false);
  }

  function connectAudioActivityBridge() {
    const bridge = options.audioActivity || runtime.ETHONEAudioActivity;
    if (typeof bridge?.subscribe !== "function") return;
    try {
      const cleanup = bridge.subscribe((activity = {}) => setMediaActivity(activity.source || "external", activity.active !== false));
      if (typeof cleanup === "function") bridgeCleanup = cleanup;
    } catch {}
  }

  function persist() {
    try { storage?.setItem?.(storageKey(owner), JSON.stringify(preferences)); } catch {}
  }

  function schedulePersist() {
    if (persistTimer) runtime.clearTimeout?.(persistTimer);
    persistTimer = runtime.setTimeout?.(() => {
      persistTimer = 0;
      persist();
    }, 140) || 0;
    if (!persistTimer) persist();
  }

  function announce() {
    subscribers.forEach((subscriber) => {
      try { subscriber(preferences); } catch {}
    });
  }

  function ensureContext() {
    if (audioContext || destroyed || !preferences.enabled || preferences.silent || preferences.pack === "silent") return audioContext;
    const AudioContext = contextConstructor();
    if (!AudioContext) return null;
    try { audioContext = new AudioContext({ latencyHint: "interactive" }); }
    catch {
      try { audioContext = new AudioContext(); } catch { audioContext = null; }
    }
    unlocked = Boolean(audioContext);
    return audioContext;
  }

  function removeUnlockListeners() {
    documentRef?.removeEventListener?.("pointerdown", handleFirstGesture, true);
    documentRef?.removeEventListener?.("keydown", handleFirstGesture, true);
  }

  function schedulePreload() {
    if (idleHandle || destroyed || !audioContext) return;
    const run = () => {
      idleHandle = 0;
      preload(ESSENTIAL_EVENTS);
    };
    if (typeof runtime.requestIdleCallback === "function") idleHandle = runtime.requestIdleCallback(run, { timeout: 900 });
    else idleHandle = runtime.setTimeout?.(run, 80) || 0;
  }

  async function unlock() {
    const context = ensureContext();
    if (!context) return false;
    removeUnlockListeners();
    try {
      if (context.state === "suspended") await context.resume?.();
    } catch {}
    unlocked = context.state !== "closed";
    if (unlocked) schedulePreload();
    return unlocked;
  }

  function handleFirstGesture() {
    if (!preferences.enabled || preferences.silent || preferences.pack === "silent") return;
    void unlock();
  }

  function handleImportantHover(event) {
    if (!event.target?.closest?.("[data-sound-hover='important']")) return;
    play("hover.important");
  }

  function handleDrop(event) {
    if (!event.target?.closest?.("[data-sound-drop]")) return;
    play("drag.drop");
  }

  function handleInteractiveClick(event) {
    const target = event.target?.closest?.("button, [role='button'], [role='tab'], [role='switch'], input[type='checkbox'], input[type='radio'], a[href]");
    if (!target || !documentRef?.contains?.(target) || target.disabled || target.getAttribute?.("aria-disabled") === "true") return;
    if (target.dataset?.soundClick === "false" || target.dataset?.soundClick === "none" || target.dataset?.sound === "false") return;
    if (target.dataset?.soundClick && SOUND_EVENTS[target.dataset.soundClick]) {
      play(target.dataset.soundClick);
      return;
    }
    if (target.dataset?.action || target.closest?.("[data-action]")) return;
    const role = target.getAttribute?.("role");
    if (role === "tab" || target.dataset?.settingsSection || target.dataset?.brainTab || target.classList?.contains?.("v8-brain-tab") || target.classList?.contains?.("v8-settings-nav-button") || target.dataset?.taskStatus || target.dataset?.notesFilter || target.dataset?.filesFilter || target.dataset?.activityTab) {
      play("tab.switch");
    } else if (role === "switch" || target.type === "checkbox" || target.type === "radio" || target.dataset?.automationToggle) {
      play("toggle.switch");
    } else if (target.tagName === "BUTTON" || role === "button" || target.classList?.contains?.("v8-button") || target.classList?.contains?.("v8-icon-button")) {
      play("button.click");
    }
  }

  function bufferFor(eventName, packId = preferences.pack) {
    const definition = SOUND_EVENTS[eventName];
    if (!audioContext || !definition || packId === "silent") return null;
    const key = `${packId}:${definition.cue}`;
    if (!cache.has(key)) cache.set(key, renderCue(audioContext, definition.cue, packId));
    return cache.get(key);
  }

  function preload(events = ESSENTIAL_EVENTS) {
    if (!audioContext || !preferences.enabled || preferences.silent || preferences.pack === "silent") return 0;
    let prepared = 0;
    [...new Set(events)].forEach((eventName) => {
      if (SOUND_EVENTS[eventName] && bufferFor(eventName)) prepared += 1;
    });
    return prepared;
  }

  function play(eventName, playOptions = {}) {
    const definition = SOUND_EVENTS[eventName];
    const packId = packExists(playOptions.pack) ? playOptions.pack : preferences.pack;
    if (!definition || destroyed || !unlocked || !audioContext || !preferences.enabled || preferences.silent || packId === "silent") {
      droppedCount += 1;
      return false;
    }
    if (documentRef?.visibilityState === "hidden") return false;
    const now = Number(runtime.performance?.now?.() ?? Date.now());
    const minimum = Number(definition.minInterval) || 90;
    if (now - (lastPlayedAt.get(eventName) || -Infinity) < minimum) return false;
    const categoryVolume = preferences.volumes[definition.category] ?? 1;
    const critical = eventName.includes("error") || eventName.includes("warning");
    const ambientGain = critical ? Math.max(0.9, ambientProfile.gain) : ambientProfile.gain;
    const ducking = duckingProfile();
    const volume = clamp(preferences.master * categoryVolume * definition.gain * ambientGain * ducking.gain * (playOptions.gain ?? 1));
    if (volume <= 0.0001) return false;
    const buffer = bufferFor(eventName, packId);
    if (!buffer) return false;
    let source = null;
    let gain = null;
    let filter = null;
    let panner = null;
    try {
      if (audioContext.state === "suspended") void audioContext.resume?.().catch?.(() => {});
      source = audioContext.createBufferSource();
      gain = audioContext.createGain();
      source.buffer = buffer;
      const playbackRate = critical ? 1 : ambientProfile.rate;
      if (source.playbackRate?.setValueAtTime) source.playbackRate.setValueAtTime(playbackRate, audioContext.currentTime);
      else if (source.playbackRate) source.playbackRate.value = playbackRate;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      if (Math.abs(adaptiveProfile.tone) > 0.01 && typeof audioContext.createBiquadFilter === "function") {
        try {
          filter = audioContext.createBiquadFilter();
          filter.type = "highshelf";
          filter.frequency?.setValueAtTime?.(2400, audioContext.currentTime);
          filter.gain?.setValueAtTime?.(adaptiveProfile.tone, audioContext.currentTime);
        } catch { filter = null; }
      }
      const requestedPan = preferences.spatial ? soundPanForEvent(eventName, playOptions) : 0;
      if (preferences.spatial && Math.abs(requestedPan) > 0.0001 && typeof audioContext.createStereoPanner === "function") {
        try {
          panner = audioContext.createStereoPanner();
          if (panner.pan?.setValueAtTime) panner.pan.setValueAtTime(requestedPan, audioContext.currentTime);
          else if (panner.pan) panner.pan.value = requestedPan;
        } catch { panner = null; }
      }
      source.connect(gain);
      let output = gain;
      if (filter) {
        gain.connect(filter);
        output = filter;
      }
      if (panner) {
        output.connect(panner);
        panner.connect(audioContext.destination);
      } else {
        output.connect(audioContext.destination);
      }
      source.addEventListener?.("ended", () => {
        try { source.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
        try { filter?.disconnect(); } catch {}
        try { panner?.disconnect(); } catch {}
      }, { once: true });
      source.start();
      lastPlayedAt.set(eventName, now);
      lastEvent = eventName;
      lastPan = panner ? requestedPan : 0;
      playedCount += 1;
      return true;
    } catch {
      try { source?.disconnect(); } catch {}
      try { gain?.disconnect(); } catch {}
      try { filter?.disconnect(); } catch {}
      try { panner?.disconnect(); } catch {}
      droppedCount += 1;
      return false;
    }
  }

  function playAction(actionId, result, context) {
    const eventName = soundEventForAction(actionId, result, context);
    if (!eventName) return false;
    const explicit = context?.spatial ?? context?.origin ?? ACTION_SPATIAL_MAP[actionId];
    const rect = explicit == null ? context?.element?.getBoundingClientRect?.() : null;
    const spatial = explicit ?? (rect ? spatialPanFromRect(rect, runtime.innerWidth || documentRef?.documentElement?.clientWidth) : undefined);
    return play(eventName, { spatial });
  }

  function playNotification(notice = {}) {
    if (notice.sound === false) return false;
    return play(notice.sound || soundEventForNotification(notice.type, notice), {
      spatial: notice.spatial ?? notice.origin ?? "right"
    });
  }

  async function preview(packId = preferences.pack) {
    if (!preferences.enabled || preferences.silent) return false;
    const ready = await unlock();
    return ready ? play("settings.preview", { pack: packId }) : false;
  }

  function exportWav(packId = preferences.pack) {
    try {
      const sampleRate = 44100;
      const fakeContext = {
        sampleRate,
        createBuffer(channels, length) {
          const data = new Float32Array(length);
          return { getChannelData: () => data };
        }
      };
      const cues = ["launch", "open", "confirm", "notice"];
      const gapSamples = Math.floor(sampleRate * 0.28);
      const rendered = cues.map((cue) => renderCue(fakeContext, cue, packId).getChannelData(0));
      const totalSamples = rendered.reduce((sum, arr) => sum + arr.length + gapSamples, 0);
      const combined = new Float32Array(totalSamples);
      let offset = 0;
      for (const arr of rendered) {
        combined.set(arr, offset);
        offset += arr.length + gapSamples;
      }

      const wavBuffer = new ArrayBuffer(44 + combined.length * 2);
      const view = new DataView(wavBuffer);
      const writeString = (pos, str) => {
        for (let i = 0; i < str.length; i += 1) view.setUint8(pos + i, str.charCodeAt(i));
      };
      writeString(0, "RIFF");
      view.setUint32(4, 36 + combined.length * 2, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, "data");
      view.setUint32(40, combined.length * 2, true);

      let wavOffset = 44;
      for (let i = 0; i < combined.length; i += 1, wavOffset += 2) {
        const s = Math.max(-1, Math.min(1, combined[i]));
        view.setInt16(wavOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }

      if (typeof document !== "undefined" && typeof URL !== "undefined") {
        const blob = new Blob([wavBuffer], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `ethone-soundpack-${packId || "ethone"}.wav`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function setPreferences(patch = {}) {
    const next = normalizeSoundPreferences({
      ...preferences,
      ...patch,
      volumes: { ...preferences.volumes, ...(patch.volumes || {}) }
    });
    const changed = JSON.stringify(next) !== JSON.stringify(preferences);
    preferences = next;
    if (!changed) return preferences;
    schedulePersist();
    announce();
    return preferences;
  }

  function setAmbientProfile(patch = {}) {
    ambientProfile = Object.freeze({
      gain: clamp(patch.gain ?? ambientProfile.gain, 0.65, 1.05),
      rate: clamp(patch.rate ?? ambientProfile.rate, 0.96, 1.04)
    });
    return ambientProfile;
  }

  let activeAmbienceNode = null;
  let activeAmbienceGain = null;
  let activeAmbienceType = "none";

  function notifyAmbience(type) {
    subscribers.forEach((subscriber) => {
      try { subscriber({ ...preferences, ambience: type }); } catch {}
    });
  }

  function stopAmbience() {
    if (activeAmbienceGain && audioContext) {
      try {
        activeAmbienceGain.gain.setValueAtTime(activeAmbienceGain.gain.value, audioContext.currentTime);
        activeAmbienceGain.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.4);
        const node = activeAmbienceNode;
        setTimeout(() => {
          try { node?.stop?.(); node?.disconnect?.(); } catch {}
        }, 450);
      } catch {}
    }
    activeAmbienceNode = null;
    activeAmbienceGain = null;
    activeAmbienceType = "none";
    notifyAmbience("none");
    return "none";
  }

  function startAmbience(type = "rain") {
    if (activeAmbienceType === type) {
      return stopAmbience();
    }
    stopAmbience();
    void unlock();
    const ctx = audioContext;
    if (!ctx) {
      activeAmbienceType = type;
      notifyAmbience(type);
      return type;
    }
    try {
      const duration = 4;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (type === "rain") {
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (last + (0.02 * white)) / 1.02;
          last = data[i];
          data[i] *= 2.5;
        }
      } else if (type === "pink") {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11;
          b6 = white * 0.115926;
        }
      } else if (type === "drone") {
        for (let i = 0; i < bufferSize; i++) {
          const t = i / ctx.sampleRate;
          data[i] = (Math.sin(2 * Math.PI * 110 * t) * 0.3 + Math.sin(2 * Math.PI * 165 * t) * 0.2 + Math.sin(2 * Math.PI * 220 * t) * 0.15) * (0.8 + Math.sin(2 * Math.PI * 0.2 * t) * 0.2);
        }
      } else {
        return stopAmbience();
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = type === "rain" ? 850 : type === "drone" ? 420 : 1800;

      const gain = ctx.createGain();
      const targetVolume = type === "drone" ? 0.08 : 0.06;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(targetVolume * (preferences.master || 0.8), ctx.currentTime + 1.2);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      activeAmbienceNode = source;
      activeAmbienceGain = gain;
      activeAmbienceType = type;
      notifyAmbience(type);
      return type;
    } catch {
      activeAmbienceType = type;
      notifyAmbience(type);
      return type;
    }
  }

  function getAmbienceState() {
    return Object.freeze({
      active: activeAmbienceType !== "none",
      type: activeAmbienceType
    });
  }

  function setAdaptiveProfile(patch = {}) {
    adaptiveProfile = Object.freeze({
      tone: clamp(patch.tone ?? adaptiveProfile.tone, -1.4, 0.7),
      context: normalizeMediaSource(patch.context || adaptiveProfile.context || "neutral"),
      theme: normalizeMediaSource(patch.theme || adaptiveProfile.theme || "graphite")
    });
    return adaptiveProfile;
  }

  function setOwner(nextOwner) {
    const normalizedOwner = String(nextOwner || "guest");
    if (normalizedOwner === owner) return preferences;
    if (persistTimer) {
      runtime.clearTimeout?.(persistTimer);
      persistTimer = 0;
      persist();
    }
    owner = normalizedOwner;
    preferences = readPreferences(storage, owner);
    cache.clear();
    announce();
    return preferences;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  function diagnostics() {
    return Object.freeze({
      supported: supported(),
      spatialSupported: spatialSupported(),
      unlocked,
      enabled: preferences.enabled,
      silent: preferences.silent,
      spatialEnabled: preferences.spatial,
      pack: preferences.pack,
      cacheEntries: cache.size,
      playedCount,
      droppedCount,
      lastEvent,
      lastPan,
      ambient: ambientProfile,
      adaptive: adaptiveProfile,
      ducking: duckingProfile(),
      contextState: audioContext?.state || "idle"
    });
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    removeUnlockListeners();
    documentRef?.removeEventListener?.("pointerover", handleImportantHover, true);
    documentRef?.removeEventListener?.("click", handleInteractiveClick, true);
    documentRef?.removeEventListener?.("drop", handleDrop, true);
    ["play", "pause", "ended", "emptied", "volumechange"].forEach((type) => documentRef?.removeEventListener?.(type, handleMediaElementState, true));
    documentRef?.removeEventListener?.("ethone:media-activity", handleMediaActivitySignal);
    try { bridgeCleanup?.(); } catch {}
    bridgeCleanup = null;
    if (idleHandle) {
      if (typeof runtime.cancelIdleCallback === "function") runtime.cancelIdleCallback(idleHandle);
      else runtime.clearTimeout?.(idleHandle);
    }
    idleHandle = 0;
    if (persistTimer) runtime.clearTimeout?.(persistTimer);
    persistTimer = 0;
    persist();
    subscribers.clear();
    cache.clear();
    lastPlayedAt.clear();
    signaledMedia.clear();
    activeMediaElements.clear();
    try { void audioContext?.close?.(); } catch {}
    audioContext = null;
    unlocked = false;
    return true;
  }

  documentRef?.addEventListener?.("pointerdown", handleFirstGesture, { capture: true, passive: true });
  documentRef?.addEventListener?.("keydown", handleFirstGesture, { capture: true });
  documentRef?.addEventListener?.("pointerover", handleImportantHover, { capture: true, passive: true });
  documentRef?.addEventListener?.("click", handleInteractiveClick, { capture: true, passive: true });
  documentRef?.addEventListener?.("drop", handleDrop, { capture: true, passive: true });
  ["play", "pause", "ended", "emptied", "volumechange"].forEach((type) => documentRef?.addEventListener?.(type, handleMediaElementState, { capture: true, passive: true }));
  documentRef?.addEventListener?.("ethone:media-activity", handleMediaActivitySignal);
  connectAudioActivityBridge();

  return Object.freeze({
    unlock,
    play,
    playAction,
    playNotification,
    preview,
    exportWav,
    preload,
    preferences: () => preferences,
    setMediaActivity,
    setPreferences,
    setAmbientProfile,
    setAdaptiveProfile,
    startAmbience,
    stopAmbience,
    getAmbienceState,
    setOwner,
    subscribe,
    diagnostics,
    destroy
  });
}
