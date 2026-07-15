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
  assert.equal(experience.resolveVisualContext({ mode: "DÃ©veloppement", flow: "Gaming session", space: "focus", hour: 23 }), "dev");
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

  const source = fs.readFileSync(new URL("../v8/core/experience.ïÎö¶‰žËkºwµçA¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ•¹¥¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½½É”½ÁÉ•Í•¹”µ•¹¥¹”¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍ¡•±°€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Õ¤½Í¡•±°¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ‘½¬€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Õ¤½‘½¬¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ…±•¹‘…È€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½…±•¹‘…È¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ…Ñ¥Ù¥Ñä€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½…Ñ¥Ù¥Ñä¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ½¹¹•Ñ¥½¹Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½½¹¹•Ñ¥½¹Ì¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÑ½…ÍÐ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Õ¤½Ñ½…ÍÐ¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì((€™½È€¡½¹ÍÐ­¥¹½˜l‰‰É…¥¸ˆ°€‰±½Õˆ°€‰¹½Ñ¥™¥…Ñ¥½¹Ìˆ°€‰µ…¥°‰t¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡mÍ¡•±°°‘½¬°…Ñ¥Ù¥Ñä°½¹¹•Ñ¥½¹Ít¹©½¥¸ ‰q¸ˆ¤°¹•ÜI•áÀ¡‘…Ñ„µÁÉ•Í•¹”µ¥½¸õlˆt‘í­¥¹‘õlˆu€¤¤ì(€ô(€…ÍÍ•ÉÐ¹µ…Ñ ¡‘½¬°€½ql‰‰É…¥¸ˆ°€‰…±•¹‘…È‰qup¹¥¹±Õ‘•Íp¡¥Ñ•µp¹¥‘p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡‘½¬°€½ÁÉ•Í•¹•%½¸¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½•Ñ¡½¹”éµ…¥°µÉ••¥Ù•¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½¹½Ñ¥™¥…Ñ¥½¹Í%µÁ½ÉÑ…¹Ð¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡…±•¹‘…È°€½…±•¹‘…ÉAÉ•Í•¹•MÑ…Ñ”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½…ÍÐ°€½ÑåÁ”€ôôô€‰•ÉÉ½ÈˆqñqðÑåÁ”€ôôô€‰Ý…É¹¥¹œˆ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½‘…Ñ„µÁÉ•Í•¹”µÍå¹Œô‰Íå¹¥¹œ‰mqÍqMt©ØàµÁÉ•Í•¹”µÍå¹mxít©¥¹™¥¹¥Ñ”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½‘…Ñ„µÁÉ•Í•¹”µµ•‘¥„ô‰Á±…å¥¹œ‰mqÍqMt©ØàµÁÉ•Í•¹”µµ•‘¥„µ±•Ù•±mxít©¥¹™¥¹¥Ñ”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½‘…Ñ„µÁÉ•Í•¹”µµ…¥°ô‰¹•Ü‰mqÍqMt©ØàµÁÉ•Í•¹”µµ…¥°µ…ÉÉ¥Ù•mxít©‰½Ñ ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éqÌ©É•‘Õ•mqÍqMt©p¹Øàµµ…¥°µÍ¥¹…±mqÍqMt©…¹¥µ…Ñ¥½¸éqÌ©¹½¹”¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡•¹¥¹”°€½Í•Ñ%¹Ñ•ÉÙ…±ñÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¼¤ì)ô¤ì()Ñ•ÍÐ ‰1¥Ù”]¥‘•Ðµ½Ñ¥½¸¥ÌÍ•µ…¹Ñ¥Œ•¹ÑÉ…±¥é•‰½Õ¹‘•…¹É•‘Õ•µµ½Ñ¥½¸Í…™”ˆ°€ ¤€ôøì(€½¹ÍÐÁÉ•Í•¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½ÁÉ•Í•¹”¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ•¹¥¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½½É”½ÁÉ•Í•¹”µ•¹¥¹”¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ…ÁÀ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½…ÁÀ½…ÁÀµÉÕ¹Ñ¥µ”¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐµ…¥¸€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½µ…¥¸¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÁÉ½™¥±•Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½•¹ÑÉä½ÁÉ½™¥±”µÍ•±•Ñ¥½¸¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍ½ÕÉ•Ì€ôl(€€€€ˆ¸¸½Øà½Á…•Ì½¡½µ”¹µ©Ìˆ°(€€€€ˆ¸¸½Øà½Á…•Ì½Ñ…Í­Ì¹µ©Ìˆ°(€€€€ˆ¸¸½Øà½Á…•Ì½…±•¹‘…È¹µ©Ìˆ°(€€€€ˆ¸¸½Øà½Á…•Ì½‰É…¥¸¹µ©Ìˆ°(€€€€ˆ¸¸½Øà½Õ¤½Á…¹•°¹µ©Ìˆ°(€€€€ˆ¸¸½Øà½Õ¤½µ¥ÍÍ¥½¸µ½¹ÑÉ½°¹µ©Ìˆ(€t¹µ…À ¡Á…Ñ ¤€ôø™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0¡Á…Ñ °¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤¤¹©½¥¸ ‰q¸ˆ¤ì((€™½È€¡½¹ÍÐ­¥¹½˜l‰‰É…¥¸ˆ°€‰±½¬ˆ°€‰µ•ÑÉ¥Œˆ°€‰Á±…¹¹¥¹œˆ°€‰Í¥¹…°ˆ°€‰Ý¥‘•Ð‰t¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡mÁÉ½™¥±•Ì°Í½ÕÉ•Ít¹©½¥¸ ‰q¸ˆ¤°¹•ÜI•áÀ¡±¥Ù•-¥¹éqqÌ¨ˆ‘í­¥¹‘ô‰€¤¤ì(€ô(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ½™¥±•Ì°€½ÁÉ•Í•¹•p¹ÑÉ…¹Í¥Ñ¥½¹Q•áÑp¡±¥Ù•Q¥µ”±myõt©­¥¹éqÌ¨‰±½¬ˆ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ½™¥±•Ì°€½ÁÉ•Í•¹•pýp¹ÑÉ…¹Í¥Ñ¥½¹MÕÉ™…•p¡ÁÉ•Ù¥•Ü±qÌ©qíqÌ©­¥¹éqÌ¨‰ÁÉ½™¥±”ˆ¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡ÁÉ½™¥±•Ì°€½p¹…¹¥µ…Ñ•p ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡…ÁÀ°€½™Õ¹Ñ¥½¸™¥¹¥Í¡I½ÕÑ•5½Õ¹ÑmqÍqMt©ÁÉ•Í•¹•p¹É•Ù•…±]¥‘•ÑÍp¡Í¡•±±p¹ÍÑ…•p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡…ÁÀ°€½ÁÉ•Í•¹•p¹É•Ù•…±]¥‘•ÑÍp¡Í¡•±±p¹Á…¹•±!½ÍÑp¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡…ÁÀ°€½ÁÉ•Í•¹•p¹É•Ù•…±]¥‘•ÑÍp¡Í¡•±±p¹µ¥ÍÍ¥½¹!½ÍÑp¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡µ…¥¸°€½ÁÉ•Í•¹•¹¥¹”éqÌ©ÁÉ•Í•¹”¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡•¹¥¹”°€½5ÕÑ…Ñ¥½¹=‰Í•ÉÙ•ÉñI•Í¥é•=‰Í•ÉÙ•Éñ%¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•ÉñÍ•Ñ%¹Ñ•ÉÙ…±ñÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½‘ÕÉ…Ñ¥½¸éqÌ©5…Ñ¡p¹µ¥¹p¡½¹™¥p¹µ…áÕÉ…Ñ¥½¹qÌ©qñqñqÌ¨ÐÈÀ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½5…Ñ¡p¹µ¥¹p Ü±qÌ©É•Ù•…±•‘p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½ÁÉ½Á•ÉÑä€´µØàµ±¥Ù”µ¹Õµ‰•ÈµÙ…±Õ”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€¼´µØàµ±¥Ù”µÍÑ…•ÈéqÌ¨ÈÑµÌ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½­•å™É…µ•ÌØàµ±¥Ù”´ üéÝ¥‘•Ññµ•‘¥…ñ‰É…¥¹ñÁ±…¹¹¥¹œ¤µ•¹Ñ•È¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½­•å™É…µ•ÌØàµ±¥Ù”µ¹Õµ‰•Èµ½Õ¹Ð¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éqÌ©É•‘Õ•mqÍqMt©qm‘…Ñ„µ±¥Ù”µ¹Õµ‰•ÉqumqÍqMt©‘¥ÍÁ±…äéqÌ©¹½¹”¼¤ì)ô¤ì()Ñ•ÍÐ ‰Mµ…ÉÐÑ¥Ù¥Ñä™••‘‰…¬¥Ì•¹ÑÉ…±¥é•…¹…ÑÑ…¡•Ñ¼ÍÕ•ÍÍ™Õ°ÍåÍÑ•´¡…¹•Ìˆ°€ ¤€ôøì(€½¹ÍÐ•¹¥¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½½É”½ÁÉ•Í•¹”µ•¹¥¹”¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÁÉ•Í•¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½ÁÉ•Í•¹”¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÑ½…ÍÐ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Õ¤½Ñ½…ÍÐ¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ…ÁÀ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½…ÁÀ½…ÁÀµÉÕ¹Ñ¥µ”¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÁÉ½™¥±•Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½•¹ÑÉä½ÁÉ½™¥±”µÍ•±•Ñ¥½¸¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÑ…Í­Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½Ñ…Í­Ì¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ¹½Ñ•Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½¹½Ñ•Ì¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ…±•¹‘…È€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½…±•¹‘…È¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ™¥±•Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Á…•Ì½™¥±•Ì¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì((€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½™Õ¹Ñ¥½¸Í¥¹…±Ñ¥Ù¥Ñä¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½Q%Y%Qe}A!ML€ô¹•ÜM•Ñp¡ql‰•¹Ñ•Èˆ°€‰ÕÁ‘…Ñ”ˆ°€‰•á¥Ð‰qup¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹¥¹”°€½µ…áÕÉ…Ñ¥½¸éqÌ¨ÈÔÀ¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡•¹¥¹”°€½5ÕÑ…Ñ¥½¹=‰Í•ÉÙ•ÉñI•Í¥é•=‰Í•ÉÙ•Éñ%¹Ñ•ÉÍ•Ñ¥½¹=‰Í•ÉÙ•ÉñÍ•Ñ%¹Ñ•ÉÙ…±ñÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹”°€½qm‘…Ñ„µÁÉ•Í•¹”µ…Ñ¥Ù¥Ñåqumyõt©Ý¥±°µ¡…¹”éqÌ©ÑÉ…¹Í™½É´°½Á…¥Ñä¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡…ÁÀ°€½É•…Ñ•Q½…ÍÑ5…¹…•Ép¡Í¡•±±p¹Ñ½…ÍÑI•¥½¸°qìÍ½Õ¹‘Ì°ÁÉ•Í•¹”qõp¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½…ÍÐ°€½Í¥¹…±Ñ¥Ù¥Ñåpýp¹p¡¹½‘”°€‰¹½Ñ¥™¥…Ñ¥½¸ˆ°qìÁ¡…Í”è€‰•¹Ñ•Èˆqõp¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½…ÍÐ°€½Í¥¹…±Ñ¥Ù¥Ñåp¡É•½É‘p¹¹½‘”°€‰¹½Ñ¥™¥…Ñ¥½¸ˆ°qìÁ¡…Í”è€‰•á¥Ðˆ°½¹½µÁ±•Ñ”èÉ•µ½Ù”qõp¤¼¤ì(€™½È€¡½¹ÍÐmÍ½ÕÉ”°­¥¹‘t½˜mmÑ…Í­Ì°€‰Ñ…Í¬‰t°m¹½Ñ•Ì°€‰¹½Ñ”‰t°m…±•¹‘…È°€‰…±•¹‘…È‰t°m™¥±•Ì°€‰™¥±”‰t°mÁÉ½™¥±•Ì°€‰Ý¥‘•Ð‰ut¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡Í½ÕÉ”°¹•ÜI•áÀ¡Í¥¹…±Ñ¥Ù¥Ñåmyqq¹t¨ˆ‘í­¥¹‘ô‰€¤¤ì(€€€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡Í½ÕÉ”°€½p¹…¹¥µ…Ñ•p ¼¤ì(€ô(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡Ñ…Í­Ì°€½É•Ù•…±]¥‘•ÑÍp¡±¥ÍÑp¤¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡…±•¹‘…È°€½É•Ù•…±]¥‘•ÑÍp¡…•¹‘…p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡…ÁÀ°€½Íå¹MÑ…ÑÕÌéqÌ©¹•áÑp¹Íå¹MÑ…ÑÕÌ¼¤ì)ô¤ì()Ñ•ÍÐ ‰QåÁ½É…Á¡äÑ½­•¹Ì­••ÀÁÉ¥µ…Éä…¹Í•½¹‘…Éä½¹Ñ•¹ÐÉ•…‘…‰±”ˆ°€ ¤€ôøì(€½¹ÍÐÑ½­•¹Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Ñ½­•¹Ì¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ‰…Í”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½‰…Í”¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ•¹ÑÉä€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½•¹ÑÉä¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍ¡•±°€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Í¡•±°¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍÑå±•Ì€ômÑ½­•¹Ì°‰…Í”°•¹ÑÉä°Í¡•±±t¹©½¥¸ ‰q¸ˆ¤ì((€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµÑ•áÐµÍ•½¹‘…ÉäéqÌ¨ŒÑØ¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµµÕÑ•éqÌ¨ŒäÈå‘…„¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµÑåÁ”µ…ÁÑ¥½¸éqÌ©±…µÁp Áp¸ÜÕÉ•´±mxít¬´µ‘•¹Í¥Ñäµ™½¹ÐµÍ…±”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµÑåÁ”µ±…‰•°éqÌ©±…µÁp Áp¸àÄÈÕÉ•´±mxít¬´µ‘•¹Í¥Ñäµ™½¹ÐµÍ…±”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµÑåÁ”µ‰½‘äéqÌ©±…µÁp Áp¸äÌÜÕÉ•´±mxít¬´µ‘•¹Í¥Ñäµ™½¹ÐµÍ…±”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ™½¹Ðµµ¥É¼éqÌ©Ù…Ép ´µØàµÑåÁ”µ…ÁÑ¥½¹p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ™½¹ÐµáÌéqÌ©Ù…Ép ´µØàµÑåÁ”µ±…‰•±p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ±¥¹”µ‰…Í”éqÌ©Ù…Ép ´µ‘•¹Í¥Ñäµ±¥¹”µ¡•¥¡Ñp¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ±¥¹”µÉ•±…á•éqÌ¨Åp¸Ü¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡‰…Í”°€½™½¹Ðµ­•É¹¥¹œéqÌ©¹½Éµ…°¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡‰…Í”°€½™½¹ÐµÍå¹Ñ¡•Í¥ÌéqÌ©¹½¹”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹ÑÉä°€½p¹Øàµ•¹ÑÉå}}‰É…¹µ±¥¹•qÌ©qímyõt©™½¹ÐµÝ•¥¡ÐéqÌ©Ù…Ép ´µØàµÝ•¥¡Ðµµ•‘¥Õµp¥myõt©Ñ•áÐµÝÉ…ÀéqÌ©‰…±…¹”½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹ØàµÁ…”µ¡•…‘¥¹œ ÅqÌ©qímyõt©™½¹ÐµÝ•¥¡ÐéqÌ©Ù…Ép ´µØàµÝ•¥¡Ðµ‰½±‘p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ‰É•…‘ÉÕµˆµ½¹Ñ•áÑ}}¥Ñ•µqÌ©qímyõt©™½¹ÐµÍ¥é”éqÌ©Ù…Ép ´µØàµ™½¹Ðµµ¥É½p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹ØàµÍÑ…ÑÕÌµ‰…ÉqÌ©qímyõt©™½¹ÐµÍ¥é”éqÌ©Ù…Ép ´µØàµ™½¹Ðµµ¥É½p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½µ•‘¥„p¡µ…àµÝ¥‘Ñ éqÌ¨ÄÔÀÁÁáp¤…¹p¡µ¥¸µÝ¥‘Ñ éqÌ¨äàÅÁáp¥mqÍqMt©p¹Øàµ‰É•…‘ÉÕµ‰Ìp¹Øàµ‰É•…‘ÉÕµˆµÍÑ•À´µÝ½É­ÍÁ…”¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½µ•‘¥„p¡µ…àµÝ¥‘Ñ éqÌ¨àÈÁÁáp¥mqÍqMt©p¹Øàµ‰É•…‘ÉÕµ‰Ìp¹Øàµ‰É•…‘ÉÕµˆµÍÑ•ÁqÌ©qíqÌ©‘¥ÍÁ±…äéqÌ©¹½¹”¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡ÍÑå±•Ì°€½±•ÑÑ•ÈµÍÁ…¥¹œéqÌ¨ ü„À üèíñqÌ¤¥l´¹q‘t¬ üé•µñÉ•µñÁà¤¼¤ì)ô¤ì()Ñ•ÍÐ ‰±½‰…°±¥¡Ñ¥¹œÕÍ•Ì±…å•É•ÍÑ…Ñ¥Œ±¥¡ÐÝ¥Ñ¡½ÕÐÉÕ¹Ñ¥µ”…¹¥µ…Ñ¥½¸ˆ°€ ¤€ôøì(€½¹ÍÐÑ½­•¹Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Ñ½­•¹Ì¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ½µÁ½¹•¹ÑÌ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½½µÁ½¹•¹ÑÌ¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ•¹ÑÉä€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½•¹ÑÉä¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍ¡•±°€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Í¡•±°¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì((€™½È€¡½¹ÍÐÑ½­•¸½˜l‰ÍÕÉ™…”ˆ°€‰¡•É¼ˆ°€‰‰É…¹ˆ°€‰‰É…¥¸ˆ°€‰Ý¥¹‘½Ü‰t¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°¹•ÜI•áÀ¡€´µØàµ±¥¡Ð´‘íÑ½­•¹ôé€¤¤ì(€ô(€™½È€¡½¹ÍÐ±•Ù•°½˜l‰…Éˆ°€‰¡•É¼ˆ°€‰‰É…¥¸ˆ°€‰µ½‘…°ˆ°€‰¡•…‘•È‰t¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°¹•ÜI•áÀ¡€´µØàµÍ¡…‘½Ü´‘í±•Ù•±ôµ±¥Ðé€¤¤ì(€ô(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½p¹ØàµÍÕÉ™…•qÌ©qímyõt©Ù…Ép ´µØàµÉ•™±•Ñ¥½¸µ…É‘p¥myõt©Ù…Ép ´µØàµÍ¡…‘½Üµ…Éµ±¥Ñp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½p¹ØàµÁ…¹•±qÌ©qímyõt©Ù…Ép ´µØàµÍ¡…‘½ÜµÁ…¹•°µÉ•ÍÑp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹ÑÉä°€½p¹Øàµ•¹ÑÉå}}¥¹ÑÉ¼èé‰•™½É•qÌ©qímyõt©É…‘¥…°µÉ…‘¥•¹Ñp¡•±±¥ÁÍ”±Ù…Ép ´µØàµ±¥¡Ðµ‰É…¹‘p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹ÑÉä°€½p¹ØàµÁÉ½™¥±”µÁÉ•Ù¥•ÝqÌ©qímyõt©Ù…Ép ´µØàµÉ•™±•Ñ¥½¸µ¡•É½p¥myõt©Ù…Ép ´µØàµÍ¡…‘½Üµ¡•É¼µ±¥Ñp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ½¹Ñ•áÐµÍÑÉ¥ÁqÌ©qímyõt©Ù…Ép ´µØàµÍ¡…‘½Üµ¡•…‘•Èµ±¥Ñp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ½¹Ñ¥¹Õ¥ÑåqÌ©qímyõt©Ù…Ép ´µØàµÍ¡…‘½Üµ¡•É¼µ±¥Ñp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ¡½µ”µ‰É…¥¹qÌ©qímyõt©Ù…Ép ´µØàµÍ¡…‘½Üµ‰É…¥¸µ±¥Ñp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ½µµ…¹µ‘¥…±½qÌ©qímyõt©Ù…Ép ´µØàµÍ¡…‘½ÜµÝ¥¹‘½Üµ½Á•¹p¤½Ì¤ì((€½¹ÍÐÍÑ…Ñ¥1¥¡ÑÌ€ôl(€€€•¹ÑÉä¹µ…Ñ  ½p¹Øàµ•¹ÑÉå}}¥¹ÑÉ¼èé‰•™½É•qÌ©qímyõt©qô½Ì¤ü¹lÁtñð€ˆˆ°(€€€Í¡•±°¹µ…Ñ  ½p¹Øàµ½¹Ñ¥¹Õ¥ÑåqÌ©qímyõt©qô½Ì¤ü¹lÁtñð€ˆˆ°(€€€Í¡•±°¹µ…Ñ  ½p¹Øàµ¡½µ”µ‰É…¥¹qÌ©qímyõt©qô½Ì¤ü¹lÁtñð€ˆˆ(€t¹©½¥¸ ‰q¸ˆ¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡ÍÑ…Ñ¥1¥¡ÑÌ°€½…¹¥µ…Ñ¥½¸éñ™¥±Ñ•Èéñ‰…­‘É½Àµ™¥±Ñ•Èè¼¤ì)ô¤ì()Ñ•ÍÐ ‰å¹…µ¥ŒÍ¡…‘½ÝÌÍ¡…É”½¹”•±•Ù…Ñ¥½¸…¹¥¹Ñ•É…Ñ¥½¸½¹ÑÉ…Ðˆ°€ ¤€ôøì(€½¹ÍÐÑ½­•¹Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Ñ½­•¹Ì¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ½µÁ½¹•¹ÑÌ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½½µÁ½¹•¹ÑÌ¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ•¹ÑÉä€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½•¹ÑÉä¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍ¡•±°€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Í¡•±°¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì((€™½È€¡±•Ð±•Ù•°€ô€Àì±•Ù•°€ðô€Ôì±•Ù•°€¬ô€Ä¤…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°¹•ÜI•áÀ¡€´µØàµÍ¡…‘½Üµ¡•¥¡Ð´‘í±•Ù•±ôé€¤¤ì(€™½È€¡½¹ÍÐÍÑ…Ñ”½˜l‰¡½Ù•Èµ™¥±Ñ•Èˆ°€‰™½ÕÌµ™¥±Ñ•Èˆ°€‰ÁÉ•ÍÌµ™¥±Ñ•Èˆ°€‰‘É…œµ™¥±Ñ•Èˆ°€‰Á…¹•°µÉ•ÍÐˆ°€‰Ý¥¹‘½Üµ½Á•¸ˆ°€‰µ½‘…°µ½Á•¸ˆ°€‰Ý¥¹‘½Üµ™½ÕÌ‰t¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°¹•ÜI•áÀ¡€´µØàµÍ¡…‘½Ü´‘íÍÑ…Ñ•ôé€¤¤ì(€ô(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ¥¹Ñ•É…Ñ¥½¸µÍ¡…‘½ÜéÙ…Ép ´µØàµÍ¡…‘½Üµ¡½Ù•Èµ™¥±Ñ•Ép¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€¼éÝ¡•É•p¡p¹¥Ìµ‘É…¥¹œ±qm‘…Ñ„µ‘É…œµÍÑ…Ñ”ô‰‘É…¥¹œ‰qt±qm…É¥„µÉ…‰‰•ô‰ÑÉÕ”‰qup¥myõt©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µ‘É…œµ™¥±Ñ•Ép¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½p¹ØàµÝ¥¹‘½ÜµÍÕÉ™…”é™½ÕÌµÝ¥Ñ¡¥¹myõt©Ù…Ép ´µØàµÍ¡…‘½ÜµÝ¥¹‘½Üµ™½ÕÍp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½p¹ØàµÁ…¹•±p¹¥Ìµ½Á•¹myõt©Ù…Ép ´µØàµÍ¡…‘½ÜµÝ¥¹‘½Üµ½Á•¹p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡•¹ÑÉä°€½p¹ØàµÁÉ½™¥±”µ‘¥…±½œµ±…å•Ép¹¥Ìµ½Á•¸p¹ØàµÁÉ½™¥±”µ‘¥…±½myõt©Ù…Ép ´µØàµÍ¡…‘½Üµµ½‘…°µ½Á•¹p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ½µµ…¹µ±…å•Ép¹¥Ìµ½Á•¸p¹Øàµ½µµ…¹µ‘¥…±½myõt©Ù…Ép ´µØàµÍ¡…‘½Üµµ½‘…°µ½Á•¹p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµµ¥ÍÍ¥½¸µ±…å•Ép¹¥Ìµ½Á•¸p¹Øàµµ¥ÍÍ¥½¸µ‘¥…±½myõt©Ù…Ép ´µØàµÍ¡…‘½Üµµ½‘…°µ½Á•¹p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ‘½¬µ…ÁÁp¹¥Ìµ‘É…¥¹œp¹Øàµ‘½¬µ…ÁÁ}}Á±…Ñ•myõt©Ù…Ép ´µØàµÍ¡…‘½Üµ¡•¥¡Ð´Ñp¤½Ì¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡½µÁ½¹•¹ÑÌ°€¼é¡½Ù•Émyqít©qímyqõt©‰½àµÍ¡…‘½Üè¼¤ì)ô¤ì()Ñ•ÍÐ ‰AÉ•µ¥Õ´ÕÉÍ½È•áÁ•É¥•¹”•áÁ½Í•ÌÍ•µ…¹Ñ¥Œ¥¹Ñ•¹ÐÝ¥Ñ¡½ÕÐÁ½¥¹Ñ•ÈÑÉ…­¥¹œˆ°€ ¤€ôøì(€½¹ÍÐ½µÁ½¹•¹ÑÌ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½½µÁ½¹•¹ÑÌ¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ¡…ÁÑ¥Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½Õ¤½Ù¥ÍÕ…°µ¡…ÁÑ¥Ì¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÕÉÍ½É	±½¬€ô½µÁ½¹•¹ÑÌ¹µ…Ñ  ½µ•‘¥„p¡¡½Ù•Èè¡½Ù•Ép¤…¹p¡Á½¥¹Ñ•Èè™¥¹•p¥qÌ©qímqÍqMt¨ýq¹qô¼¤ü¹lÁtñð€ˆˆì((€™½È€¡½¹ÍÐ¥¹Ñ•¹Ð½˜l‰Á½¥¹Ñ•Èˆ°€‰Ñ•áÐˆ°€‰É…ˆˆ°€‰É…‰‰¥¹œˆ°€‰•ÜµÉ•Í¥é”ˆ°€‰ÁÉ½É•ÍÌˆ°€‰¡•±Àˆ°€‰¹½Ðµ…±±½Ý•‰t¤ì(€€€…ÍÍ•ÉÐ¹µ…Ñ ¡ÕÉÍ½É	±½¬°¹•ÜI•áÀ¡ÕÉÍ½Èè‘í¥¹Ñ•¹Ñõ€¤¤ì(€ô(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÕÉÍ½É	±½¬°€¼é¡½Ù•Èé¹½Ñp é™½ÕÌµÙ¥Í¥‰±•p¥myõt©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µ™¥±Ñ•Ép¥myõt©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µ¡½Ù•ÈµÑÉ…¹Í™½Éµp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÕÉÍ½É	±½¬°€½qm‘É……‰±”ô‰ÑÉÕ”‰qt¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÕÉÍ½É	±½¬°€½qm…É¥„µ‰ÕÍäô‰ÑÉÕ”‰qt¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡½µÁ½¹•¹ÑÌ°€½ÕÉÍ½ÈéqÌ©ÕÉ±p ¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡¡…ÁÑ¥Ì°€½Á½¥¹Ñ•Éµ½Ù•ñµ½ÕÍ•µ½Ù•ñÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¼¤ì)ô¤ì()Ñ•ÍÐ ‰5½Ñ¥½¸Á½±¥Í Í¡…É•Ì½¹”¡½Ù•È™½ÕÌ…¹ÁÉ•ÍÌ½¹ÑÉ…Ðˆ°€ ¤€ôøì(€½¹ÍÐÑ½­•¹Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Ñ½­•¹Ì¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ½µÁ½¹•¹ÑÌ€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½½µÁ½¹•¹ÑÌ¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ•¹ÑÉä€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½•¹ÑÉä¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐ‰…Í”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½‰…Í”¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÍ¡•±°€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½Í¡•±°¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÁÉ•Í•¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½ÍÑå±•Ì½ÁÉ•Í•¹”¹ÍÌˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÁÉ•Í•¹•¹¥¹”€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½½É”½ÁÉ•Í•¹”µ•¹¥¹”¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì(€½¹ÍÐÁÉ½™¥±•Ì€ô™Ì¹É•…‘¥±•Må¹Œ¡¹•ÜUI0 ˆ¸¸½Øà½•¹ÑÉä½ÁÉ½™¥±”µÍ•±•Ñ¥½¸¹µ©Ìˆ°¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤°€‰ÕÑ˜àˆ¤ì((€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµÁ¡åÍ¥ÌµÍÁÉ¥¹œéqÌ©Õ‰¥Œµ‰•é¥•È¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ•…Í”µÍÁÉ¥¹œéqÌ©Ù…Ép ´µØàµÁ¡åÍ¥ÌµÍÁÉ¥¹p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµÁ¡åÍ¥Ì´ üé¥µÁÕ±Í•ñ™É¥Ñ¥½¹ñµ½µ•¹ÑÕµñ¥¹•ÉÑ¥…ñ‘É¥™Ññ½É‰¥Ð¤è¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ¥¹Ñ•É…Ñ¥½¸µ™½ÕÌµÑÉ…¹Í™½É´éqÌ©ÑÉ…¹Í±…Ñ”Í¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€¼´µØàµ¥¹Ñ•É…Ñ¥½¸µÍ¡…‘½ÜéqÌ©Ù…Ép ´µØàµÍ¡…‘½Üµ¡½Ù•Èµ™¥±Ñ•Ép¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½ÑÉ…¹Í¥Ñ¥½¸µ‘ÕÉ…Ñ¥½¸éqÌ©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µ‘ÕÉ…Ñ¥½¹p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½ÑÉ…¹Í¥Ñ¥½¸µÑ¥µ¥¹œµ™Õ¹Ñ¥½¸éqÌ©Ù…Ép ´µØàµ•…Í”µÍÁÉ¥¹p¤¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€¼é™½ÕÌµÙ¥Í¥‰±•qÌ©qímyõt©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µ™½ÕÌµ™¥±Ñ•Ép¥myõt©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µ™½ÕÌµÑÉ…¹Í™½Éµp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€¼é…Ñ¥Ù•qÌ©qímyõt©Ù…Ép ´µØàµ¥¹Ñ•É…Ñ¥½¸µÁÉ•ÍÌµÑÉ…¹Í™½Éµp¥myõt©Ù…Ép ´µØàµ•…Í”µÁÉ•ÍÍp¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Í¡•±°°€½p¹Øàµ‘½¬µ¡½ÍÑqÌ©qímyõt©ÑÉ…¹Í¥Ñ¥½¸éqÌ©ÑÉ…¹Í™½Éµmxít©Ù…Ép ´µØàµ•…Í”µÍÁÉ¥¹p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡½µÁ½¹•¹ÑÌ°€½p¹ØàµÁ…¹•±qÌ©qímyõt©Ù…Ép ´µØàµÁ¡åÍ¥Ìµµ½µ•¹ÑÕµp¥myõt©Ù…Ép ´µØàµÁ¡åÍ¥Ìµ¥¹•ÉÑ¥…p¤½Ì¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡ÁÉ•Í•¹•¹¥¹”°€½•…Í¥¹œéqÌ©MÑÉ¥¹p¡½¹™¥p¹•…Í¥¹qÌ©qñqñqÌ©µ½Ñ¥½¹p¹•…Í¥¹qÌ©qñqñqÌ¨‰Õ‰¥Œµ‰•é¥•È¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡ÁÉ½™¥±•Ì°€½p¹…¹¥µ…Ñ•p ¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡m‰…Í”°½µÁ½¹•¹ÑÌ°•¹ÑÉä°Í¡•±°°ÁÉ•Í•¹•t¹©½¥¸ ‰q¸ˆ¤¹µ…Ñ  ½…¹¥µ…Ñ¥½¸émxít¬½œ¤ü¹©½¥¸ ‰q¸ˆ¤ñð€ˆˆ°€½q‰±¥¹•…Éqˆ¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡Í¡•±°°€½ÑÉ…¹Í¥Ñ¥½¸éqÌ©±•™Ð¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡Í¡•±°°€½ÑÉ…¹Í™½ÉµqÌ¬ÈÈÁµÌ¼¤ì(€…ÍÍ•ÉÐ¹‘½•Í9½Ñ5…Ñ ¡•¹ÑÉä°€½p¹Øàµ•¹ÑÉä´µ±½¥¸p¹Øàµ‰ÕÑÑ½¹qÌ©qímyõt©ÑÉ…¹Í¥Ñ¥½¸µÑ¥µ¥¹œµ™Õ¹Ñ¥½¸¼¤ì(€…ÍÍ•ÉÐ¹µ…Ñ ¡Ñ½­•¹Ì°€½ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸éqÌ©É•‘Õ•mqÍqMt¨´µØàµ¥¹Ñ•É…Ñ¥½¸µ™½ÕÌµÑÉ…¹Í™½É´éqÌ©¹½¹”¼¤ì)ô¤ì(