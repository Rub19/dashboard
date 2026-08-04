/**
 * Focus Timer / Pomodoro Engine
 * ─────────────────────────────
 * Provides a configurable work→break→work cycle with subscriber notifications
 * for the status bar, notifications, and sound system.
 *
 * Default: 25 min work → 5 min break → repeat
 * Long break every 4 cycles: 15 min
 */

export const FOCUS_PRESETS = Object.freeze([
  { id: "pomodoro", label: "Pomodoro (25/5)", work: 25, short: 5, long: 15, cycles: 4 },
  { id: "deep", label: "Deep Work (50/10)", work: 50, short: 10, long: 20, cycles: 3 },
  { id: "quick", label: "Sprint (15/3)", work: 15, short: 3, long: 10, cycles: 4 },
  { id: "custom", label: "Personnalisé", work: 25, short: 5, long: 15, cycles: 4 }
]);

export function createFocusTimer(runtime = {}) {
  const subscribers = new Set();
  let state = Object.freeze({
    phase: "idle",      // "idle" | "work" | "break" | "longbreak" | "paused"
    preset: "pomodoro",
    remaining: 0,       // seconds
    total: 0,           // seconds (total for current phase)
    cycle: 0,           // current cycle number (1-based)
    maxCycles: 4,
    pausedPhase: null
  });

  let intervalId = 0;
  const timerFn = runtime.setInterval || (typeof setInterval !== "undefined" ? setInterval : () => 0);
  const clearFn = runtime.clearInterval || (typeof clearInterval !== "undefined" ? clearInterval : () => {});

  function notify(event) {
    const snapshot = { ...state, ...event };
    for (const fn of subscribers) {
      try { fn(snapshot); } catch {}
    }
  }

  function tick() {
    if (state.phase === "idle" || state.phase === "paused") return;
    const next = state.remaining - 1;
    if (next <= 0) {
      onPhaseComplete();
      return;
    }
    state = Object.freeze({ ...state, remaining: next });
    notify({ type: "tick" });
  }

  function onPhaseComplete() {
    if (state.phase === "work") {
      const nextCycle = state.cycle;
      if (nextCycle >= state.maxCycles) {
        startPhase("longbreak");
      } else {
        startPhase("break");
      }
      notify({ type: "phase-complete", completed: "work" });
    } else if (state.phase === "break") {
      startPhase("work");
      notify({ type: "phase-complete", completed: "break" });
    } else if (state.phase === "longbreak") {
      state = Object.freeze({ ...state, phase: "idle", remaining: 0, total: 0, cycle: 0 });
      stopInterval();
      notify({ type: "session-complete" });
    }
  }

  function startPhase(phase) {
    const preset = FOCUS_PRESETS.find((p) => p.id === state.preset) || FOCUS_PRESETS[0];
    let minutes = preset.work;
    let nextCycle = state.cycle;
    if (phase === "work") {
      minutes = preset.work;
      nextCycle = state.cycle + 1;
    } else if (phase === "break") {
      minutes = preset.short;
    } else if (phase === "longbreak") {
      minutes = preset.long;
      nextCycle = 0;
    }
    const total = minutes * 60;
    state = Object.freeze({ ...state, phase, remaining: total, total, cycle: nextCycle, maxCycles: preset.cycles, pausedPhase: null });
  }

  function startInterval() {
    stopInterval();
    intervalId = timerFn(tick, 1000);
  }

  function stopInterval() {
    if (intervalId) clearFn(intervalId);
    intervalId = 0;
  }

  function start(presetId = "pomodoro") {
    const preset = FOCUS_PRESETS.find((p) => p.id === presetId) || FOCUS_PRESETS[0];
    state = Object.freeze({
      phase: "idle",
      preset: preset.id,
      remaining: 0,
      total: 0,
      cycle: 0,
      maxCycles: preset.cycles,
      pausedPhase: null
    });
    startPhase("work");
    startInterval();
    notify({ type: "started" });
    return state;
  }

  function pause() {
    if (state.phase === "idle" || state.phase === "paused") return state;
    state = Object.freeze({ ...state, pausedPhase: state.phase, phase: "paused" });
    stopInterval();
    notify({ type: "paused" });
    return state;
  }

  function resume() {
    if (state.phase !== "paused" || !state.pausedPhase) return state;
    state = Object.freeze({ ...state, phase: state.pausedPhase, pausedPhase: null });
    startInterval();
    notify({ type: "resumed" });
    return state;
  }

  function stop() {
    stopInterval();
    state = Object.freeze({ phase: "idle", preset: state.preset, remaining: 0, total: 0, cycle: 0, maxCycles: state.maxCycles, pausedPhase: null });
    notify({ type: "stopped" });
    return state;
  }

  function skip() {
    if (state.phase === "idle") return state;
    onPhaseComplete();
    notify({ type: "skipped" });
    return state;
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  }

  function getState() {
    return state;
  }

  function formatRemaining(seconds = state.remaining) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function destroy() {
    stopInterval();
    subscribers.clear();
  }

  return Object.freeze({
    start,
    pause,
    resume,
    stop,
    skip,
    subscribe,
    getState,
    formatRemaining,
    destroy
  });
}
