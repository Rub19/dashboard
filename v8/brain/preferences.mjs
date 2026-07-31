import { sanitizeAutomationRules } from "../core/automation-engine.mjs";

const PERSONAS = new Set(["concise", "balanced", "expert", "coach", "creative", "developer", "custom"]);
const TONES = new Set(["calm", "direct", "warm", "technical", "creative"]);
const DETAIL_LEVELS = new Set(["brief", "balanced", "detailed"]);
const SUGGESTION_FREQUENCIES = new Set(["off", "low", "balanced", "high"]);
const AUTOMATION_LEVELS = new Set(["manual", "suggest-only", "confirm", "trusted"]);
const PROVIDERS = new Set(["context", "openai", "anthropic", "groq", "gemini", "ollama", "lm-studio"]);
const RETENTION_DAYS = new Set([30, 90, 365]);

const PREFERENCE_LABELS = Object.freeze({
  persona: Object.freeze({ concise: "Concis", balanced: "Equilibre", expert: "Expert", coach: "Coach", creative: "Creatif", developer: "Developpeur", custom: "Personnalisé" }),
  detail: Object.freeze({ brief: "concises", balanced: "equilibrees", detailed: "détaillées" }),
  detailOption: Object.freeze({ brief: "Concis", balanced: "Equilibre", detailed: "Détaillé" }),
  automationLevel: Object.freeze({ manual: "manuelle", "suggest-only": "sur suggestion", confirm: "avec confirmation", trusted: "de confiance" }),
  automationOption: Object.freeze({ manual: "Manuel", "suggest-only": "Suggestions uniquement", confirm: "Confirmation requise", trusted: "Actions de confiance" })
});

export const BRAIN_PERMISSION_CATEGORIES = Object.freeze([
  "notes", "tasks", "calendar", "connections", "gaming", "activity", "files", "profile", "settings"
]);

export const BRAIN_MEMORY_CATEGORIES = Object.freeze([
  "interface", "habits", "widgets", "schedules", "task-types", "spaces", "flows", "response-style", "goals"
]);

export const DEFAULT_BRAIN_PREFERENCES = Object.freeze({
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
  briefing: Object.freeze({ enabled: true, concise: true }),
  provider: Object.freeze({ active: "context", model: "context-v1", fallback: "context", privacy: "minimal" }),
  memory: Object.freeze({
    enabled: true,
    retentionDays: 90,
    categories: Object.freeze(Object.fromEntries(BRAIN_MEMORY_CATEGORIES.map((category) => [category, true])))
  }),
  permissions: Object.freeze({
    notes: true,
    tasks: true,
    calendar: true,
    connections: false,
    gaming: false,
    activity: true,
    files: false,
    profile: true,
    settings: true
  }),
  automations: Object.freeze([])
});

export function brainPreferenceLabel(group, value) {
  return PREFERENCE_LABELS[group]?.[value] || String(value || "");
}

function safeText(value, fallback, limit) {
  const clean = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return (clean || fallback).slice(0, limit);
}

function booleans(input, keys, fallback) {
  const source = input && typeof input === "object" ? input : {};
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, Object.hasOwn(source, key) ? source[key] === true : fallback[key] === true])));
}

export function sanitizeBrainPreferences(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const provider = source.provider && typeof source.provider === "object" ? source.provider : {};
  const memory = source.memory && typeof source.memory === "object" ? source.memory : {};
  const briefing = source.briefing && typeof source.briefing === "object" ? source.briefing : {};
  const retention = Number(memory.retentionDays);
  return Object.freeze({
    enabled: source.enabled !== false,
    assistantName: safeText(source.assistantName, DEFAULT_BRAIN_PREFERENCES.assistantName, 32),
    persona: PERSONAS.has(source.persona) ? source.persona : DEFAULT_BRAIN_PREFERENCES.persona,
    tone: TONES.has(source.tone) ? source.tone : DEFAULT_BRAIN_PREFERENCES.tone,
    detail: DETAIL_LEVELS.has(source.detail) ? source.detail : DEFAULT_BRAIN_PREFERENCES.detail,
    language: /^[a-z]{2}(?:-[A-Z]{2})?$/.test(String(source.language || "")) ? source.language : "auto",
    proactive: source.proactive !== false,
    suggestionFrequency: SUGGESTION_FREQUENCIES.has(source.suggestionFrequency) ? source.suggestionFrequency : DEFAULT_BRAIN_PREFERENCES.suggestionFrequency,
    automationLevel: AUTOMATION_LEVELS.has(source.automationLevel) ? source.automationLevel : DEFAULT_BRAIN_PREFERENCES.automationLevel,
    notifications: source.notifications !== false,
    sounds: source.sounds !== false,
    silentInFocus: source.silentInFocus !== false,
    briefing: Object.freeze({ enabled: briefing.enabled !== false, concise: briefing.concise !== false }),
    provider: Object.freeze({
      active: PROVIDERS.has(provider.active) ? provider.active : DEFAULT_BRAIN_PREFERENCES.provider.active,
      model: safeText(provider.model, DEFAULT_BRAIN_PREFERENCES.provider.model, 80),
      fallback: PROVIDERS.has(provider.fallback) ? provider.fallback : "context",
      privacy: provider.privacy === "full-context" ? "full-context" : "minimal"
    }),
    memory: Object.freeze({
      enabled: memory.enabled !== false,
      retentionDays: RETENTION_DAYS.has(retention) ? retention : DEFAULT_BRAIN_PREFERENCES.memory.retentionDays,
      categories: booleans(memory.categories, BRAIN_MEMORY_CATEGORIES, DEFAULT_BRAIN_PREFERENCES.memory.categories)
    }),
    permissions: booleans(source.permissions, BRAIN_PERMISSION_CATEGORIES, DEFAULT_BRAIN_PREFERENCES.permissions),
    automations: sanitizeAutomationRules(source.automations)
  });
}

export function patchBrainPreferences(current, path, value) {
  const source = sanitizeBrainPreferences(current);
  const parts = String(path || "").split(".").filter(Boolean).slice(0, 3);
  if (!parts.length) return source;
  const copy = JSON.parse(JSON.stringify(source));
  let cursor = copy;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (!cursor[parts[index]] || typeof cursor[parts[index]] !== "object") cursor[parts[index]] = {};
    cursor = cursor[parts[index]];
  }
  cursor[parts.at(-1)] = value;
  return sanitizeBrainPreferences(copy);
}
