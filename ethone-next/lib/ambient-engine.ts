export const AMBIENT_REFRESH_MS = 5 * 60 * 1000;
export const AMBIENT_TRANSITION_MS = 3200;

const CONTEXT_PATTERNS = [
  ["gaming", /\b(?:gaming|game|gamer|jeu|valorant|steam)\b/],
  ["dev", /\b(?:dev|developer|development|developpement|developpeur|code|coding|github|terminal)\b/],
  ["study", /\b(?:study|studying|etudes?|revisions?|learn|learning|cours|education|apprentissage)\b/],
  ["focus", /\b(?:focus|deep[ -]?work|concentration)\b/],
  ["night", /\b(?:night|nuit)\b/],
] as const;

type DayProfile = {
  minute: number;
  lightness: number;
  halo: number;
  background: number;
  motion: number;
  soundGain: number;
  soundRate: number;
  color: readonly [number, number, number];
  lightAlpha: number;
  shadowAlpha: number;
};

const DAY_PROFILES: DayProfile[] = [
  { minute: 0, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: [145, 132, 217], lightAlpha: 0.018, shadowAlpha: 0.09 },
  { minute: 240, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: [145, 132, 217], lightAlpha: 0.018, shadowAlpha: 0.09 },
  { minute: 360, lightness: 1.035, halo: 0.96, background: 0.46, motion: 29, soundGain: 0.99, soundRate: 1.012, color: [255, 225, 196], lightAlpha: 0.03, shadowAlpha: 0.028 },
  { minute: 720, lightness: 1, halo: 1, background: 0.46, motion: 32, soundGain: 0.98, soundRate: 1, color: [205, 226, 255], lightAlpha: 0.02, shadowAlpha: 0.04 },
  { minute: 1080, lightness: 0.985, halo: 0.9, background: 0.42, motion: 36, soundGain: 0.95, soundRate: 0.995, color: [247, 184, 132], lightAlpha: 0.024, shadowAlpha: 0.058 },
  { minute: 1260, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: [145, 132, 217], lightAlpha: 0.018, shadowAlpha: 0.09 },
  { minute: 1440, lightness: 0.965, halo: 0.78, background: 0.38, motion: 40, soundGain: 0.9, soundRate: 0.99, color: [145, 132, 217], lightAlpha: 0.018, shadowAlpha: 0.09 },
] as const;

const CONTEXT_TUNING = {
  neutral: { halo: 1, motion: 1, sound: 1, rate: 1, tone: 0, accent: 10 },
  gaming: { halo: 1.08, motion: 0.92, sound: 1, rate: 1.008, tone: 0.4, accent: 15 },
  dev: { halo: 0.98, motion: 1, sound: 0.98, rate: 1, tone: 0.12, accent: 13 },
  study: { halo: 0.9, motion: 1.08, sound: 0.95, rate: 0.998, tone: -0.15, accent: 12 },
  focus: { halo: 0.82, motion: 1.15, sound: 0.93, rate: 0.995, tone: -0.6, accent: 10 },
  night: { halo: 0.78, motion: 1.18, sound: 0.92, rate: 0.99, tone: -0.65, accent: 9 },
} as const;

const THEME_TUNING = {
  night: { lightness: 0.98, halo: 0.96, background: 0.97, sound: 0.96, rate: 0.997, tone: -0.45 },
  graphite: { lightness: 1.025, halo: 0.98, background: 1.02, sound: 1, rate: 1.003, tone: 0.18 },
  day: { lightness: 1.06, halo: 0.4, background: 0.5, sound: 1.02, rate: 1.006, tone: 0.35 },
} as const;

const PHASE_SOUND_TONE = { night: -0.4, morning: 0.25, afternoon: 0.35, evening: -0.15 } as const;

const SPACE_TUNING = {
  personal: { halo: 1, motion: 1, sound: 1, background: 1 },
  focus: { halo: 0.9, motion: 1.08, sound: 0.94, background: 0.94 },
  studio: { halo: 1.08, motion: 0.97, sound: 1, background: 1.02 },
} as const;

type AmbientState = {
  theme?: string;
  space?: string;
  mode?: string;
  flow?: string;
  activity?: string;
  context?: string;
  focus?: boolean;
  focusMode?: boolean;
  hour?: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount;
}

function smoothstep(value: number) {
  const amount = clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function validDate(value?: Date) {
  return value instanceof Date && Number.isFinite(value.getTime()) ? new Date(value.getTime()) : new Date();
}

function normalizedContextText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dayProfile(date: Date) {
  const minute = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  let from = DAY_PROFILES[0];
  let to = DAY_PROFILES[DAY_PROFILES.length - 1];
  for (let i = 0; i < DAY_PROFILES.length - 1; i++) {
    if (minute >= DAY_PROFILES[i].minute && minute <= DAY_PROFILES[i + 1].minute) {
      from = DAY_PROFILES[i];
      to = DAY_PROFILES[i + 1];
      break;
    }
  }
  const span = Math.max(1, to.minute - from.minute);
  const amount = smoothstep((minute - from.minute) / span);
  return {
    minute,
    lightness: mix(from.lightness, to.lightness, amount),
    halo: mix(from.halo, to.halo, amount),
    background: mix(from.background, to.background, amount),
    motion: mix(from.motion, to.motion, amount),
    soundGain: mix(from.soundGain, to.soundGain, amount),
    soundRate: mix(from.soundRate, to.soundRate, amount),
    color: from.color.map((c, i) => Math.round(mix(c, to.color[i], amount))) as [number, number, number],
    lightAlpha: mix(from.lightAlpha, to.lightAlpha, amount),
    shadowAlpha: mix(from.shadowAlpha, to.shadowAlpha, amount),
  };
}

export function resolveVisualContext(state: AmbientState) {
  const sources = [state.context, state.mode, state.activity, state.flow, state.space];
  for (const value of sources) {
    const source = normalizedContextText(String(value));
    for (const [context, pattern] of CONTEXT_PATTERNS) {
      if (pattern.test(source)) return context;
    }
  }
  const parsedHour = Number.parseInt(String(state.hour), 10);
  const hour = Number.isFinite(parsedHour) ? Math.min(23, Math.max(0, parsedHour)) : 12;
  return hour >= 21 || hour < 6 ? "night" : "neutral";
}

export function resolveAmbientPhase(date: Date) {
  const hour = date.getHours();
  if (hour < 6 || hour >= 21) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function focusIsActive(state: AmbientState, context: string) {
  if (state.focus === true || state.focusMode === true || context === "focus") return true;
  return /\b(?:focus|deep[ -]?work|concentration)\b/.test(
    normalizedContextText(`${state.space || ""} ${state.flow || ""} ${state.mode || ""}`)
  );
}

function resolveThemeTuning(theme: string) {
  if (theme === "aurora" || theme === "minimal" || theme === "glass") return THEME_TUNING.graphite;
  if (theme === "day" || theme === "light") return THEME_TUNING.day;
  return THEME_TUNING.night;
}

function rgba(color: [number, number, number], alpha: number) {
  return `rgba(${color.join(", ")}, ${clamp(alpha, 0, 1).toFixed(4)})`;
}

export type AmbientProfile = {
  context: string;
  phase: string;
  focus: boolean;
  progress: number;
  lightness: number;
  saturation: number;
  backgroundOpacity: number;
  opacityMin: number;
  opacityMax: number;
  haloPercent: number;
  glowPercent: number;
  surfaceLightPercent: number;
  heroLightPercent: number;
  accentMix: number;
  motionSeconds: number;
  soundGain: number;
  soundRate: number;
  soundTone: number;
  lightColor: string;
  highlightColor: string;
  shadowColor: string;
};

export function resolveAmbientProfile(state: AmbientState = {}, date?: Date): AmbientProfile {
  const d = validDate(date);
  const day = dayProfile(d);
  const context = resolveVisualContext({ ...state, hour: d.getHours() });
  const phase = resolveAmbientPhase(d);
  const focus = focusIsActive(state, context);
  const contextTuning = CONTEXT_TUNING[context as keyof typeof CONTEXT_TUNING] || CONTEXT_TUNING.neutral;
  const themeTuning = resolveThemeTuning(state.theme || "default");
  const spaceTuning = SPACE_TUNING[(state.space as keyof typeof SPACE_TUNING) || "personal"] || SPACE_TUNING.personal;

  const halo = clamp(day.halo * contextTuning.halo * themeTuning.halo * spaceTuning.halo * (focus ? 0.96 : 1), 0.58, 1.12);
  const backgroundOpacity = clamp(day.background * themeTuning.background * spaceTuning.background, 0.32, 0.5);
  const lightness = clamp(day.lightness * themeTuning.lightness * (focus ? 0.992 : 1), 0.94, 1.07);
  const saturation = clamp(1 + (halo - 0.84) * 0.08, 0.985, 1.035);
  const motionSeconds = clamp(day.motion * contextTuning.motion * spaceTuning.motion * (focus ? 1.04 : 1), 26, 48);
  const soundGain = clamp(day.soundGain * contextTuning.sound * themeTuning.sound * spaceTuning.sound * (focus ? 0.98 : 1), 0.72, 1.04);
  const soundRate = clamp(day.soundRate * contextTuning.rate * themeTuning.rate, 0.975, 1.035);
  const soundTone = clamp((PHASE_SOUND_TONE[phase as keyof typeof PHASE_SOUND_TONE] || 0) + contextTuning.tone + themeTuning.tone + (focus ? -0.25 : 0), -1.4, 0.7);
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
    shadowColor: rgba([0, 0, 0], day.shadowAlpha),
  }) as AmbientProfile;
}

export function applyAmbientVariables(target: HTMLElement, state: AmbientState = {}, date?: Date): AmbientProfile {
  const profile = resolveAmbientProfile(state, date);
  if (target.dataset.context !== profile.context) target.dataset.context = profile.context;
  if (target.dataset.ambient !== profile.phase) target.dataset.ambient = profile.phase;
  target.dataset.ambientFocus = profile.focus ? "true" : "false";
  target.dataset.ambientSound = profile.soundGain < 0.9 ? "quiet" : "balanced";
  target.dataset.ambientEngine = "ready";

  target.style.setProperty("--v8-ambient-phase-light", profile.lightColor);
  target.style.setProperty("--v8-ambient-phase-shadow", profile.shadowColor);
  target.style.setProperty("--v8-ambient-highlight", profile.highlightColor);
  target.style.setProperty("--v8-ambient-background-opacity", String(profile.backgroundOpacity));
  target.style.setProperty("--v8-ambient-opacity-min", String(profile.opacityMin));
  target.style.setProperty("--v8-ambient-opacity-max", String(profile.opacityMax));
  target.style.setProperty("--v8-ambient-lightness", String(profile.lightness));
  target.style.setProperty("--v8-ambient-saturation", String(profile.saturation));
  target.style.setProperty("--v8-ambient-halo-percent", `${profile.haloPercent}%`);
  target.style.setProperty("--v8-ambient-glow-percent", `${profile.glowPercent}%`);
  target.style.setProperty("--v8-ambient-surface-light-percent", `${profile.surfaceLightPercent}%`);
  target.style.setProperty("--v8-ambient-hero-light-percent", `${profile.heroLightPercent}%`);
  target.style.setProperty("--v8-ambient-accent-mix", `${profile.accentMix}%`);
  target.style.setProperty("--v8-ambient-motion-duration", `${profile.motionSeconds}s`);
  target.style.setProperty("--v8-ambient-transition", `${AMBIENT_TRANSITION_MS}ms`);
  return profile;
}

export function millisecondsUntilAmbientChange(value: Date) {
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

export function millisecondsUntilAmbientRefresh(value: Date, interval = AMBIENT_REFRESH_MS) {
  const date = validDate(value);
  const cadence = Math.max(60 * 1000, interval);
  const remainder = ((date.getTime() % cadence) + cadence) % cadence;
  const nextSample = remainder === 0 ? cadence : cadence - remainder;
  return Math.max(1000, Math.min(nextSample, millisecondsUntilAmbientChange(date)));
}
