import { test } from "node:test";
import assert from "node:assert/strict";
import { createFocusTimer, FOCUS_PRESETS } from "../v8/services/focus-timer.mjs";

test("FOCUS_PRESETS contains expected presets with valid durations", () => {
  assert.ok(FOCUS_PRESETS.length >= 3);
  const ids = FOCUS_PRESETS.map((p) => p.id);
  assert.ok(ids.includes("pomodoro"));
  assert.ok(ids.includes("deep"));
  assert.ok(ids.includes("quick"));
  for (const p of FOCUS_PRESETS) {
    assert.ok(p.work > 0 && p.short > 0 && p.long > 0 && p.cycles > 0);
    assert.ok(p.label.length > 0);
  }
});

test("createFocusTimer starts in idle and transitions to work phase", () => {
  const timer = createFocusTimer();
  const initial = timer.getState();
  assert.equal(initial.phase, "idle");
  assert.equal(initial.remaining, 0);

  timer.start("pomodoro");
  const s = timer.getState();
  assert.equal(s.phase, "work");
  assert.equal(s.total, 25 * 60);
  assert.equal(s.remaining, 25 * 60);
  assert.equal(s.cycle, 1);
  assert.equal(s.preset, "pomodoro");
  timer.destroy();
});

test("pause and resume maintain remaining time", () => {
  const timer = createFocusTimer();
  timer.start("quick");
  const before = timer.getState().remaining;
  timer.pause();
  assert.equal(timer.getState().phase, "paused");
  assert.equal(timer.getState().remaining, before);
  timer.resume();
  assert.equal(timer.getState().phase, "work");
  timer.destroy();
});

test("stop resets to idle", () => {
  const timer = createFocusTimer();
  timer.start("deep");
  assert.equal(timer.getState().phase, "work");
  timer.stop();
  assert.equal(timer.getState().phase, "idle");
  assert.equal(timer.getState().remaining, 0);
  timer.destroy();
});

test("skip advances from work to break phase", () => {
  const timer = createFocusTimer();
  timer.start("pomodoro");
  assert.equal(timer.getState().phase, "work");
  timer.skip();
  assert.equal(timer.getState().phase, "break");
  assert.equal(timer.getState().total, 5 * 60);
  timer.destroy();
});

test("formatRemaining produces MM:SS format", () => {
  const timer = createFocusTimer();
  assert.equal(timer.formatRemaining(0), "00:00");
  assert.equal(timer.formatRemaining(61), "01:01");
  assert.equal(timer.formatRemaining(600), "10:00");
  assert.equal(timer.formatRemaining(1500), "25:00");
  timer.destroy();
});

test("subscribe fires on state changes", () => {
  const timer = createFocusTimer();
  const events = [];
  timer.subscribe((e) => events.push(e.type));
  timer.start("quick");
  assert.ok(events.includes("started"));
  timer.pause();
  assert.ok(events.includes("paused"));
  timer.resume();
  assert.ok(events.includes("resumed"));
  timer.stop();
  assert.ok(events.includes("stopped"));
  timer.destroy();
});

test("deep work preset has correct durations", () => {
  const timer = createFocusTimer();
  timer.start("deep");
  const s = timer.getState();
  assert.equal(s.total, 50 * 60);
  assert.equal(s.maxCycles, 3);
  timer.destroy();
});

test("long break triggers after max cycles", () => {
  const timer = createFocusTimer();
  timer.start("pomodoro");
  // Cycle through 4 work→break pairs
  for (let i = 0; i < 3; i++) {
    assert.equal(timer.getState().phase, "work");
    timer.skip(); // work → break
    assert.equal(timer.getState().phase, "break");
    timer.skip(); // break → work
  }
  // 4th work phase
  assert.equal(timer.getState().phase, "work");
  assert.equal(timer.getState().cycle, 4);
  timer.skip(); // work → longbreak (since cycle == maxCycles)
  assert.equal(timer.getState().phase, "longbreak");
  assert.equal(timer.getState().total, 15 * 60);
  timer.destroy();
});
