import { getUserState, setUserState } from "@/lib/user-state";

export const BRAIN_MEMORY_CATEGORIES = [
  "interface",
  "habits",
  "widgets",
  "schedules",
  "task-types",
  "spaces",
  "flows",
  "response-style",
  "goals",
] as const;

export const BRAIN_PERMISSION_CATEGORIES = [
  "notes",
  "tasks",
  "calendar",
  "connections",
  "gaming",
  "activity",
  "files",
  "profile",
  "settings",
] as const;

export const BRAIN_PERSONAS = ["concise", "balanced", "expert", "coach", "creative", "developer", "custom"] as const;
export const BRAIN_TONES = ["calm", "direct", "warm", "technical", "creative"] as const;
export const BRAIN_DETAIL = ["brief", "balanced", "detailed"] as const;
export const BRAIN_SUGGESTION_FREQUENCIES = ["off", "low", "balanced", "high"] as const;
export const BRAIN_AUTOMATION_LEVELS = ["manual", "suggest-only", "confirm", "trusted"] as const;
export const BRAIN_PROVIDERS = ["context", "openai", "anthropic", "groq", "gemini", "ollama", "lm-studio"] as const;
export const BRAIN_RETENTION_DAYS = [30, 90, 365] as const;

export type BrainMemoryCategory = (typeof BRAIN_MEMORY_CATEGORIES)[number];
export type BrainPermission = (typeof BRAIN_PERMISSION_CATEGORIES)[number];
export type BrainPersona = (typeof BRAIN_PERSONAS)[number];
export type BrainTone = (typeof BRAIN_TONES)[number];
export type BrainDetail = (typeof BRAIN_DETAIL)[number];
export type BrainSuggestionFrequency = (typeof BRAIN_SUGGESTION_FREQUENCIES)[number];
export type BrainAutomationLevel = (typeof BRAIN_AUTOMATION_LEVELS)[number];
export type BrainProvider = (typeof BRAIN_PROVIDERS)[number];

export type BrainMemoryPreferences = {
  enabled: boolean;
  retentionDays: number;
  categories: Record<BrainMemoryCategory, boolean>;
};

export type BrainPermissions = Record<BrainPermission, boolean>;

export type BrainProviderPreferences = {
  active: BrainProvider;
  model: string;
  fallback: BrainProvider;
  privacy: "minimal" | "full-context";
};

export type BrainBriefing = {
  enabled: boolean;
  concise: boolean;
};

export type BrainAutomationRule = {
  id: string;
  enabled: boolean;
  trigger: { type: "route" | "space" | "time"; value: string };
  actionId: string;
  createdAt: number;
};

export type BrainPreferences = {
  enabled: boolean;
  assistantName: string;
  persona: BrainPersona;
  tone: BrainTone;
  detail: BrainDetail;
  language: string;
  proactive: boolean;
  suggestionFrequency: BrainSuggestionFrequency;
  automationLevel: BrainAutomationLevel;
  notifications: boolean;
  sounds: boolean;
  silentInFocus: boolean;
  briefing: BrainBriefing;
  provider: BrainProviderPreferences;
  memory: BrainMemoryPreferences;
  permissions: BrainPermissions;
  automations: BrainAutomationRule[];
};

export const DEFAULT_BRAIN_PREFERENCES: BrainPreferences = Object.freeze({
  enabled: true,
  assistantName: "Brain",
  persona: "balanced",
  tone: "calm",
  detail: "brief",
  language: "auto",
  proactive: true,
  suggestionFrequency: "balanced",
  automationLevel: "suggest-only",
  notifications: true,
  sounds: true,
  silentInFocus: true,
  briefing: { enabled: true, concise: true },
  provider: { active: "groq" as BrainProvider, model: "llama-3.1-8b-instant", fallback: "context" as BrainProvider, privacy: "minimal" as "minimal" | "full-context" },
  memory: {
    enabled: true,
    retentionDays: 90,
    categories: Object.fromEntries(BRAIN_MEMORY_CATEGORIES.map((c) => [c, true])) as Record<BrainMemoryCategory, boolean>,
  },
  permissions: Object.fromEntries(BRAIN_PERMISSION_CATEGORIES.map((c) => [c, true])) as BrainPermissions,
  automations: [],
});

const KEY = "ethone-brain-preferences-v1";
const STATE_KEY = "brainPreferences";

function safeText(value: unknown, fallback = "", limit = 200): string {
  const clean = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (clean || fallback).slice(0, limit);
}

function booleans(input: unknown, keys: readonly string[], fallback: Record<string, boolean>): Record<string, boolean> {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return Object.fromEntries(keys.map((key) => [key, Object.hasOwn(source, key) ? source[key] === true : fallback[key] === true]));
}

export function sanitizeBrainPreferences(input: unknown): BrainPreferences {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const provider = source.provider && typeof source.provider === "object" ? (source.provider as Record<string, unknown>) : {};
  const memory = source.memory && typeof source.memory === "object" ? (source.memory as Record<string, unknown>) : {};
  const briefing = source.briefing && typeof source.briefing === "object" ? (source.briefing as Record<string, unknown>) : {};
  const retention = Number((memory as Record<string, unknown>).retentionDays);
  return Object.freeze({
    enabled: source.enabled !== false,
    assistantName: safeText(source.assistantName, DEFAULT_BRAIN_PREFERENCES.assistantName, 32),
    persona: BRAIN_PERSONAS.includes(source.persona as BrainPersona) ? (source.persona as BrainPersona) : DEFAULT_BRAIN_PREFERENCES.persona,
    tone: BRAIN_TONES.includes(source.tone as BrainTone) ? (source.tone as BrainTone) : DEFAULT_BRAIN_PREFERENCES.tone,
    detail: BRAIN_DETAIL.includes(source.detail as BrainDetail) ? (source.detail as BrainDetail) : DEFAULT_BRAIN_PREFERENCES.detail,
    language: /^[a-z]{2}(?:-[A-Z]{2})?$/.test(String(source.language || "")) ? String(source.language) : "auto",
    proactive: source.proactive !== false,
    suggestionFrequency: BRAIN_SUGGESTION_FREQUENCIES.includes(source.suggestionFrequency as BrainSuggestionFrequency)
      ? (source.suggestionFrequency as BrainSuggestionFrequency)
      : DEFAULT_BRAIN_PREFERENCES.suggestionFrequency,
    automationLevel: BRAIN_AUTOMATION_LEVELS.includes(source.automationLevel as BrainAutomationLevel)
      ? (source.automationLevel as BrainAutomationLevel)
      : DEFAULT_BRAIN_PREFERENCES.automationLevel,
    notifications: source.notifications !== false,
    sounds: source.sounds !== false,
    silentInFocus: source.silentInFocus !== false,
    briefing: Object.freeze({
      enabled: (briefing as Record<string, unknown>).enabled !== false,
      concise: (briefing as Record<string, unknown>).concise !== false,
    }),
    provider: Object.freeze({
      active: BRAIN_PROVIDERS.includes(provider.active as BrainProvider) ? (provider.active as BrainProvider) : DEFAULT_BRAIN_PREFERENCES.provider.active,
      model: safeText(provider.model, DEFAULT_BRAIN_PREFERENCES.provider.model, 80),
      fallback: BRAIN_PROVIDERS.includes(provider.fallback as BrainProvider) ? (provider.fallback as BrainProvider) : DEFAULT_BRAIN_PREFERENCES.provider.fallback,
      privacy: provider.privacy === "full-context" ? "full-context" : "minimal",
    }),
    memory: Object.freeze({
      enabled: (memory as Record<string, unknown>).enabled !== false,
      retentionDays: BRAIN_RETENTION_DAYS.includes(retention as (typeof BRAIN_RETENTION_DAYS)[number]) ? retention : DEFAULT_BRAIN_PREFERENCES.memory.retentionDays,
      categories: booleans((memory as Record<string, unknown>).categories, BRAIN_MEMORY_CATEGORIES as unknown as string[], DEFAULT_BRAIN_PREFERENCES.memory.categories as unknown as Record<string, boolean>) as Record<BrainMemoryCategory, boolean>,
    }),
    permissions: booleans(source.permissions, BRAIN_PERMISSION_CATEGORIES as unknown as string[], DEFAULT_BRAIN_PREFERENCES.permissions as unknown as Record<string, boolean>) as BrainPermissions,
    automations: Array.isArray(source.automations) ? source.automations.map(sanitizeAutomationRule).filter((r): r is BrainAutomationRule => r !== null) : [],
  });
}

function sanitizeAutomationRule(input: unknown): BrainAutomationRule | null {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const id = safeText(source.id, "", 60);
  if (!id) return null;
  const trigger = source.trigger && typeof source.trigger === "object" ? (source.trigger as Record<string, unknown>) : {};
  const type = ["route", "space", "time"].includes(String(trigger.type)) ? String(trigger.type) : "route";
  return Object.freeze({
    id,
    enabled: source.enabled !== false,
    trigger: Object.freeze({
      type: type as "route" | "space" | "time",
      value: safeText(trigger.value, type === "time" ? "09:00" : "home", 60),
    }),
    actionId: safeText(source.actionId, "", 80),
    createdAt: Number.isFinite(Number(source.createdAt)) ? Number(source.createdAt) : Date.now(),
  });
}

export function patchBrainPreferences(current: BrainPreferences, path: string, value: unknown): BrainPreferences {
  const parts = String(path || "").split(".").filter(Boolean).slice(0, 3);
  if (!parts.length) return current;
  const copy = JSON.parse(JSON.stringify(current));
  let cursor: Record<string, unknown> = copy;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== "object") cursor[parts[i]] = {};
    cursor = cursor[parts[i]] as Record<string, unknown>;
  }
  cursor[parts.at(-1) as string] = value;
  return sanitizeBrainPreferences(copy);
}

export function loadBrainPreferences(): BrainPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_BRAIN_PREFERENCES };
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizeBrainPreferences(raw ? JSON.parse(raw) : {});
  } catch {
    return { ...DEFAULT_BRAIN_PREFERENCES };
  }
}

export function saveBrainPreferences(preferences: BrainPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(preferences));
}

export async function loadBrainPreferencesAsync(): Promise<BrainPreferences> {
  try {
    const remote = await getUserState<Partial<BrainPreferences>>(STATE_KEY, {});
    return sanitizeBrainPreferences({ ...DEFAULT_BRAIN_PREFERENCES, ...remote });
  } catch {
    return loadBrainPreferences();
  }
}

export async function saveBrainPreferencesAsync(preferences: BrainPreferences): Promise<void> {
  saveBrainPreferences(preferences);
  try {
    await setUserState(STATE_KEY, preferences);
  } catch {
    // localStorage fallback
  }
}
