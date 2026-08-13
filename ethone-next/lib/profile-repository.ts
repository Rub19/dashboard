// Portage de v8/data/profile-repository.mjs
// Modèle de profil, valeurs par défaut et helper de snapshot/prévisualisation.
// La persistance localStorage du v8 est intentionnellement remplacée par Supabase
// (AuthProvider / SettingsProvider / useProfiles). Ce module fournit la logique
// de construction, de sanitization et de vue des profils.

export const PROFILE_STORAGE_KEY = "myspace_profiles_backup";
export const ACTIVE_PROFILE_KEY = "ethone:v8-profile-id";
export const PROFILE_OWNER_KEY = "myspace_profiles_backup_owner";
export const SCOPED_PROFILE_PREFIX = "ethone:v8:profiles:";

export const COLLECTIONS = Object.freeze({
  notes: "notes",
  tasks: "todos",
  events: "events",
  files: "items",
});

export const CONNECTION_STATUSES = new Set([
  "connected",
  "disconnected",
  "error",
  "syncing",
  "permission-denied",
  "token-expired",
]);

export const ACTIVITY_CATEGORIES = new Set([
  "media",
  "social",
  "gaming",
  "development",
  "work",
  "study",
  "productivity",
  "brain",
  "system",
]);

export const PROFILE_TYPES = [
  "personal",
  "work",
  "development",
  "study",
  "gaming",
  "streaming",
  "creative",
] as const;

export type ProfileType = (typeof PROFILE_TYPES)[number];

export const ENVIRONMENT_WIDGETS = new Set([
  "today",
  "notes",
  "calendar",
  "tasks",
  "focus",
  "github",
  "terminal",
  "brain",
  "planning",
  "discord",
  "spotify",
  "sessions",
  "live",
  "clips",
  "projects",
  "files",
]);

export const ENVIRONMENT_INTEGRATIONS = new Set([
  "spotify",
  "discord",
  "github",
  "google-calendar",
]);

export const ENVIRONMENT_AMBIENCES = new Set([
  "balanced",
  "focus",
  "quiet",
  "dynamic",
]);

export const ENVIRONMENT_BACKGROUNDS = new Set([
  "signal",
  "horizon",
  "graphite",
  "aurora",
]);

export const PROFILE_COPY: Record<ProfileType, string> = Object.freeze({
  personal: "Votre environnement quotidien.",
  work: "Un espace concentré sur vos priorités.",
  development: "Code, documentation et outils réunis.",
  study: "Cours, planning et concentration.",
  gaming: "Sessions, progression et communauté.",
  streaming: "Production, direct et contenus.",
  creative: "Idées, médias et projets créatifs.",
});

export const PROFILE_ACCENTS: Record<ProfileType, string> = Object.freeze({
  personal: "mint",
  work: "sky",
  development: "sky",
  study: "amber",
  gaming: "violet",
  streaming: "rose",
  creative: "amber",
});

export const ACCENT_VALUES: Record<string, string> = Object.freeze({
  mint: "#34d399",
  sky: "#38bdf8",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f472b6",
});

export const DEFAULT_SPACE = "personal";
export const DEFAULT_FLOW = "Essentiel";

export type ProfileInput = {
  name?: string;
  type?: ProfileType | string;
  description?: string;
  accent?: string;
  avatar?: string;
  avatarImg?: string | null;
  bannerImg?: string | null;
  space?: string;
  flow?: string;
  widgets?: string[];
  integrations?: string[];
  ambience?: string;
  background?: string;
  password?: unknown;
};

export type ProfileAvatar = {
  kind: "image" | "symbol" | "initials";
  value: string;
};

export type ProfileEnvironment = {
  widgets: readonly string[];
  integrations: readonly string[];
  ambience: string;
  background: string;
};

export type ProfileCounts = {
  notes: number;
  openTasks: number;
  events: number;
  files: number;
};

export type ProfileView = {
  id: string;
  name: string;
  type: ProfileType;
  description: string;
  avatar: ProfileAvatar;
  banner: string | null;
  accent: string;
  wallpaperTone: string;
  locked: boolean;
  space: string;
  flow: string;
  lastActiveAt: string;
  environment: ProfileEnvironment;
  counts: ProfileCounts;
};

export type ProfileSnapshot = {
  profile: {
    id: string;
    name: string;
    avatar: ProfileAvatar;
    banner: string | null;
  } | null;
  notes: readonly unknown[];
  tasks: readonly unknown[];
  events: readonly unknown[];
  files: readonly unknown[];
  filesView: "list" | "grid";
  activities: readonly unknown[];
  connections: readonly unknown[];
};

export type Result<T = unknown> =
  | { ok: true; status: "completed"; message: string; data: T }
  | { ok: false; status: "failed" | "unavailable"; message: string; data?: unknown };

export function text(value: unknown, fallback = "", limit = 5000): string {
  const normalized = String(value ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim();
  return (normalized || fallback).slice(0, limit);
}

export function safeList(
  value: unknown,
  allowed: Set<string>,
  limit = 12
): readonly string[] {
  return Object.freeze(
    [...new Set((Array.isArray(value) ? value : [])
      .map((entry) => text(entry, "", 48).toLowerCase())
      .filter((entry) => allowed.has(entry)))]
      .slice(0, limit)
  );
}

export function safeUrl(value: unknown): string {
  const raw = text(value, "", 2048);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

export function safeIdentifier(value: unknown, limit = 80): string {
  const normalized = text(value, "", limit).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(normalized)) return "";
  return ["__proto__", "prototype", "constructor"].includes(normalized) ? "" : normalized;
}

export function inferProfileType(profile: ProfileInput | null | undefined): ProfileType {
  const explicit = text(profile?.type, "", 32).toLowerCase() as ProfileType;
  if (PROFILE_TYPES.includes(explicit)) return explicit;
  const name = text(profile?.name, "", 80).toLowerCase();
  if (/gaming|jeu|valorant|steam/.test(name)) return "gaming";
  if (/dev|code|github/.test(name)) return "development";
  if (/study|étude|etude|school|cours/.test(name)) return "study";
  if (/stream|twitch|obs/.test(name)) return "streaming";
  if (/work|travail|pro/.test(name)) return "work";
  if (/creative|créatif|creatif|design/.test(name)) return "creative";
  return "personal";
}

export function profileAccent(profile: ProfileInput | null | undefined, type?: ProfileType): string {
  const raw = text(profile?.accent, "", 24).toLowerCase();
  if (Object.hasOwn(ACCENT_VALUES, raw)) return raw;
  const resolvedType = type ?? inferProfileType(profile);
  return PROFILE_ACCENTS[resolvedType] ?? "mint";
}

export function profileAvatar(profile: ProfileInput | null | undefined, name = ""): ProfileAvatar {
  const image = safeUrl(profile?.avatarImg);
  if (image) return Object.freeze({ kind: "image", value: image });
  const emoji = text(profile?.avatar, "", 8);
  if (emoji) return Object.freeze({ kind: "symbol", value: emoji });
  const initials = name
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "E";
  return Object.freeze({ kind: "initials", value: initials });
}

export function profileBanner(profile: ProfileInput | null | undefined): string | null {
  return safeUrl(profile?.bannerImg) || null;
}

export function hasProfileLock(profile: { password?: unknown } | null | undefined): boolean {
  const lock = profile?.password;
  if (lock == null || lock === "") return false;
  if (typeof lock === "object") return Object.keys(lock).length > 0;
  return true;
}

export type ProfileState = {
  username?: string;
  bio?: string;
  notes?: unknown[];
  todos?: unknown[];
  events?: unknown[];
  items?: unknown[];
  filesExplorer?: { view?: string; favorites?: unknown[] };
  activityFeed?: unknown[];
  connections?: Record<string, unknown>;
  lastActiveAt?: string;
  updatedAt?: string;
};

export type ProfileData = ProfileInput & {
  id?: string;
  state?: ProfileState;
  environment?: Partial<ProfileEnvironment>;
  createdAt?: string;
  updatedAt?: string;
  lastActiveAt?: string;
};

export function profileView(profile: ProfileData | null | undefined, index = 0): ProfileView {
  const state = profile?.state && typeof profile.state === "object" ? profile.state : {};
  const environment = profile?.environment && typeof profile.environment === "object" ? profile.environment : {};
  const type = inferProfileType(profile);
  const name = text(profile?.name || state?.username, `Profil ${index + 1}`, 80);
  const openTasks = (Array.isArray(state?.todos) ? state.todos : [])
    .filter((task: unknown) => (task as { done?: boolean; completed?: boolean })?.done !== true)
    .length;

  return Object.freeze({
    id: text(profile?.id, `profile-${index}`, 80),
    name,
    type,
    description: text(profile?.description || state?.bio, PROFILE_COPY[type], 180),
    avatar: profileAvatar(profile, name),
    banner: profileBanner(profile),
    accent: profileAccent(profile, type),
    wallpaperTone: type,
    locked: hasProfileLock(profile),
    space: text(profile?.space, type, 80),
    flow: text(profile?.flow, DEFAULT_FLOW, 80),
    lastActiveAt: text(
      profile?.lastActiveAt || profile?.updatedAt || state?.lastActiveAt || state?.updatedAt,
      "",
      40
    ),
    environment: Object.freeze({
      widgets: safeList(environment.widgets, ENVIRONMENT_WIDGETS),
      integrations: safeList(environment.integrations, ENVIRONMENT_INTEGRATIONS, 4),
      ambience: ENVIRONMENT_AMBIENCES.has(environment.ambience as string) ? (environment.ambience as string) : "balanced",
      background: ENVIRONMENT_BACKGROUNDS.has(environment.background as string) ? (environment.background as string) : "signal",
    }),
    counts: Object.freeze({
      notes: (Array.isArray(state?.notes) ? state.notes : []).length,
      openTasks,
      events: (Array.isArray(state?.events) ? state.events : []).length,
      files: (Array.isArray(state?.items) ? state.items : []).length,
    }),
  });
}

export type ProfileRepositoryOptions = {
  now?: () => Date;
  idFactory?: () => string;
};

export function defaultIdFactory(): string {
  return `ethone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function noteView(note: unknown, index: number) {
  const n = note as Record<string, unknown>;
  return Object.freeze({
    id: text(n?.id, `note-${index}`, 80),
    title: text(n?.title || n?.name, "Note sans titre", 160),
    content: text(n?.content || n?.body, "", 50000),
    tags: Object.freeze(
      (Array.isArray(n?.tags) ? n.tags : [])
        .map((tag: unknown) => text(tag, "", 32))
        .filter(Boolean)
        .slice(0, 12)
    ),
    pinned: n?.pinned === true,
    createdAt: text(n?.created || n?.createdAt, "", 40),
    updatedAt: text(n?.updated || n?.updatedAt, "", 40),
  });
}

function taskView(task: unknown, index: number) {
  const t = task as Record<string, unknown>;
  return Object.freeze({
    id: text(t?.id, `task-${index}`, 80),
    title: text(t?.text || t?.title, "Tâche sans titre", 240),
    done: t?.done === true || t?.completed === true,
    priority: ["low", "normal", "high"].includes(t?.priority as string) ? t.priority : "normal",
    due: text(t?.due, "", 16),
    tag: text(t?.tag, "", 48),
    createdAt: text(t?.createdAt, "", 40),
    doneAt: text(t?.doneAt, "", 40),
  });
}

function eventView(event: unknown, index: number) {
  const e = event as Record<string, unknown>;
  return Object.freeze({
    id: text(e?.id, `event-${index}`, 80),
    title: text(e?.title || e?.name, "Événement", 180),
    date: text(e?.date || e?.start, "", 16),
    time: /^\d{2}:\d{2}$/.test(e?.time as string) ? e.time : "",
    color: text(e?.color, "accent", 32),
  });
}

function fileView(item: unknown, index: number, favorites: string[]) {
  const f = item as Record<string, unknown>;
  const id = text(f?.id, `file-${index}`, 80);
  return Object.freeze({
    id,
    name: text(f?.name || f?.title, "Sans titre", 180),
    type: ["file", "doc", "link", "image", "folder", "code", "video"].includes(f?.type as string)
      ? f.type
      : "file",
    url: safeUrl(f?.url || f?.link),
    tag: text(f?.tag, "", 80),
    date: text(f?.updatedAt || f?.createdAt || f?.date, "", 40),
    favorite: favorites.includes(id) || f?.favorite === true,
    parentId: f?.parentId ? text(f.parentId, "", 80) : null,
  });
}

function activityView(entry: unknown, index: number) {
  const e = entry as Record<string, unknown>;
  return Object.freeze({
    id: text(e?.id, `activity-${index}`, 80),
    source: text(e?.source, "ethone", 48).toLowerCase(),
    category: ACTIVITY_CATEGORIES.has(e?.category as string) ? e.category : "system",
    icon: text(e?.icon, "activity", 48),
    title: text(e?.title, "Activité ETHONE", 180),
    description: text(e?.description, "", 500),
    timestamp: text(e?.timestamp, "", 40),
    tone: text(e?.tone, "default", 24),
  });
}

function connectionView(id: string, connection: Record<string, unknown> = {}) {
  const status = CONNECTION_STATUSES.has(connection?.status as string) ? connection.status : "disconnected";
  const responseMs = Number(connection?.responseMs);
  return Object.freeze({
    id: text(id || connection?.id, "integration", 80),
    status,
    setupComplete: connection?.setupComplete === true,
    methodId: safeIdentifier(connection?.methodId),
    reference: text(connection?.reference, "", 512),
    configuredAt: text(connection?.configuredAt, "", 40),
    lastSyncAt: text(connection?.lastSyncAt, "", 40),
    lastTestedAt: text(connection?.lastTestedAt, "", 40),
    responseMs: Number.isFinite(responseMs) ? Math.min(600000, Math.max(0, Math.round(responseMs))) : null,
    apiVersion: text(connection?.apiVersion, "Non connectée", 40),
    detail: text(connection?.detail, "", 180),
  });
}

export function buildDefaultProfile(
  input: ProfileInput = {},
  options: ProfileRepositoryOptions = {}
): ProfileData {
  const now = options.now ? options.now() : new Date();
  const idFactory = options.idFactory || defaultIdFactory;
  const type = PROFILE_TYPES.includes(input.type as ProfileType) ? (input.type as ProfileType) : "personal";
  const accent = Object.hasOwn(ACCENT_VALUES, input.accent ?? "")
    ? (input.accent as string)
    : PROFILE_ACCENTS[type];
  const name = text(input.name, "Nouvel environnement", 80);

  return {
    id: idFactory(),
    name,
    type,
    description: text(input.description, PROFILE_COPY[type], 180),
    accent,
    avatar: text(input.avatar, name.slice(0, 2).toUpperCase(), 8),
    avatarImg: safeUrl(input.avatarImg) || null,
    bannerImg: safeUrl(input.bannerImg) || null,
    space: text(input.space, type, 80),
    flow: text(input.flow, DEFAULT_FLOW, 80),
    environment: {
      widgets: safeList(input.widgets, ENVIRONMENT_WIDGETS),
      integrations: safeList(input.integrations, ENVIRONMENT_INTEGRATIONS, 4),
      ambience: ENVIRONMENT_AMBIENCES.has(input.ambience as string) ? (input.ambience as string) : "balanced",
      background: ENVIRONMENT_BACKGROUNDS.has(input.background as string) ? (input.background as string) : "signal",
    },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    state: {
      username: name,
      notes: [],
      todos: [],
      events: [],
      items: [],
    },
  };
}

export function buildDefaultProfileView(input: ProfileInput = {}, index = 0): ProfileView {
  return profileView(buildDefaultProfile(input), index);
}

export function snapshot(
  profile: ProfileData | null | undefined,
  state?: ProfileState
): ProfileSnapshot {
  if (!profile) {
    return Object.freeze({
      profile: null,
      notes: Object.freeze([]),
      tasks: Object.freeze([]),
      events: Object.freeze([]),
      files: Object.freeze([]),
      filesView: "list",
      activities: Object.freeze([]),
      connections: Object.freeze([]),
    });
  }

  const resolvedState = state ?? (profile.state ?? {});
  const favorites = (Array.isArray(resolvedState.filesExplorer?.favorites)
    ? resolvedState.filesExplorer.favorites
    : []) as string[];
  const profileName = text(profile.name || resolvedState.username, "Rub", 80);

  return Object.freeze({
    profile: Object.freeze({
      id: text(profile.id, "local", 80),
      name: profileName,
      avatar: profileAvatar(profile, profileName),
      banner: profileBanner(profile),
    }),
    notes: Object.freeze((Array.isArray(resolvedState.notes) ? resolvedState.notes : []).map(noteView)),
    tasks: Object.freeze((Array.isArray(resolvedState.todos) ? resolvedState.todos : []).map(taskView)),
    events: Object.freeze((Array.isArray(resolvedState.events) ? resolvedState.events : []).map(eventView)),
    files: Object.freeze(
      (Array.isArray(resolvedState.items) ? resolvedState.items : []).map((item, i) =>
        fileView(item, i, favorites)
      )
    ),
    filesView: resolvedState.filesExplorer?.view === "grid" ? "grid" : "list",
    activities: Object.freeze(
      (Array.isArray(resolvedState.activityFeed) ? resolvedState.activityFeed : []).map(activityView)
    ),
    connections: Object.freeze(
      Object.entries(
        resolvedState.connections && typeof resolvedState.connections === "object"
          ? resolvedState.connections
          : {}
      ).map(([id, connection]) => connectionView(id, connection as Record<string, unknown>))
    ),
  });
}

export function sanitizedExport(value: unknown, seen = new WeakSet()): unknown {
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value as object)) return null;
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((entry) => sanitizedExport(entry, seen));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(password|token|secret|api.?key|authorization|session)/i.test(key))
      .map(([key, entry]) => [key, sanitizedExport(entry, seen)])
  );
}

export function result<T>(ok: true, status: "completed", message: string, data?: T): Result<T>;
export function result<T>(ok: false, status: "failed" | "unavailable", message: string, data?: T): Result<T>;
export function result<T>(ok: boolean, status: "completed" | "failed" | "unavailable", message: string, data?: T): Result<T> {
  if (ok) {
    return Object.freeze({ ok: true as const, status: "completed", message, data: data as T });
  }
  return Object.freeze({ ok: false as const, status: status as "failed" | "unavailable", message, data });
}
