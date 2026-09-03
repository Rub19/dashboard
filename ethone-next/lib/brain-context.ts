import type { Settings } from "./settings";

export type BrainLiveData = {
  nowPlaying?: {
    source?: string;
    title?: string;
    artist?: string;
    album?: string;
    cover?: string;
    artworkUrl?: string;
    isPlaying?: boolean;
  } | null;
  weather?: Record<string, unknown> | null;
  records?: Array<{
    id: string;
    source: string;
    label: string;
    title: string;
    subtitle?: string;
    meta?: string;
    status: string;
  }>;
};

export type BrainContext = {
  route: string;
  language: string;
  theme: string;
  densityMode: string;
  status: string;
  sessionMode: string;
  accentColor: string;
  lowData: boolean;
  performanceMode: "normal" | "low";
  nowPlaying?: { title?: string; artist?: string; isPlaying?: boolean };
  weather?: { condition?: string; temp?: number; city?: string };
  liveRecords?: Array<{ id: string; source: string; label: string; title: string; status: string }>;
  openTasks?: number;
  todayEvents?: number;
  focusMinutes?: number;
  focusActive?: boolean;
  focusPreset?: string;
  workspace?: string;
  workspaceTitle?: string;
  recentFilesCount?: number;
  unreadMails?: number;
  unread?: number;
  [key: string]: unknown;
};

export type BrainMemoryItem<T = unknown> = {
  id: string;
  category: string;
  content: T;
  createdAt: number;
  expiresAt?: number;
  ttl?: number;
};

export const SENSITIVE_KEYS = ["token", "password", "secret", "apiKey"] as const;
export type SensitiveKey = (typeof SENSITIVE_KEYS)[number];

export const SENSITIVE_KEY_RE = /\b(token|password|secret|apiKey)\b/i;

const CORE_KEYS: (keyof BrainContext)[] = [
  "route",
  "language",
  "theme",
  "densityMode",
  "status",
  "sessionMode",
  "accentColor",
  "lowData",
  "performanceMode",
];

const ROUTE_EXTRA_KEYS: Record<string, (keyof BrainContext)[]> = {
  home: ["nowPlaying", "weather", "liveRecords", "openTasks", "todayEvents", "focusMinutes", "unread"],
  brain: ["nowPlaying", "weather", "liveRecords", "openTasks", "todayEvents", "focusMinutes", "unread"],
  tasks: ["openTasks", "todayEvents", "focusMinutes", "unread", "liveRecords"],
  calendar: ["todayEvents", "weather", "liveRecords"],
  weather: ["weather", "liveRecords"],
  files: ["liveRecords"],
  notes: ["openTasks", "unread", "liveRecords"],
  settings: ["language", "theme", "densityMode", "accentColor", "lowData", "performanceMode", "liveRecords"],
};

const RECORD_SOURCES_BY_ROUTE: Record<string, string[] | undefined> = {
  tasks: ["todoist", "lanyard", "nowplaying"],
  calendar: ["google-calendar", "weather", "lanyard"],
  weather: ["weather"],
  files: ["google-drive", "rss"],
  notes: ["todoist", "nowplaying"],
};

function asStr(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNum(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return undefined;
}

function normalizeRoute(route: string): string {
  return (route || "").replace(/^\//, "").split("/")[0] || "home";
}

function keyLooksSensitive(key: string): boolean {
  return SENSITIVE_KEY_RE.test(key);
}

function hasSensitiveKey(value: unknown, seen = new Set<unknown>()): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return SENSITIVE_KEY_RE.test(String(value));
  }
  if (Array.isArray(value)) {
    return value.some((v) => hasSensitiveKey(v, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value)) return false;
    seen.add(value);
    for (const [k, v] of Object.entries(value)) {
      if (keyLooksSensitive(k)) return true;
      if (hasSensitiveKey(v, seen)) return true;
    }
  }
  return false;
}

function redactValue(value: unknown, key: string, seen = new Set<unknown>()): unknown {
  if (keyLooksSensitive(key)) return "[redacted]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return keyLooksSensitive(String(key)) ? "[redacted]" : value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, key, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value)) return value;
    seen.add(value);
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      next[k] = redactValue(v, k, seen);
    }
    return next;
  }
  return value;
}

export function sanitizeMemory<T>(item: BrainMemoryItem<T>): BrainMemoryItem<T> {
  if (keyLooksSensitive(item.id) || keyLooksSensitive(item.category)) {
    return { ...item, content: "[redacted]" as unknown as T };
  }
  return { ...item, content: redactValue(item.content, "content") as T };
}

export function memoryLooksSensitive(item: BrainMemoryItem): boolean {
  if (keyLooksSensitive(item.id) || keyLooksSensitive(item.category)) return true;
  if (typeof item.content === "string" && SENSITIVE_KEY_RE.test(item.content)) return true;
  return hasSensitiveKey(item.content);
}

export function buildSystemContext(settings: Settings, liveData: BrainLiveData, route: string): BrainContext {
  const nowPlaying = liveData?.nowPlaying
    ? {
        title: liveData.nowPlaying.title,
        artist: liveData.nowPlaying.artist,
        isPlaying: liveData.nowPlaying.isPlaying,
      }
    : undefined;

  const weatherData = liveData?.weather;
  const weather = weatherData
    ? {
        condition: asStr(weatherData.description) || asStr(weatherData.condition),
        temp: asNum(weatherData.temperature) ?? asNum(weatherData.temperatureC),
        city: asStr(weatherData.city) || asStr(weatherData.location),
      }
    : undefined;

  const liveRecords = (liveData?.records || []).map((record) => ({
    id: record.id,
    source: record.source,
    label: record.label,
    title: record.title,
    status: record.status,
  }));

  const ctx: BrainContext = {
    route,
    language: settings.language || "fr",
    theme: settings.theme,
    densityMode: settings.densityMode,
    status: settings.status,
    sessionMode: settings.sessionMode,
    accentColor: settings.accentColor,
    lowData: settings.lowData,
    performanceMode: settings.performanceMode,
    nowPlaying,
    weather,
    liveRecords,
  };

  return filterContextForRoute(route, ctx);
}

export function filterContextForRoute(route: string, context: BrainContext): BrainContext {
  const segment = normalizeRoute(route);
  const extra = ROUTE_EXTRA_KEYS[segment] || ROUTE_EXTRA_KEYS.home;
  const allowed = new Set<string>([...CORE_KEYS.map(String), ...extra.map(String)]);

  const next: BrainContext = { route: context.route } as BrainContext;
  for (const key of allowed) {
    if (key in context && context[key] !== undefined) {
      (next as Record<string, unknown>)[key] = context[key];
    }
  }

  if (allowed.has("liveRecords") && Array.isArray(next.liveRecords)) {
    const keepSources = RECORD_SOURCES_BY_ROUTE[segment];
    if (keepSources && keepSources.length) {
      next.liveRecords = next.liveRecords.filter(
        (record) => keepSources.includes(record.source) || record.source === segment
      );
    }
    if (!next.liveRecords.length) {
      delete next.liveRecords;
    }
  }

  if (allowed.has("weather") && !next.weather?.condition && next.weather?.temp === undefined) {
    delete next.weather;
  }

  if (allowed.has("nowPlaying") && !next.nowPlaying?.title) {
    delete next.nowPlaying;
  }

  return next;
}

/**
 * Generates transparent, human-readable rationales explaining why Brain used this context.
 */
export function getBrainContextExplanation(context?: BrainContext): string[] {
  if (!context) return ["Contexte global ETHONE OS par défaut."];
  const explanations: string[] = [];

  if (context.route) {
    explanations.push(`Page actuelle : ${context.route} (adaptation aux éléments affichés).`);
  }
  if (context.workspaceTitle || context.workspace) {
    explanations.push(`Espace de travail actif : ${context.workspaceTitle || context.workspace}.`);
  }
  if (context.focusActive) {
    explanations.push(`Session Focus en cours (${context.focusPreset || "standard"}) : priorité aux réponses concises.`);
  }
  if (context.nowPlaying?.title) {
    explanations.push(`Musique en cours d'écoute : ${context.nowPlaying.title} par ${context.nowPlaying.artist}.`);
  }
  if (context.weather?.condition) {
    explanations.push(`Météo locale : ${context.weather.condition} (${context.weather.temp}°C).`);
  }
  if (context.openTasks !== undefined && context.openTasks > 0) {
    explanations.push(`${context.openTasks} tâche(s) en attente dans votre todo-list.`);
  }
  if (context.todayEvents !== undefined && context.todayEvents > 0) {
    explanations.push(`${context.todayEvents} événement(s) prévus aujourd'hui à l'agenda.`);
  }
  if (context.unreadMails !== undefined && context.unreadMails > 0) {
    explanations.push(`${context.unreadMails} email(s) non lu(s) dans votre boîte de réception.`);
  }

  return explanations.length > 0 ? explanations : ["Aucun signal contextuel externe actif."];
}

