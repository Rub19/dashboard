import { BRAND_MARK_SVG } from "../ui/navigation.mjs";

export const SPOTLIGHT_DURATION_MS = 420;
export const AMBIENT_REFRESH_MS = 5 * 60 * 1000;
export const AMBIENT_TRANSITION_MS = 3200;
const SPOTLIGHT_STATE_KEY = "ethone:v8-ui-state";

const CONTEXT_PATTERNS = Object.freeze([
  Object.freeze(["gaming", /\b(?:gaming|game|gamer|jeu|valorant|steam)\b/]),
  Object.freeze(["dev", /\b(?:dev|developer|development|developpement|developpeur|code|coding|github|terminal)\b/]),
  Object.freeze(["study", /\b(?:study|studying|etudes?|revisions?|learn|learning|cours|education|apprentissage)\b/]),
  Object.freeze(["focus", /\b(?:focus|deep[ -]?work|concentration)\b/]),
  Object.freeze(["night", /\b(?:night|nuit)\b/])
]);

const DAY_PROFILES = Object.freeze([
  Object.freeze({ minute: 0, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: Object.freeze([145, 132, 217]), lightAlpha: 0.018, shadowAlpha: 0.09 }),
  Object.freeze({ minute: 240, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: Object.freeze([145, 132, 217]), lightAlpha: 0.018, shadowAlpha: 0.09 }),
  Object.freeze({ minute: 360, lightness: 1.035, halo: 0.96, background: 0.46, motion: 29, soundGain: 0.99, soundRate: 1.012, color: Object.freeze([255, 225, 196]), lightAlpha: 0.03, shadowAlpha: 0.028 }),
  Object.freeze({ minute: 720, lightness: 1, halo: 1, background: 0.46, motion: 32, soundGain: 0.98, soundRate: 1, color: Object.freeze([205, 226, 255]), lightAlpha: 0.02, shadowAlpha: 0.04 }),
  Object.freeze({ minute: 1080, lightness: 0.985, halo: 0.9, background: 0.42, motion: 36, soundGain: 0.95, soundRate: 0.995, color: Object.freeze([247, 184, 132]), lightAlpha: 0.024, shadowAlpha: 0.058 }),
  Object.freeze({ minute: 1260, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: Object.freeze([145, 132, 217]), lightAlpha: 0.018, shadowAlpha: 0.09 }),
  Object.freeze({ minute: 1440, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: Object.freeze([145, 132, 217]), lightAlpha: 0.018, shadowAlpha: 0.09 })
]);

const CONTEXT_TUNING = Object.freeze({
  neutral: Object.freeze({ halo: 1, motion: 1, sound: 1, rate: 1, tone: 0, accent: 10 }),
  gaming: Object.freeze({ halo: 1.08, motion: 0.92, sound: 1, rate: 1.008, tone: 0.4, accent: 15 }),
  dev: Object.freeze({ halo: 0.98, motion: 1, sound: 0.98, rate: 1, tone: 0.12, accent: 13 }),
  study: Object.freeze({ halo: 0.9, motion: 1.08, sound: 0.95, rate: 0.998, tone: -0.15, accent: 12 }),
  focus: Object.freeze({ halo: 0.82, motion: 1.15, sound: 0.93, rate: 0.995, tone: -0.6, accent: 10 }),
  night: Object.freeze({ halo: 0.78, motion: 1.18, sound: 0.92, rate: 0.99, tone: -0.65, accent: 9 })
});

const THEME_TUNING = Object.freeze({
  night: Object.freeze({ lightness: 0.98, halo: 0.96, background: 0.97, sound: 0.96, rate: 0.997, tone: -0.45 }),
  graphite: Object.freeze({ lightness: 1.025, halo: 0.98, background: 1.02, sound: 1, rate: 1.003, tone: 0.18 })
});

const PHASE_SOUND_TONE = Object.freeze({ night: -0.4, morning: 0.25, afternoon: 0.35, evening: -0.15 });

const SPACE_TUNING = Object.freeze({
  personal: Object.freeze({ halo: 1, motion: 1, sound: 1, background: 1 }),
  focus: Object.freeze({ halo: 0.9, motion: 1.08, sound: 0.94, background: 0.94 }),
  studio: Object.freeze({ halo: 1.08, motion: 0.97, sound: 1, background: 1.02 })
});

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function mix(from, to, amount) {
  return from + ((to - from) * amount);
}

function smoothstep(value) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - (2 * amount));
}

function validDate(value) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? new Date(value.getTime()) : new Date();
}

function dayProfile(date) {
  const minute = date.getHours() * 60 + date.getMinutes() + (date.getSeconds() / 60);
  let from = DAY_PROFILES[0];
  let to = DAY_PROFILES[DAY_PROFILES.length - 1];
  for (let index = 0; index < DAY_PROFILES.length - 1; index += 1) {
    if (minute >= DAY_PROFILES[index].minute && minute <= DAY_PROFILES[index + 1].minute) {
      from = DAY_PROFILES[index];
      to = DAY_PROFILES[index + 1];
      break;
    }
  }
  const span = Math.max(1, to.minute - from.minute);
  const amount = smoothstep((minute - from.minute) / span);
  return Object.freeze({
    minute,
    lightness: mix(from.lightness, to.lightness, amount),
    halo: mix(from.halo, to.halo, amount),
    background: mix(from.background, to.background, amount),
    motion: mix(from.motion, to.motion, amount),
    soundGain: mix(from.soundGain, to.soundGain, amount),
    soundRate: mix(from.soundRate, to.soundRate, amount),
    color: Object.freeze(from.color.map((channel, index) => Math.round(mix(channel, to.color[index], amount)))),
    lightAlpha: mix(from.lightAlpha, to.lightAlpha, amount),
    shadowAlpha: mix(from.shadowAlpha, to.shadowAlpha, amount)
  });
}

function focusIsActive(state, context) {
  if (state.focus === true || state.focusMode === true || context === "focus") return true;
  return /\b(?:focus|deep[ -]?work|concentration)\b/.test(normalizedContextText(`${state.space || ""} ${state.flow || ""} ${state.mode || ""}`));
}

function rgba(color, alpha) {
  return `rgba(${color.join(", ")}, ${clamp(alpha, 0, 1).toFixed(4)})`;
}

function setStyle(target, property, value) {
  if (!target?.style?.setProperty) return;
  if (target.style.getPropertyValue?.(property) === value) return;
  target.style.setProperty(property, value);
}

function normalizedContextText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function resolveVisualContext(state = {}) {
  const sources = [state.context, state.mode, state.activity, state.flow, state.space];
  for (const value of sources) {
    const source = normalizedContextText(value);
    for (const [context, pattern] of CONTEXT_PATTERNS) {
      if (pattern.test(source)) return context;
    }
  }
  const parsedHour = Number.parseInt(state.hour, 10);
  const hour = Number.isFinite(parsedHour) ? Math.min(23, Math.max(0, parsedHour)) : 12;
  return hour >= 21 || hour < 6 ? "night" : "neutral";
}

export function millisecondsUntilVisualContextChange(value = new Date()) {
  const date = value instanceof Date && Number.isFinite(value.getTime()) ? new Date(value.getTime()) : new Date();
  const next = new Date(date.getTime());
  if (date.getHours() < 6) {
    next.setHours(6, 0, 0, 0);
  } else if (date.getHours() < 21) {
    next.setHours(21, 0, 0, 0);
  } else {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0);
  }
  return Math.max(1, next.getTime() - date.getTime());
}

export function resolveAmbientPhase(value) {
  const parsedHour = Number.parseInt(value, 10);
  const hour = Number.isFinite(parsedHour) ? Math.min(23, Math.max(0, parsedHour)) : 12;
  if (hour < 6 || hour >= 21) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function millisecondsUntilAmbientChange(value = new Date()) {
  const date = validDate(value);
  for (const hour of [6, 12, 18, 21]) {
    const boundary = new Date(date.getTime());
    boundary.setHours(hour, 0, 0, 0);
    if (boundary.getTime() > date.getTime()) return boundary.getTime() - date.getTime();
  }
  const nextMorning = new Date(date.getTime());
  nextMorning.setDate(nextMorning.getDate() + 1);
  nextMorning.setHours(6, 0, 0, 0);
  return Math.max(1, nextMorning.getTime() - date.getTime());
}

export function millisecondsUntilAmbientRefresh(value = new Date(), interval = AMBIENT_REFRESH_MS) {
  const date = validDate(value);
  const cadence = Math.max(60 * 1000, Number(interval) || AMBIENT_REFRESH_MS);
  const remainder = ((date.getTime() % cadence) + cadence) % cadence;
  const nextSample = remainder === 0 ? cadence : cadence - remainder;
  return Math.max(1000, Math.min(nextSample, millisecondsUntilAmbientChange(date)));
}

export function resolveAmbientProfile(state = {}, options = {}) {
  const date = validDate(options.date);
  const day = dayProfile(date);
  const context = resolveVisualContext({ ...state, hour: date.getHours() });
  const phase = resolveAmbientPhase(date.getHours());
  const focus = focusIsActive(state, context);
  const contextTuning = CONTEXT_TUNING[context] || CONTEXT_TUNING.neutral;
  const themeTuning = THEME_TUNING[state.theme] || THEME_TUNING.night;
  const spaceTuning = SPACE_TUNING[state.space] || SPACE_TUNING.personal;
  const halo = clamp(day.halo * contextTuning.halo * themeTuning.halo * spaceTuning.halo * (focus ? 0.96 : 1), 0.58, 1.12);
  const backgroundOpacity = clamp(day.background * themeTuning.background * spaceTuning.background, 0.32, 0.5);
  const lightness = clamp(day.lightness * themeTuning.lightness * (focus ? 0.992 : 1), 0.94, 1.07);
  const saturation = clamp(1 + ((halo - 0.84) * 0.08), 0.985, 1.035);
  const motionSeconds = clamp(day.motion * contextTuning.motion * spaceTuning.motion * (focus ? 1.04 : 1), 26, 48);
  const soundGain = clamp(day.soundGain * contextTuning.sound * themeTuning.sound * spaceTuning.sound * (focus ? 0.98 : 1), 0.72, 1.04);
  const soundRate = clamp(day.soundRate * contextTuning.rate * themeTuning.rate, 0.975, 1.035);
  const soundTone = clamp((PHASE_SOUND_TONE[phase] || 0) + contextTuning.tone + themeTuning.tone + (focus ? -0.25 : 0), -1.4, 0.7);
  const accentMix = clamp(contextTuning.accent + (state.space === "studio" ? 2 : 0), 8, 17);
  const lightAlpha = clamp(day.lightAlpha * lightness, 0.012, 0.034);

  return Object.freeze({
    context,
    phase,
    focus,
    progress: Number((day.minute / 1440).toFixed(5)),
    lightness: Number(lightness.toFixed(4)),
    saturation: Number(saturation.toFixed(4)),
    backgroundOpacity: Number(backgroundOpacity.toFixed(4)),
    opacityMin: Number((backgroundOpacity * 0.82).toFixed(4)),
    opacityMax: Number(Math.min(0.64, backgroundOpacity * 1.18).toFixed(4)),
    haloPercent: Number((5.3 * halo).toFixed(3)),
    glowPercent: Number((3.5 * halo).toFixed(3)),
    surfaceLightPercent: Number((8 * halo).toFixed(3)),
    heroLightPercent: Number((10 * halo).toFixed(3)),
    accentMix: Number(accentMix.toFixed(2)),
    motionSeconds: Number(motionSeconds.toFixed(2)),
    soundGain: Number(soundGain.toFixed(4)),
    soundRate: Number(soundRate.toFixed(4)),
    soundTone: Number(soundTone.toFixed(3)),
    lightColor: rgba(day.color, lightAlpha),
    highlightColor: rgba(day.color, lightAlpha * 0.78),
    shadowColor: rgba([0, 0, 0], day.shadowAlpha)
  });
}

export function applyAmbientUI(target, state = {}, options = {}) {
  if (!target?.dataset) return resolveAmbientProfile(state, options);
  const profile = resolveAmbientProfile(state, options);
  if (target.dataset.context !== profile.context) target.dataset.context = profile.context;
  if (target.dataset.ambient !== profile.phase) target.dataset.ambient = profile.phase;
  target.dataset.ambientFocus = profile.focus ? "true" : "false";
  target.dataset.ambientSound = profile.soundGain < 0.9 ? "quiet" : "balanced";
  target.dataset.ambientEngine = "ready";
  setStyle(target, "--v8-ambient-phase-light", profile.lightColor);
  setStyle(target, "--v8-ambient-phase-shadow", profile.shadowColor);
  setStyle(target, "--v8-ambient-highlight", profile.highlightColor);
  setStyle(target, "--v8-ambient-background-opacity", String(profile.backgroundOpacity));
  setStyle(target, "--v8-ambient-opacity-min", String(profile.opacityMin));
  setStyle(target, "--v8-ambient-opacity-max", String(profile.opacityMax));
  setStyle(target, "--v8-ambient-lightness", String(profile.lightness));
  setStyle(target, "--v8-ambient-saturation", String(profile.saturation));
  setStyle(target, "--v8-ambient-halo-percent", `${profile.haloPercent}%`);
  setStyle(target, "--v8-ambient-glow-percent", `${profile.glowPercent}%`);
  setStyle(target, "--v8-ambient-surface-light-percent", `${profile.surfaceLightPercent}%`);
  setStyle(target, "--v8-ambient-hero-light-percent", `${profile.heroLightPercent}%`);
  setStyle(target, "--v8-ambient-accent-mix", `${profile.accentMix}%`);
  setStyle(target, "--v8-ambient-motion-duration", `${profile.motionSeconds}s`);
  setStyle(target, "--v8-ambient-transition", `${AMBIENT_TRANSITION_MS}ms`);
  return profile;
}

export function createAmbientEngine(options = {}) {
  const runtime = options.runtime || globalThis;
  const documentRef = options.document || runtime.document || null;
  const target = options.target || documentRef?.documentElement || null;
  const soundManager = options.soundManager || null;
  const getState = typeof options.getState === "function" ? options.getState : () => currentState;
  let currentState = options.initialState && typeof options.initialState === "object" ? options.initialState : {};
  let lastProfile = null;
  let timer = 0;
  let active = false;
  let destroyed = false;

  function clearTimer() {
    if (timer) runtime.clearTimeout?.(timer);
    timer = 0;
  }

  function schedule(date) {
    clearTimer();
    if (!active || destroyed || documentRef?.visibilityState === "hidden") return;
    timer = runtime.setTimeout?.(() => {
      timer = 0;
      refresh();
    }, millisecondsUntilAmbientRefresh(date)) || 0;
  }

  function refresh(nextState, refreshOptions = {}) {
    if (destroyed) return lastProfile;
    if (nextState && typeof nextState === "object") currentState = nextState;
    else {
      const sourced = getState();
      if (sourced && typeof sourced === "object") currentState = sourced;
    }
    const date = validDate(refreshOptions.date);
    lastProfile = applyAmbientUI(target, currentState, { date });
    soundManager?.setAmbientProfile?.({ gain: lastProfile.soundGain, rate: lastProfile.soundRate });
    soundManager?.setAdaptiveProfile?.({ tone: lastProfile.soundTone, context: lastProfile.context, theme: currentState.theme || "night" });
    if (active) schedule(date);
    return lastProfile;
  }

  function handleVisibilityChange() {
    if (documentRef?.visibilityState === "hidden") clearTimer();
    else refresh();
  }

  function start(initialState, startOptions = {}) {
    if (destroyed) return lastProfile;
    if (!active) {
      active = true;
      documentRef?.addEventListener?.("visibilitychange", handleVisibilityChange);
    }
    return refresh(initialState, startOptions);
  }

  function diagnostics() {
    return Object.freeze({
      active,
      scheduled: Boolean(timer),
      refreshMs: AMBIENT_REFRESH_MS,
      context: lastProfile?.context || "neutral",
      phase: lastProfile?.phase || "afternoon",
      focus: lastProfile?.focus === true,
      soundGain: lastProfile?.soundGain ?? 1,
      soundTone: lastProfile?.soundTone ?? 0,
      motionSeconds: lastProfile?.motionSeconds ?? 32
    });
  }

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    active = false;
    clearTimer();
    documentRef?.removeEventListener?.("visibilitychange", handleVisibilityChange);
    soundManager?.setAmbientProfile?.({ gain: 1, rate: 1 });
    soundManager?.setAdaptiveProfile?.({ tone: 0, context: "neutral", theme: "graphite" });
    return true;
  }

  return Object.freeze({ start, refresh, diagnostics, destroy });
}

export function shouldRunSpotlight(options = {}) {
  return options.enabled !== false && options.reducedMotion !== true;
}

export function readSpotlightPreference(storage) {
  try {
    const value = storage?.getItem?.(SPOTLIGHT_STATE_KEY);
    if (!value) return true;
    const state = JSON.parse(value);
    return state?.spotlightEnabled !== false;
  } catch {
    return true;
  }
}

function spotlightMarkup(documentRef) {
  const content = documentRef.createElement("div");
  content.className = "v8-spotlight__content";
  const mark = documentRef.createElement("span");
  mark.className = "v8-spotlight__mark";
  mark.innerHTML = BRAND_MARK_SVG;
  const wordmark = documentRef.createElement("span");
  wordmark.className = "v8-spotlight__wordmark";
  wordmark.textContent = "ETHONE";
  content.append(mark, wordmark);
  return content;
}

export function playSpotlight(root, options = {}) {
  const runtime = options.runtime || globalThis;
  const reducedMotion = options.reducedMotion ?? runtime.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  if (!root || !shouldRunSpotlight({ enabled: options.enabled, reducedMotion })) {
    return Object.freeze({ played: false, destroy: () => false });
  }

  const documentRef = options.document || root.ownerDocument || runtime.document;
  if (!documentRef?.createElement) return Object.freeze({ played: false, destroy: () => false });
  const duration = Math.min(500, Math.max(300, Number(options.duration) || SPOTLIGHT_DURATION_MS));
  const overlay = documentRef.createElement("div");
  overlay.className = "v8-spotlight";
  overlay.setAttribute("aria-hidden", "true");
  overlay.append(spotlightMarkup(documentRef));
  root.append(overlay);
  root.dataset.spotlight = "active";
  root.dataset.spotlightDuration = String(duration);

  let frame = 0;
  let timer = 0;
  let destroyed = false;
  const remove = () => {
    if (destroyed) return false;
    destroyed = true;
    if (frame) runtime.cancelAnimationFrame?.(frame);
    if (timer) runtime.clearTimeout?.(timer);
    overlay.remove();
    delete root.dataset.spotlight;
    return true;
  };
  const reveal = () => {
    if (destroyed) return;
    overlay.dataset.state = "revealing";
    timer = runtime.setTimeout?.(remove, duration) || 0;
  };
  frame = runtime.requestAnimationFrame?.(reveal) || 0;
  if (!frame) reveal();
  return Object.freeze({ played: true, duration, element: overlay, destroy: remove });
}
