import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { createActionFacade } from "../v8/core/actions.mjs";
import { calendarPresenceState, createPresenceEngine, normalizePresenceState } from "../v8/core/presence-engine.mjs";
import { createPresentationStore } from "../v8/core/store.mjs";
import { formatEnvironmentClock, profilePreviewModel } from "../v8/entry/profile-selection.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    read: (key) => values.get(key) ?? null
  };
}

test("Presence Engine follows real state and releases every runtime resource", () => {
  const listeners = new Map();
  const mediaListeners = new Map();
  const timers = new Map();
  const cleared = [];
  let timerId = 0;
  const buttonAttributes = new Map();
  const badge = {
    hidden: true,
    textContent: "",
    closest: () => ({ setAttribute: (name, value) => buttonAttributes.set(name, value) })
  };
  const document = {
    hidden: false,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => { if (listeners.get(type) === listener) listeners.delete(type); },
    querySelectorAll: () => [badge]
  };
  const reducedMotion = {
    matches: false,
    addEventListener: (type, listener) => mediaListeners.set(type, listener),
    removeEventListener: (type, listener) => { if (mediaListeners.get(type) === listener) mediaListeners.delete(type); }
  };
  const runtime = {
    matchMedia: () => reducedMotion,
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => { cleared.push(id); timers.delete(id); }
  };
  const target = { dataset: {} };
  const engine = createPresenceEngine({ document, runtime, target });

  assert.deepEqual(normalizePresenceState({ brain: "thinking", syncStatus: "online", notifications: 120, route: "Brain!" }), {
    brain: "thinking", sync: "idle", media: "idle", calendar: "idle", mail: "idle", notifications: 99, notificationsImportant: 0, route: "entry"
  });
  assert.equal(engine.start({ brain: "ready", syncStatus: "syncing", calendar: "approaching", notifications: 3, notificationsImportant: 1, route: "brain" }), true);
  assert.equal(target.dataset.presenceEngine, "active");
  assert.equal(target.dataset.presenceSync, "syncing");
  assert.equal(target.dataset.presenceMedia, "idle");
  assert.equal(target.dataset.presenceCalendar, "approaching");
  assert.equal(target.dataset.presenceMail, "idle");
  assert.equal(target.dataset.presenceNotifications, "unread");
  assert.equal(target.dataset.presenceNotification, "important");
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "3");
  assert.match(buttonAttributes.get("aria-label"), /3/);

  engine.update({ syncStatus: "online", notifications: 0, notificationsImportant: 0 });
  assert.equal(target.dataset.presenceSync, "idle");
  assert.equal(target.dataset.presenceNotifications, "read");
  assert.equal(target.dataset.presenceNotification, "none");
  assert.equal(badge.hidden, true);
  engine.update({ media: "playing" });
  assert.equal(target.dataset.presenceMedia, "playing");

  document.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(target.dataset.presenceEngine, "paused");
  document.hidden = false;
  reducedMotion.matches = true;
  mediaListeners.get("change")();
  assert.equal(target.dataset.presenceEngine, "paused");
  reducedMotion.matches = false;
  mediaListeners.get("change")();
  assert.equal(target.dataset.presenceEngine, "active");

  engine.setBrain("responding", { settleAfter: 900 });
  assert.equal(target.dataset.presenceBrain, "responding");
  assert.equal(timers.size, 1);
  const [responseId, response] = [...timers.entries()][0];
  assert.equal(response.delay, 900);
  timers.delete(responseId);
  response.callback();
  assert.equal(target.dataset.presenceBrain, "ready");

  listeners.get("ethone:mail-received")({ detail: { settleAfter: 1800 } });
  assert.equal(target.dataset.presenceMail, "new");
  assert.equal(timers.size, 1);
  const [mailId, mail] = [...timers.entries()][0];
  assert.equal(mail.delay, 1800);
  timers.delete(mailId);
  mail.callback();
  assert.equal(target.dataset.presenceMail, "idle");

  engine.setBrain("responding");
  assert.equal(engine.destroy(), true);
  assert.equal(listeners.size, 0);
  assert.equal(mediaListeners.size, 0);
  assert.equal(timers.size, 0);
  assert.equal(cleared.length, 1);
  assert.equal("presenceEngine" in target.dataset, false);
  assert.equal("presenceMedia" in target.dataset, false);
  assert.equal("presenceCalendar" in target.dataset, false);
  assert.equal("presenceMail" in target.dataset, false);
  assert.equal("presenceNotification" in target.dataset, false);
  assert.equal(engine.destroy(), false);
});

test("Calendar presence only signals valid events due today or tomorrow", () => {
  const now = new Date(2026, 6, 14, 12, 0, 0);
  assert.equal(calendarPresenceState([{ date: "2026-07-14" }], now), "approaching");
  assert.equal(calendarPresenceState([{ start: "2026-07-15T08:30:00" }], now), "approaching");
  assert.equal(calendarPresenceState([{ date: "2026-07-16" }], now), "idle");
  assert.equal(calendarPresenceState([{ date: "2026-07-13" }], now), "idle");
  assert.equal(calendarPresenceState([{ date: "2026-99-99" }, { date: "not-a-date" }], now), "idle");
  assert.equal(calendarPresenceState([], "invalid"), "idle");
});

test("Live Widgets transition through Presence Engine without observers or render loops", () => {
  const listeners = new Map();
  const mediaListeners = new Map();
  const animations = [];
  const reducedMotion = {
    matches: false,
    addEventListener: (type, listener) => mediaListeners.set(type, listener),
    removeEventListener: (type, listener) => { if (mediaListeners.get(type) === listener) mediaListeners.delete(type); }
  };
  const document = {
    hidden: false,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => { if (listeners.get(type) === listener) listeners.delete(type); },
    querySelectorAll: () => []
  };
  const runtime = { matchMedia: () => reducedMotion };
  const target = { dataset: {} };
  const engine = createPresenceEngine({ document, runtime, target });
  engine.start();

  function animatedNode(text = "10") {
    return {
      textContent: text,
      dataset: {},
      animate(frames, timing) {
        const animation = {
          frames,
          timing,
          cancelled: false,
          finish: null,
          reject: null,
          finished: { then(resolve, reject) { animation.finish = resolve; animation.reject = reject; } },
          cancel() { animation.cancelled = true; animation.reject?.(); }
        };
        animations.push(animation);
        return animation;
      }
    };
  }

  const clock = animatedNode();
  assert.equal(engine.transitionText(clock, "11", { kind: "clock" }), true);
  assert.equal(clock.textContent, "11");
  assert.equal(clock.dataset.presenceUpdate, "clock");
  assert.equal(animations[0].timing.duration, 180);
  assert.deepEqual(Object.keys(animations[0].frames[0]).sort(), ["opacity", "transform"]);

  engine.transitionText(clock, "12", { kind: "clock" });
  assert.equal(animations[0].cancelled, true);
  assert.equal(engine.diagnostics().liveAnimations, 1);
  animations[1].finish();
  assert.equal(engine.diagnostics().liveAnimations, 0);
  assert.equal(animations[1].cancelled, true);
  assert.equal("presenceUpdate" in clock.dataset, false);

  const activity = animatedNode("");
  let completedActivities = 0;
  assert.equal(engine.signalActivity(activity, "task", { phase: "enter" }), true);
  assert.equal(activity.dataset.presenceActivity, "task");
  assert.equal(activity.dataset.presencePhase, "enter");
  assert.ok(animations[2].timing.duration <= 250);
  assert.deepEqual(Object.keys(animations[2].frames[0]).sort(), ["opacity", "transform"]);
  animations[2].finish();
  assert.equal(animations[2].cancelled, true);
  assert.equal(engine.diagnostics().activityAnimations, 0);

  assert.equal(engine.signalActivity(activity, "note", { phase: "exit", onComplete: () => { completedActivities += 1; } }), true);
  assert.equal(engine.cancelTransition(activity), true);
  assert.equal(completedActivities, 1);
  assert.equal("presenceActivity" in activity.dataset, false);
  assert.equal("presencePhase" in activity.dataset, false);

  const styleValues = new Map();
  const widget = { dataset: { liveWidget: "metric" }, style: { setProperty: (name, value) => styleValues.set(`widget:${name}`, value) } };
  const number = { dataset: { liveNumber: "42" }, style: { setProperty: (name, value) => styleValues.set(`number:${name}`, value) } };
  const surface = { matches: () => false, querySelectorAll: () => [widget, number] };
  assert.equal(engine.revealWidgets(surface), 2);
  assert.equal(widget.dataset.presenceLive, "enter");
  assert.equal(number.dataset.presenceLive, "enter");
  assert.equal(styleValues.get("widget:--v8-live-index"), "0");
  assert.equal(styleValues.get("number:--v8-live-index"), "1");
  assert.equal(styleValues.get("number:--v8-live-number-to"), "42");
  assert.equal(engine.revealWidgets(surface), 0);

  reducedMotion.matches = true;
  mediaListeners.get("change")();
  engine.transitionText(clock, "13", { kind: "clock" });
  assert.equal(clock.textContent, "13");
  assert.equal(animations.length, 4);
  engine.signalActivity(activity, "widget", { phase: "enter", onComplete: () => { completedActivities += 1; } });
  assert.equal(completedActivities, 2);
  engine.destroy();
});

async function loadExperience() {
  return import("../v8/core/experience.mjs").catch(() => null);
}

test("visual context follows explicit Flow before Space and local night", async () => {
  const experience = await loadExperience();
  assert.ok(experience, "experience module must exist");
  assert.equal(experience.resolveVisualContext({ context: "Study", flow: "Gaming session", space: "focus", hour: 23 }), "study");
  assert.equal(experience.resolveVisualContext({ mode: "Développement", flow: "Gaming session", space: "focus", hour: 23 }), "dev");
  assert.equal(experience.resolveVisualContext({ flow: "Gaming session", space: "focus", hour: 23 }), "gaming");
  assert.equal(experience.resolveVisualContext({ flow: "Study", space: "gaming", hour: 14 }), "study");
  assert.equal(experience.resolveVisualContext({ flow: "Development", space: "personal", hour: 14 }), "dev");
  assert.equal(experience.resolveVisualContext({ flow: "Study", space: "personal", hour: 14 }), "study");
  assert.equal(experience.resolveVisualContext({ flow: "Deep Work", space: "focus", hour: 14 }), "focus");
  assert.equal(experience.resolveVisualContext({ flow: "Essentiel", space: "personal", hour: 23 }), "night");
  assert.equal(experience.resolveVisualContext({ flow: "Essentiel", space: "personal", hour: 14 }), "neutral");
});

test("visual context refreshes only at the next day or night boundary", async () => {
  const experience = await loadExperience();
  assert.ok(experience, "experience module must exist");
  assert.equal(experience.millisecondsUntilVisualContextChange(new Date(2026, 6, 14, 5, 59, 59, 500)), 500);
  assert.equal(experience.millisecondsUntilVisualContextChange(new Date(2026, 6, 14, 6, 0, 0, 0)), 15 * 60 * 60 * 1000);
  assert.equal(experience.millisecondsUntilVisualContextChange(new Date(2026, 6, 14, 21, 0, 0, 0)), 9 * 60 * 60 * 1000);
});

test("Ambient UI follows four quiet day phases and the active Flow", async () => {
  const experience = await loadExperience();
  assert.ok(experience, "experience module must exist");
  assert.equal(experience.resolveAmbientPhase(5), "night");
  assert.equal(experience.resolveAmbientPhase(6), "morning");
  assert.equal(experience.resolveAmbientPhase(12), "afternoon");
  assert.equal(experience.resolveAmbientPhase(18), "evening");
  assert.equal(experience.resolveAmbientPhase(21), "night");
  assert.equal(experience.millisecondsUntilAmbientChange(new Date(2026, 6, 14, 6, 0, 0, 0)), 6 * 60 * 60 * 1000);
  assert.equal(experience.millisecondsUntilAmbientChange(new Date(2026, 6, 14, 18, 0, 0, 0)), 3 * 60 * 60 * 1000);

  const styles = new Map();
  const target = { dataset: {}, style: { setProperty: (name, value) => styles.set(name, value), getPropertyValue: (name) => styles.get(name) || "" } };
  const result = experience.applyAmbientUI(target, { flow: "Study", space: "personal" }, { date: new Date(2026, 6, 14, 8, 0, 0, 0) });
  assert.equal(result.context, "study");
  assert.equal(result.phase, "morning");
  assert.ok(result.backgroundOpacity > 0.32 && result.backgroundOpacity < 0.5);
  assert.equal(target.dataset.context, "study");
  assert.equal(target.dataset.ambient, "morning");
  assert.equal(target.dataset.ambientEngine, "ready");
  assert.match(styles.get("--v8-ambient-motion-duration"), /s$/);
  assert.match(styles.get("--v8-ambient-phase-light"), /^rgba\(/);
});

test("Ambient Engine interpolates time, Focus and sound without a render loop", async () => {
  const experience = await loadExperience();
  const morning = experience.resolveAmbientProfile({ theme: "night", space: "personal", flow: "Essentiel" }, { date: new Date(2026, 6, 14, 6, 0, 0, 0) });
  const night = experience.resolveAmbientProfile({ theme: "night", space: "personal", flow: "Essentiel" }, { date: new Date(2026, 6, 14, 23, 0, 0, 0) });
  const focus = experience.resolveAmbientProfile({ theme: "night", space: "focus", flow: "Deep Work" }, { date: new Date(2026, 6, 14, 10, 0, 0, 0) });
  const personal = experience.resolveAmbientProfile({ theme: "night", space: "personal", flow: "Essentiel" }, { date: new Date(2026, 6, 14, 10, 0, 0, 0) });
  const day = experience.resolveAmbientProfile({ theme: "graphite", space: "personal", flow: "Essentiel" }, { date: new Date(2026, 6, 14, 14, 0, 0, 0) });
  const gaming = experience.resolveAmbientProfile({ theme: "graphite", space: "personal", flow: "Gaming" }, { date: new Date(2026, 6, 14, 14, 0, 0, 0) });

  assert.ok(morning.lightness > night.lightness);
  assert.ok(morning.motionSeconds < night.motionSeconds);
  assert.ok(morning.soundGain > night.soundGain);
  assert.equal(focus.focus, true);
  assert.ok(focus.motionSeconds > personal.motionSeconds);
  assert.ok(focus.soundGain < personal.soundGain);
  assert.ok(night.soundTone < day.soundTone);
  assert.ok(focus.soundTone < personal.soundTone);
  assert.ok(gaming.soundRate > day.soundRate);
  assert.ok(gaming.soundTone >= day.soundTone);
  assert.ok(experience.millisecondsUntilAmbientRefresh(new Date(2026, 6, 14, 10, 2, 0, 0)) <= experience.AMBIENT_REFRESH_MS);

  const source = fs.readFileSync(new URL("../v8/core/experience.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setInterval|requestAnimationFrame[^?]/);
});

test("Ambient Engine owns one low-frequency timer and cleans it up", async () => {
  const experience = await loadExperience();
  const listeners = new Map();
  const scheduled = new Map();
  const cleared = [];
  const soundProfiles = [];
  const adaptiveProfiles = [];
  let timerId = 0;
  const document = {
    visibilityState: "visible",
    documentElement: { dataset: {}, style: { setProperty() {}, getPropertyValue: () => "" } },
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => { if (listeners.get(type) === listener) listeners.delete(type); }
  };
  const runtime = {
    document,
    setTimeout: (callback, delay) => { const id = ++timerId; scheduled.set(id, { callback, delay }); return id; },
    clearTimeout: (id) => { cleared.push(id); scheduled.delete(id); }
  };
  const engine = experience.createAmbientEngine({
    runtime,
    document,
    target: document.documentElement,
    soundManager: {
      setAmbientProfile: (profile) => soundProfiles.push(profile),
      setAdaptiveProfile: (profile) => adaptiveProfiles.push(profile)
    }
  });
  const profile = engine.start({ theme: "night", space: "focus", flow: "Deep Work" }, { date: new Date(2026, 6, 14, 10, 0, 0, 0) });

  assert.equal(profile.focus, true);
  assert.equal(listeners.size, 1);
  assert.equal(scheduled.size, 1);
  assert.ok([...scheduled.values()][0].delay <= experience.AMBIENT_REFRESH_MS);
  assert.equal(soundProfiles.at(-1).gain, profile.soundGain);
  assert.deepEqual(adaptiveProfiles.at(-1), { tone: profile.soundTone, context: profile.context, theme: "night" });
  assert.equal(engine.diagnostics().scheduled, true);
  assert.equal(engine.destroy(), true);
  assert.equal(scheduled.size, 0);
  assert.equal(listeners.size, 0);
  assert.ok(cleared.length >= 1);
  assert.deepEqual(soundProfiles.at(-1), { gain: 1, rate: 1 });
  assert.deepEqual(adaptiveProfiles.at(-1), { tone: 0, context: "neutral", theme: "graphite" });
});

test("Spotlight never runs when disabled or reduced motion is requested", async () => {
  const experience = await loadExperience();
  assert.ok(experience, "experience module must exist");
  assert.equal(experience.shouldRunSpotlight({ enabled: true, reducedMotion: false }), true);
  assert.equal(experience.shouldRunSpotlight({ enabled: false, reducedMotion: false }), false);
  assert.equal(experience.shouldRunSpotlight({ enabled: true, reducedMotion: true }), false);
  assert.equal(experience.SPOTLIGHT_DURATION_MS, 420);
});

test("startup reads the persisted Spotlight preference fail-open", async () => {
  const experience = await loadExperience();
  assert.ok(experience, "experience module must exist");
  assert.equal(experience.readSpotlightPreference(memoryStorage({
    "ethone:v8-ui-state": JSON.stringify({ spotlightEnabled: false })
  })), false);
  assert.equal(experience.readSpotlightPreference(memoryStorage({
    "ethone:v8-ui-state": JSON.stringify({ spotlightEnabled: true })
  })), true);
  assert.equal(experience.readSpotlightPreference(memoryStorage({
    "ethone:v8-ui-state": "not-json"
  })), true);
});

test("presentation state persists the Spotlight preference", () => {
  const storage = memoryStorage();
  const store = createPresentationStore({}, { storage });
  assert.equal(store.getState().spotlightEnabled, true);
  store.setState({ spotlightEnabled: false });
  assert.equal(store.getState().spotlightEnabled, false);

  const restored = createPresentationStore({}, { storage });
  assert.equal(restored.getState().spotlightEnabled, false);
});

test("central actions toggle Spotlight without touching unrelated state", () => {
  let state = { spotlightEnabled: true, theme: "night" };
  const actions = createActionFacade({
    getState: () => state,
    setState: (patch) => { state = { ...state, ...patch }; }
  });
  const result = actions.dispatch("v8.spotlight.toggle");
  assert.equal(result.ok, true);
  assert.equal(state.spotlightEnabled, false);
  assert.equal(state.theme, "night");
  actions.destroy();
});

test("central actions toggle persistent Silent mode and preview only when sound returns", () => {
  let preferences = { enabled: true, silent: false };
  let previews = 0;
  const actions = createActionFacade({
    sounds: {
      preferences: () => preferences,
      setPreferences: (patch) => { preferences = { ...preferences, ...patch }; },
      preview: () => { previews += 1; },
      playAction() {}
    }
  });
  const muted = actions.dispatch("v8.sound.silent");
  assert.equal(muted.ok, true);
  assert.equal(preferences.silent, true);
  assert.equal(previews, 0);
  const audible = actions.dispatch("v8.sound.silent");
  assert.equal(audible.ok, true);
  assert.equal(preferences.silent, false);
  assert.equal(previews, 1);
  actions.destroy();
});

test("Spotlight CSS is GPU-only, bounded and reduced-motion safe", () => {
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../v8/main.mjs", import.meta.url), "utf8");
  const profiles = fs.readFileSync(new URL("../v8/entry/profile-selection.mjs", import.meta.url), "utf8");
  assert.match(base, /\.v8-spotlight/);
  assert.match(base, /420ms/);
  assert.match(base, /\.v8-spotlight[\s\S]*transform[\s\S]*opacity/);
  assert.doesNotMatch(base.match(/\.v8-spotlight[\s\S]*?(?=\n\.[a-z]|@media|$)/)?.[0] || "", /(?:width|height|top|left)\s*:/);
  assert.match(base, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.v8-spotlight/);
  assert.match(main, /playSpotlight/);
  assert.doesNotMatch(profiles, /waitForLaunch|launchTimer/);
});

test("Login polish keeps the auth flow keyboard-safe and motion-bounded", () => {
  const login = fs.readFileSync(new URL("../v8/entry/login.mjs", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  assert.match(login, /className: "v8-auth-shell"/);
  assert.match(login, /dataset: \{ authMode: "login" \}/);
  assert.match(login, /toggleAttribute\("inert", !loginActive\)/);
  assert.match(login, /toggleAttribute\("inert", loginActive\)/);
  assert.doesNotMatch(login, /register-form"[\s\S]{0,160}hidden: true/);
  assert.match(login, /className: "v8-auth__label-text"/);
  assert.match(login, /rememberDetail: "Uniquement sur cet appareil"/);
  assert.match(login, /className: "v8-entry__capabilities"/);
  assert.match(login, /capability\("brain", "brain"\)/);
  assert.match(login, /capability\("workflow", "flows"\)/);
  assert.match(entry, /\.v8-auth-shell::before[\s\S]*radial-gradient/);
  assert.match(entry, /\.v8-auth::after[\s\S]*linear-gradient/);
  assert.match(entry, /\.v8-auth__tabs::before[\s\S]*transition:\s*transform/);
  assert.match(entry, /\.v8-auth__form\[aria-hidden="true"\][\s\S]*opacity:\s*0[\s\S]*visibility:\s*hidden/);
  assert.match(entry, /\.v8-entry--login \.v8-form-field:focus-within \.v8-form-field__control[\s\S]*var\(--v8-login-ring\)/);
  assert.match(entry, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-auth__form/);
  const authHalo = entry.match(/\.v8-auth-shell::before\s*\{[^}]*\}/s)?.[0] || "";
  assert.match(authHalo, /filter:\s*blur\(30px\)/);
  assert.doesNotMatch(authHalo, /transform:/);
  assert.match(entry, /\.v8-auth\s*\{[^}]*inset 0 0 32px[^}]*backdrop-filter:/s);
  assert.match(entry, /\.v8-entry--login \.v8-auth__submit\.v8-button--primary[\s\S]*var\(--v8-login-primary\)/);
  assert.match(entry, /\.v8-auth__oauth-button svg\s*\{[^}]*width:\s*20px[^}]*stroke-width:\s*1\.85/s);
  assert.match(entry, /\.v8-auth__form\s*\{[^}]*transition:\s*opacity[^}]*transform/s);
  assert.match(entry, /\.v8-auth__form\[aria-hidden="true"\]\s*\{[^}]*position:\s*absolute[^}]*visibility:\s*hidden/s);
  assert.match(entry, /data-auth-mode="register"[^}]*\.v8-auth__forms\s*\{[^}]*min-height:\s*436px/s);
  assert.match(entry, /data-auth-mode="login"[^}]*#v8-register-form[^}]*translate3d\(14px/);
  assert.match(entry, /data-auth-mode="register"[^}]*#v8-login-form[^}]*translate3d\(-14px/);
  assert.match(entry, /\.v8-auth__remember-control\s*\{[^}]*width:\s*20px[^}]*border-radius:\s*6px/s);
  assert.match(entry, /aria-busy="true"[^}]*\.v8-auth__remember-control::after[^}]*v8-spin/s);
  assert.match(entry, /\.v8-entry__capability\s*\{[^}]*min-height:\s*40px[^}]*background:/s);
  assert.match(entry, /\.v8-entry\s*\{[^}]*overflow:\s*hidden;[^}]*overflow:\s*clip;/s);
  assert.match(entry, /input:not\(\[type="hidden"\]\):not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(components, /input:not\(\[type="hidden"\]\):not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(components, /\.v8-form-choice\s*\{\s*min-height:\s*var\(--v8-touch-target\)/);
  assert.match(entry, /max-width:\s*420px[\s\S]*\.v8-entry__preview\s*\{\s*display:\s*none/);
  assert.doesNotMatch(authHalo, /animation:/);
  assert.doesNotMatch(authHalo, /inset:\s*-/);
});

test("profile selection exposes an honest live environment preview", () => {
  const date = new Date("2026-07-14T09:05:00.000Z");
  const model = profilePreviewModel({
    id: "profile-live",
    name: "Focus",
    type: "development",
    space: "development",
    flow: "Deep Work",
    accent: "sky",
    lastActiveAt: "2026-07-14T08:45:00.000Z",
    counts: { notes: 4, openTasks: 2, events: 1, files: 7 },
    environment: { widgets: ["brain", "github", "notes"], integrations: ["spotify", "discord"], ambience: "focus", background: "horizon" }
  }, {
    profile: { id: "profile-live" },
    notes: [],
    tasks: [],
    events: [{ title: "Product review", date: "2026-07-14" }],
    connections: [{ id: "spotify", status: "connected" }, { id: "discord", status: "connected" }],
    activities: [
      { source: "weather", category: "system", title: "18 C, ciel clair", timestamp: date.toISOString() },
      { source: "brain", category: "brain", title: "Contexte analyse", timestamp: date.toISOString() },
      { source: "spotify", category: "media", title: "Tycho - Awake", timestamp: date.toISOString() }
    ]
  }, date);

  assert.deepEqual(model.favoriteWidgets, ["brain", "github", "notes"]);
  assert.equal(model.ambienceLabel, "Concentration");
  assert.equal(model.backgroundLabel, "Horizon");
  assert.equal(model.live.signals.find((signal) => signal.id === "weather")?.value, "18 C, ciel clair");
  assert.equal(model.live.signals.find((signal) => signal.id === "music")?.value, "Tycho - Awake");
  assert.equal(model.live.signals.find((signal) => signal.id === "discord")?.value, "Connecté");

  const disconnected = profilePreviewModel({ id: "local", name: "Local" }, { profile: { id: "local" } }, date);
  assert.equal(disconnected.live.signals.find((signal) => signal.id === "weather")?.value, "Non connectée");
  assert.equal(disconnected.live.signals.find((signal) => signal.id === "music")?.value, "Non connectée");
  assert.doesNotMatch(JSON.stringify(disconnected.live), /soleil|22 C|playlist/i);
  assert.match(formatEnvironmentClock(date).time, /^\d{2}:\d{2}$/);
});

test("environment selection keeps its live runtime bounded and wizard accessible", () => {
  const profiles = fs.readFileSync(new URL("../v8/entry/profile-selection.mjs", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  assert.match(profiles, /repository\.snapshot\?\.\(profile\.id\)/);
  assert.match(profiles, /createDailyBriefing/);
  assert.match(profiles, /clockManager\?\.subscribe\?\.\(refreshClock\)/);
  assert.match(profiles, /releaseClock\(\)/);
  assert.doesNotMatch(profiles, /setInterval|requestAnimationFrame/);
  assert.match(profiles, /document\.startViewTransition/);
  assert.match(profiles, /aria-current.*step/);
  assert.match(profiles, /role: "checkbox"/);
  assert.match(profiles, /page\.toggleAttribute\("inert", !active\)/);
  assert.match(entry, /\.v8-profile-preview__live-grid/);
  assert.match(entry, /::view-transition-old\(root\)/);
  assert.match(entry, /prefers-reduced-motion:\s*reduce[\s\S]*::view-transition-new\(root\)/);
});

test("context colors keep a fixed violet brand and subtle secondary accents", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  for (const context of ["gaming", "dev", "study", "focus", "night"]) {
    assert.match(tokens, new RegExp(`:root\\[data-context="${context}"\\]`));
  }
  assert.match(tokens, /--v8-brand:\s*#[0-9a-f]{6}/i);
  assert.match(tokens, /--v8-context-accent:/);
  assert.match(tokens, /--v8-ambient-accent:[^;]*var\(--v8-accent\)[^;]*var\(--v8-context-accent\)/);
  assert.match(tokens, /color-mix\(in srgb, var\(--v8-canvas\) 98%, var\(--v8-ambient-accent\)\)/);
  assert.match(shell, /\.v8-topbar__workspace-mark\s*\{[^}]*var\(--v8-context-soft\)[^}]*var\(--v8-context-accent\)/s);
  assert.match(shell, /\.v8-rail-space__mark\s*\{[^}]*var\(--v8-context-soft\)[^}]*var\(--v8-context-accent\)/s);
  assert.match(shell, /\.v8-switch\s*\{[^}]*height:\s*44px/s);
});

test("Ambient UI composes theme, Space and Flow through one low-frequency engine", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const runtime = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../v8/main.mjs", import.meta.url), "utf8");
  for (const phase of ["morning", "afternoon", "evening", "night"]) {
    assert.match(tokens, new RegExp(`:root\\[data-ambient="${phase}"\\]`));
  }
  assert.match(tokens, /:root\[data-theme="graphite"\][\s\S]*--v8-ambient-theme-wash:/);
  assert.match(tokens, /:root[^{]*\[data-space="focus"\][^{]*\{[\s\S]*?--v8-ambient-space-wash:/);
  assert.match(tokens, /:root[^{]*\[data-space="studio"\][^{]*\{[\s\S]*?--v8-ambient-space-wash:/);
  assert.match(shell, /\.v8-shell\s*\{[^}]*--v8-ambient-phase-light[^}]*--v8-ambient-theme-wash[^}]*--v8-ambient-space-wash[^}]*--v8-ambient-phase-shadow/s);
  assert.match(shell, /box-shadow:[^;]*--v8-ambient-context-glow/);
  assert.doesNotMatch(shell.match(/\.v8-shell\s*\{[^}]*\}/s)?.[0] || "", /animation:/);
  assert.match(tokens, /@property --v8-ambient-motion-duration/);
  assert.match(base, /--v8-ambient-phase-light var\(--v8-ambient-transition\)/);
  assert.match(runtime, /createAmbientEngine/);
  assert.match(runtime, /ambient\.refresh\(next\)/);
  assert.match(runtime, /ambientPhase/);
  assert.doesNotMatch(runtime, /ambientTimer|setInterval|requestAnimationFrame/);
  assert.match(main, /createAmbientEngine/);
  assert.match(main, /ambientEngine:\s*ambient/);
});

test("Breathing UI animates only decorative layers on the compositor", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const keyframes = base.match(/@keyframes v8-surface-breathe\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(tokens, /--v8-breathe-duration:\s*26s/);
  assert.match(keyframes, /opacity:[^;]+;[^}]*transform:/);
  assert.doesNotMatch(keyframes, /filter|background|box-shadow|(?:width|height|top|left):/);
  assert.match(shell, /\.v8-continuity::after,\.v8-home-brain::after,\.v8-brain-context::after/);
  assert.doesNotMatch(entry, /\.v8-profile-preview__ambient[\s\S]{0,180}animation:\s*v8-surface-breathe/);
  assert.match(presence, /data-presence-engine="active"[\s\S]*\.v8-profile-preview__ambient[\s\S]*animation:\s*v8-surface-breathe/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-brain-context::after/);
});

test("Ambient Dashboard uses quiet compositor layers without a runtime loop", () => {
  const home = fs.readFileSync(new URL("../v8/pages/home.mjs", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const keyframes = ["wash", "light", "float"].map((name) => presence.match(new RegExp(`@keyframes v8-dashboard-${name}\\s*\\{[\\s\\S]*?\\n\\}`))?.[0] || "").join("\n");

  assert.match(home, /v8-home-ambient__wash/);
  assert.match(home, /v8-home-ambient__light/);
  assert.match(home, /v8-home-float--hero/);
  assert.match(home, /v8-home-float--timeline/);
  assert.match(shell, /\.v8-home-ambient__wash,[\s\S]*animation:\s*none/);
  assert.match(shell, /\.v8-home-float\s*\{[^}]*animation:\s*none[^}]*will-change:\s*auto/s);
  assert.match(shell, /\.v8-daystream\s*\{[^}]*box-shadow:\s*var\(--v8-shadow-card-lit\)/s);
  assert.match(presence, /data-presence-engine="active"\] \.v8-home-ambient__wash[\s\S]*v8-dashboard-wash/);
  assert.match(presence, /data-presence-engine="active"\] \.v8-home-float[\s\S]*v8-dashboard-float/);
  assert.match(presence, /data-presence-engine="paused"\] \.v8-home-ambient__wash[\s\S]*animation-play-state:\s*paused/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-home-float[\s\S]*animation:\s*none/);
  assert.match(keyframes, /transform:/);
  assert.match(keyframes, /opacity:/);
  assert.doesNotMatch(keyframes, /box-shadow|filter|background|(?:width|height|top|right|bottom|left|margin|padding):/);
  assert.doesNotMatch(home, /setInterval|requestAnimationFrame|MutationObserver|ResizeObserver/);
});

test("Premium background drifts on the compositor and fades decorative signals", () => {
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const login = fs.readFileSync(new URL("../v8/entry/login.mjs", import.meta.url), "utf8");
  const drift = base.match(/@keyframes v8-ambient-drift\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(base, /\.v8-entry::before,[\s\S]*\.v8-shell::before[\s\S]*animation:\s*none/);
  assert.match(presence, /data-presence-engine="active"[\s\S]*\.v8-shell::before[\s\S]*animation:\s*v8-ambient-drift var\(--v8-ambient-motion-duration\)/);
  assert.match(drift, /transform:/);
  assert.match(drift, /opacity:/);
  assert.doesNotMatch(drift, /background|filter|inset|width|height/);
  assert.match(drift, /--v8-ambient-opacity-(?:min|max)/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-shell::before[\s\S]*animation:\s*none/);
  assert.match(entry, /\.v8-entry__signal-field span\s*\{[\s\S]*linear-gradient\(90deg,\s*transparent[\s\S]*transparent\)/);
  assert.match(entry, /\.v8-entry__signal-field span\s*\{[^}]*width:\s*170vmax/s);
  assert.equal((login.match(/className: "v8-entry__particle"/g) || []).length, 4);
  assert.match(presence, /data-presence-engine="active"\] \.v8-entry__particle[\s\S]*v8-entry-particle-drift/);
  const particles = presence.match(/@keyframes v8-entry-particle-drift\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.match(particles, /transform:/);
  assert.match(particles, /opacity:/);
  assert.doesNotMatch(particles, /filter|background|box-shadow|(?:width|height|top|left):/);
  assert.match(login, /requestAnimationFrame/);
  assert.match(login, /addEventListener\("pointermove"[^\n]*signal:\s*abortController\.signal[^\n]*passive:\s*true/);
  assert.match(login, /cancelAnimationFrame/);
  assert.doesNotMatch(login, /getBoundingClientRect|setInterval/);
  assert.match(entry, /\.v8-entry__title\s*\{[^}]*text-shadow:/s);
  assert.match(base, /\.v8-entry__monogram,\.v8-profile-preview__ambient span,\.v8-continuity__monogram\s*\{[^}]*text-shadow:/s);
});

test("Brand identity uses one localized slogan and a compositor-only 8 signature", () => {
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const login = fs.readFileSync(new URL("../v8/entry/login.mjs", import.meta.url), "utf8");
  const profiles = fs.readFileSync(new URL("../v8/entry/profile-selection.mjs", import.meta.url), "utf8");
  const home = fs.readFileSync(new URL("../v8/pages/home.mjs", import.meta.url), "utf8");
  const breathe = base.match(/@keyframes v8-brand-breathe\s*\{[^}]*\}\s*to\s*\{[^}]*\}\s*\}/s)?.[0] || "";

  for (const slogan of [
    "Votre environnement numérique. Réinventé.",
    "Your digital environment. Reimagined.",
    "Tu entorno digital. Reinventado.",
    "Deine digitale Umgebung. Neu gedacht."
  ]) assert.match(login, new RegExp(slogan.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  for (const source of [login, profiles, home]) {
    assert.match(source, /text: "8"/);
    assert.doesNotMatch(source, /text: "08"/);
  }
  assert.match(base, /\.v8-entry__monogram,\.v8-profile-preview__ambient span,\.v8-continuity__monogram\s*\{[^}]*text-shadow:[^}]*animation:none/s);
  assert.match(presence, /data-presence-engine="active"[\s\S]*\.v8-continuity__monogram\s*\{[^}]*animation:\s*v8-brand-breathe 24s/s);
  assert.match(presence, /data-presence-engine="active"\] \.v8-entry__monogram\s*\{[^}]*v8-brand-breathe 42s/s);
  assert.match(entry, /\.v8-entry--login \.v8-entry__monogram\s*\{[^}]*linear-gradient[^}]*filter:blur\(\.22px\)/s);
  assert.match(entry, /\.v8-entry__monogram\s*\{\s*display:none/);
  assert.match(entry, /@media \(min-width:\s*900px\)[\s\S]*\.v8-entry--login \.v8-entry__monogram\s*\{[^}]*display:block/);
  assert.match(breathe, /transform:scale/);
  assert.doesNotMatch(breathe, /filter|background|width|height|top|left/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-continuity__monogram[\s\S]*animation:\s*none/);
});

test("Presence Engine centrally owns Brain Sync notification and Dock life", () => {
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const engine = fs.readFileSync(new URL("../v8/core/presence-engine.mjs", import.meta.url), "utf8");
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../v8/main.mjs", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");

  for (const state of ["ready", "thinking", "responding"]) {
    assert.match(presence, new RegExp(`data-presence-brain="${state}"`));
  }
  assert.match(presence, /data-presence-sync="syncing"[\s\S]*v8-presence-sync/);
  assert.match(presence, /data-presence-notification="important"[\s\S]*v8-presence-unread/);
  assert.match(presence, /\.v8-dock-app\.is-active::after[\s\S]*v8-presence-dock-signal/);
  assert.match(presence, /--v8-presence-brain-cycle:\s*1600ms/);
  assert.match(presence, /--v8-presence-notification-cycle:\s*900ms/);
  assert.match(presence, /--v8-presence-dock-cycle:\s*1200ms/);
  const finiteIconAnimations = presence.split("\n").filter((line) => /animation:\s*v8-presence-(?:brain-ready|signal-ready|unread|dock-glow|dock-signal|mail-arrive)/.test(line));
  assert.ok(finiteIconAnimations.length >= 6);
  finiteIconAnimations.forEach((line) => assert.doesNotMatch(line, /infinite|alternate/));
  assert.match(presence, /data-presence-engine="paused"[\s\S]*animation-play-state:\s*paused/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*animation:\s*none/);
  assert.doesNotMatch(engine, /setInterval|requestAnimationFrame/);
  assert.doesNotMatch([base, entry, shell].join("\n"), /animation:[^;]*(?:infinite|alternate)/);
  assert.match(components, /animation:\s*v8-spin[^;]*infinite/);
  assert.match(main, /createPresenceEngine/);
  assert.match(main, /presenceEngine:\s*presence/);
  assert.match(app, /presence\.update\(\{[\s\S]*syncStatus/);
});

test("Dynamic icons are semantic conditional finite and centrally wired", () => {
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const engine = fs.readFileSync(new URL("../v8/core/presence-engine.mjs", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/ui/shell.mjs", import.meta.url), "utf8");
  const dock = fs.readFileSync(new URL("../v8/ui/dock.mjs", import.meta.url), "utf8");
  const calendar = fs.readFileSync(new URL("../v8/pages/calendar.mjs", import.meta.url), "utf8");
  const activity = fs.readFileSync(new URL("../v8/pages/activity.mjs", import.meta.url), "utf8");
  const connections = fs.readFileSync(new URL("../v8/pages/connections.mjs", import.meta.url), "utf8");
  const toast = fs.readFileSync(new URL("../v8/ui/toast.mjs", import.meta.url), "utf8");

  for (const kind of ["brain", "cloud", "notifications", "mail"]) {
    assert.match([shell, dock, activity, connections].join("\n"), new RegExp(`data-presence-icon=["']${kind}["']`));
  }
  assert.match(dock, /\["brain", "calendar"\]\.includes\(item\.id\)/);
  assert.match(dock, /presenceIcon/);
  assert.match(engine, /ethone:mail-received/);
  assert.match(engine, /notificationsImportant/);
  assert.match(calendar, /calendarPresenceState/);
  assert.match(toast, /type === "error" \|\| type === "warning"/);
  assert.match(presence, /data-presence-sync="syncing"[\s\S]*v8-presence-sync[^;]*infinite/);
  assert.match(presence, /data-presence-media="playing"[\s\S]*v8-presence-media-level[^;]*infinite/);
  assert.match(presence, /data-presence-mail="new"[\s\S]*v8-presence-mail-arrive[^;]*both/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*\.v8-mail-signal[\s\S]*animation:\s*none/);
  assert.doesNotMatch(engine, /setInterval|requestAnimationFrame/);
});

test("Live Widget motion is semantic centralized bounded and reduced-motion safe", () => {
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const engine = fs.readFileSync(new URL("../v8/core/presence-engine.mjs", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  const main = fs.readFileSync(new URL("../v8/main.mjs", import.meta.url), "utf8");
  const profiles = fs.readFileSync(new URL("../v8/entry/profile-selection.mjs", import.meta.url), "utf8");
  const sources = [
    "../v8/pages/home.mjs",
    "../v8/pages/tasks.mjs",
    "../v8/pages/calendar.mjs",
    "../v8/pages/brain.mjs",
    "../v8/ui/panel.mjs",
    "../v8/ui/mission-control.mjs"
  ].map((path) => fs.readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");

  for (const kind of ["brain", "clock", "metric", "planning", "signal", "widget"]) {
    assert.match([profiles, sources].join("\n"), new RegExp(`liveKind:\\s*"${kind}"`));
  }
  assert.match(profiles, /presence\.transitionText\(liveTime,[^}]*kind:\s*"clock"/);
  assert.match(profiles, /presence\?\.transitionSurface\(preview,\s*\{\s*kind:\s*"profile"/);
  assert.doesNotMatch(profiles, /\.animate\(/);
  assert.match(app, /function finishRouteMount[\s\S]*presence\.revealWidgets\(shell\.stage\)/);
  assert.match(app, /presence\.revealWidgets\(shell\.panelHost\)/);
  assert.match(app, /presence\.revealWidgets\(shell\.missionHost\)/);
  assert.match(main, /presenceEngine:\s*presence/);
  assert.doesNotMatch(engine, /MutationObserver|ResizeObserver|IntersectionObserver|setInterval|requestAnimationFrame/);
  assert.match(engine, /duration:\s*Math\.min\(config\.maxDuration\s*\|\|\s*420/);
  assert.match(engine, /Math\.min\(7,\s*revealed\)/);
  assert.match(presence, /@property --v8-live-number-value/);
  assert.match(presence, /--v8-live-stagger:\s*24ms/);
  assert.match(presence, /@keyframes v8-live-(?:widget|media|brain|planning)-enter/);
  assert.match(presence, /@keyframes v8-live-number-count/);
  assert.match(presence, /prefers-reduced-motion:\s*reduce[\s\S]*\[data-live-number\][\s\S]*display:\s*none/);
});

test("Smart Activity feedback is centralized and attached to successful system changes", () => {
  const engine = fs.readFileSync(new URL("../v8/core/presence-engine.mjs", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const toast = fs.readFileSync(new URL("../v8/ui/toast.mjs", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../v8/app/app-runtime.mjs", import.meta.url), "utf8");
  const profiles = fs.readFileSync(new URL("../v8/entry/profile-selection.mjs", import.meta.url), "utf8");
  const tasks = fs.readFileSync(new URL("../v8/pages/tasks.mjs", import.meta.url), "utf8");
  const notes = fs.readFileSync(new URL("../v8/pages/notes.mjs", import.meta.url), "utf8");
  const calendar = fs.readFileSync(new URL("../v8/pages/calendar.mjs", import.meta.url), "utf8");
  const files = fs.readFileSync(new URL("../v8/pages/files.mjs", import.meta.url), "utf8");

  assert.match(engine, /function signalActivity/);
  assert.match(engine, /ACTIVITY_PHASES = new Set\(\["enter", "update", "exit"\]\)/);
  assert.match(engine, /maxDuration:\s*250/);
  assert.doesNotMatch(engine, /MutationObserver|ResizeObserver|IntersectionObserver|setInterval|requestAnimationFrame/);
  assert.match(presence, /\[data-presence-activity\][^}]*will-change:\s*transform, opacity/);
  assert.match(app, /createToastManager\(shell\.toastRegion, \{ sounds, presence \}\)/);
  assert.match(toast, /signalActivity\?\.\(node, "notification", \{ phase: "enter" \}\)/);
  assert.match(toast, /signalActivity\(record\.node, "notification", \{ phase: "exit", onComplete: remove \}\)/);
  for (const [source, kind] of [[tasks, "task"], [notes, "note"], [calendar, "calendar"], [files, "file"], [profiles, "widget"]]) {
    assert.match(source, new RegExp(`signalActivity[^\\n]*"${kind}"`));
    assert.doesNotMatch(source, /\.animate\(/);
  }
  assert.doesNotMatch(tasks, /revealWidgets\(list\)/);
  assert.doesNotMatch(calendar, /revealWidgets\(agenda\)/);
  assert.match(app, /syncStatus:\s*next\.syncStatus/);
});

test("Typography tokens keep primary and secondary content readable", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const styles = [tokens, base, entry, shell].join("\n");

  assert.match(tokens, /--v8-text-secondary:\s*#c4ccd6/);
  assert.match(tokens, /--v8-muted:\s*#929daa/);
  assert.match(tokens, /--v8-type-caption:\s*clamp\(0\.75rem,[^;]+--density-font-scale/);
  assert.match(tokens, /--v8-type-label:\s*clamp\(0\.8125rem,[^;]+--density-font-scale/);
  assert.match(tokens, /--v8-type-body:\s*clamp\(0\.9375rem,[^;]+--density-font-scale/);
  assert.match(tokens, /--v8-font-micro:\s*var\(--v8-type-caption\)/);
  assert.match(tokens, /--v8-font-xs:\s*var\(--v8-type-label\)/);
  assert.match(tokens, /--v8-line-base:\s*var\(--density-line-height\)/);
  assert.match(tokens, /--v8-line-relaxed:\s*1\.7/);
  assert.match(base, /font-kerning:\s*normal/);
  assert.match(base, /font-synthesis:\s*none/);
  assert.match(entry, /\.v8-entry__brand-line\s*\{[^}]*font-weight:\s*var\(--v8-weight-medium\)[^}]*text-wrap:\s*balance/s);
  assert.match(shell, /\.v8-page-heading h1\s*\{[^}]*font-weight:\s*var\(--v8-weight-bold\)/s);
  assert.match(shell, /\.v8-breadcrumb-context__item\s*\{[^}]*font-size:\s*var\(--v8-font-micro\)/s);
  assert.match(shell, /\.v8-status-bar\s*\{[^}]*font-size:\s*var\(--v8-font-micro\)/s);
  assert.match(shell, /@media \(max-width:\s*1500px\) and \(min-width:\s*981px\)[\s\S]*\.v8-breadcrumbs \.v8-breadcrumb-step--workspace/);
  assert.match(shell, /@media \(max-width:\s*820px\)[\s\S]*\.v8-breadcrumbs \.v8-breadcrumb-step\s*\{\s*display:\s*none/);
  assert.doesNotMatch(styles, /letter-spacing:\s*(?!0(?:;|\s))[-.\d]+(?:em|rem|px)/);
});

test("Global lighting uses layered static light without runtime animation", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");

  for (const token of ["surface", "hero", "brand", "brain", "window"]) {
    assert.match(tokens, new RegExp(`--v8-light-${token}:`));
  }
  for (const level of ["card", "hero", "brain", "modal", "header"]) {
    assert.match(tokens, new RegExp(`--v8-shadow-${level}-lit:`));
  }
  assert.match(components, /\.v8-surface\s*\{[^}]*var\(--v8-reflection-card\)[^}]*var\(--v8-shadow-card-lit\)/s);
  assert.match(components, /\.v8-panel\s*\{[^}]*var\(--v8-shadow-panel-rest\)/s);
  assert.match(entry, /\.v8-entry__intro::before\s*\{[^}]*radial-gradient\(ellipse,var\(--v8-light-brand\)/s);
  assert.match(entry, /\.v8-profile-preview\s*\{[^}]*var\(--v8-reflection-hero\)[^}]*var\(--v8-shadow-hero-lit\)/s);
  assert.match(shell, /\.v8-context-strip\s*\{[^}]*var\(--v8-shadow-header-lit\)/s);
  assert.match(shell, /\.v8-continuity\s*\{[^}]*var\(--v8-shadow-hero-lit\)/s);
  assert.match(shell, /\.v8-home-brain\s*\{[^}]*var\(--v8-shadow-brain-lit\)/s);
  assert.match(shell, /\.v8-command-dialog\s*\{[^}]*var\(--v8-shadow-window-open\)/s);

  const staticLights = [
    entry.match(/\.v8-entry__intro::before\s*\{[^}]*\}/s)?.[0] || "",
    shell.match(/\.v8-continuity\s*\{[^}]*\}/s)?.[0] || "",
    shell.match(/\.v8-home-brain\s*\{[^}]*\}/s)?.[0] || ""
  ].join("\n");
  assert.doesNotMatch(staticLights, /animation:|filter:|backdrop-filter:/);
});

test("Dynamic shadows share one elevation and interaction contract", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");

  for (let level = 0; level <= 5; level += 1) assert.match(tokens, new RegExp(`--v8-shadow-height-${level}:`));
  for (const state of ["hover-filter", "focus-filter", "press-filter", "drag-filter", "panel-rest", "window-open", "modal-open", "window-focus"]) {
    assert.match(tokens, new RegExp(`--v8-shadow-${state}:`));
  }
  assert.match(tokens, /--v8-interaction-shadow:var\(--v8-shadow-hover-filter\)/);
  assert.match(components, /:where\(\.is-dragging,\[data-drag-state="dragging"\],\[aria-grabbed="true"\]\)[^}]*var\(--v8-interaction-drag-filter\)/s);
  assert.match(components, /\.v8-window-surface:focus-within[^}]*var\(--v8-shadow-window-focus\)/s);
  assert.match(components, /\.v8-panel\.is-open[^}]*var\(--v8-shadow-window-open\)/s);
  assert.match(entry, /\.v8-profile-dialog-layer\.is-open \.v8-profile-dialog[^}]*var\(--v8-shadow-modal-open\)/s);
  assert.match(shell, /\.v8-command-layer\.is-open \.v8-command-dialog[^}]*var\(--v8-shadow-modal-open\)/s);
  assert.match(shell, /\.v8-mission-layer\.is-open \.v8-mission-dialog[^}]*var\(--v8-shadow-modal-open\)/s);
  assert.match(shell, /\.v8-dock-app\.is-dragging \.v8-dock-app__plate[^}]*var\(--v8-shadow-height-4\)/s);
  assert.doesNotMatch(components, /:hover[^\{]*\{[^\}]*box-shadow:/);
});

test("Premium cursor experience exposes semantic intent without pointer tracking", () => {
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const haptics = fs.readFileSync(new URL("../v8/ui/visual-haptics.mjs", import.meta.url), "utf8");
  const cursorBlock = components.match(/@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\n\}/)?.[0] || "";

  for (const intent of ["pointer", "text", "grab", "grabbing", "ew-resize", "progress", "help", "not-allowed"]) {
    assert.match(cursorBlock, new RegExp(`cursor:${intent}`));
  }
  assert.match(cursorBlock, /:hover:not\(:focus-visible\)[^}]*var\(--v8-interaction-filter\)[^}]*var\(--v8-interaction-hover-transform\)/s);
  assert.match(cursorBlock, /\[draggable="true"\]/);
  assert.match(cursorBlock, /\[aria-busy="true"\]/);
  assert.doesNotMatch(components, /cursor:\s*url\(/);
  assert.doesNotMatch(haptics, /pointermove|mousemove|requestAnimationFrame/);
});

test("Motion polish shares one hover focus and press contract", () => {
  const tokens = fs.readFileSync(new URL("../v8/styles/tokens.css", import.meta.url), "utf8");
  const components = fs.readFileSync(new URL("../v8/styles/components.css", import.meta.url), "utf8");
  const entry = fs.readFileSync(new URL("../v8/styles/entry.css", import.meta.url), "utf8");
  const base = fs.readFileSync(new URL("../v8/styles/base.css", import.meta.url), "utf8");
  const shell = fs.readFileSync(new URL("../v8/styles/shell.css", import.meta.url), "utf8");
  const presence = fs.readFileSync(new URL("../v8/styles/presence.css", import.meta.url), "utf8");
  const presenceEngine = fs.readFileSync(new URL("../v8/core/presence-engine.mjs", import.meta.url), "utf8");
  const profiles = fs.readFileSync(new URL("../v8/entry/profile-selection.mjs", import.meta.url), "utf8");

  assert.match(tokens, /--v8-physics-spring:\s*cubic-bezier/);
  assert.match(tokens, /--v8-ease-spring:\s*var\(--v8-physics-spring\)/);
  assert.match(tokens, /--v8-physics-(?:impulse|friction|momentum|inertia|drift|orbit):/);
  assert.match(tokens, /--v8-interaction-focus-transform:\s*translate3d/);
  assert.match(tokens, /--v8-interaction-shadow:\s*var\(--v8-shadow-hover-filter\)/);
  assert.match(components, /transition-duration:\s*var\(--v8-interaction-duration\)/);
  assert.match(components, /transition-timing-function:\s*var\(--v8-ease-spring\)/);
  assert.match(components, /:focus-visible\s*\{[^}]*var\(--v8-interaction-focus-filter\)[^}]*var\(--v8-interaction-focus-transform\)/s);
  assert.match(components, /:active\s*\{[^}]*var\(--v8-interaction-press-transform\)[^}]*var\(--v8-ease-press\)/s);
  assert.match(shell, /\.v8-dock-host\s*\{[^}]*transition:\s*transform[^;]*var\(--v8-ease-spring\)/s);
  assert.match(components, /\.v8-panel\s*\{[^}]*var\(--v8-physics-momentum\)[^}]*var\(--v8-physics-inertia\)/s);
  assert.match(presenceEngine, /easing:\s*String\(config\.easing\s*\|\|\s*motion\.easing\s*\|\|\s*"cubic-bezier/);
  assert.doesNotMatch(profiles, /\.animate\(/);
  assert.doesNotMatch([base, components, entry, shell, presence].join("\n").match(/animation:[^;]+/g)?.join("\n") || "", /\blinear\b/);
  assert.doesNotMatch(shell, /transition:\s*left/);
  assert.doesNotMatch(shell, /transform\s+220ms/);
  assert.doesNotMatch(entry, /\.v8-entry--login \.v8-button\s*\{[^}]*transition-timing-function/);
  assert.match(tokens, /prefers-reduced-motion:\s*reduce[\s\S]*--v8-interaction-focus-transform:\s*none/);
});
