import { localeTag } from "../i18n/catalog.mjs";

export const PROFILE_STORAGE_KEY = "myspace_profiles_backup";
export const ACTIVE_PROFILE_KEY = "ethone:v8-profile-id";
export const PROFILE_OWNER_KEY = "myspace_profiles_backup_owner";
export const SCOPED_PROFILE_PREFIX = "ethone:v8:profiles:";

const COLLECTIONS = Object.freeze({ notes: "notes", tasks: "todos", events: "events", files: "items" });
const CONNECTION_STATUSES = new Set(["connected", "disconnected", "error", "syncing", "permission-denied", "token-expired"]);
const ACTIVITY_CATEGORIES = new Set(["media", "social", "gaming", "development", "work", "study", "productivity", "brain", "system"]);
const PROFILE_TYPES = new Set(["personal", "work", "development", "study", "gaming", "streaming", "creative"]);
const ENVIRONMENT_WIDGETS = new Set(["today", "notes", "calendar", "tasks", "focus", "github", "terminal", "brain", "planning", "discord", "spotify", "sessions", "live", "clips", "projects", "files"]);
const ENVIRONMENT_INTEGRATIONS = new Set(["spotify", "discord", "github", "google-calendar"]);
const ENVIRONMENT_AMBIENCES = new Set(["balanced", "focus", "quiet", "dynamic"]);
const ENVIRONMENT_BACKGROUNDS = new Set(["signal", "horizon", "graphite", "aurora"]);
const PROFILE_COPY = Object.freeze({
  personal: "Votre environnement quotidien.",
  work: "Un espace concentré sur vos priorités.",
  development: "Code, documentation et outils réunis.",
  study: "Cours, planning et concentration.",
  gaming: "Sessions, progression et communauté.",
  streaming: "Production, direct et contenus.",
  creative: "Idées, médias et projets créatifs."
});
const PROFILE_ACCENTS = Object.freeze({
  personal: "mint",
  work: "sky",
  development: "sky",
  study: "amber",
  gaming: "violet",
  streaming: "rose",
  creative: "amber"
});
const ACCENT_VALUES = Object.freeze({
  mint: "#34d399",
  sky: "#38bdf8",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f472b6"
});

function text(value, fallback = "", limit = 5000) {
  const normalized = String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
  return (normalized || fallback).slice(0, limit);
}

function readJSON(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

function sanitizePersistence(value, seen = new WeakSet()) {
  if (value == null || typeof value !== "object") return value;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) return value.map((entry) => sanitizePersistence(entry, seen));
  const output = Object.create(null);
  Object.entries(value).forEach(([key, entry]) => {
    if (/^(?:password|passcode|pin)$/i.test(key)) {
      if (entry && typeof entry === "object" && entry.hash && entry.salt) {
        output[key] = {
          type: entry.type === "pin" ? "pin" : "text",
          algorithm: text(entry.algorithm, "PBKDF2-SHA256", 32),
          version: Number(entry.version) || 2,
          iterations: Number(entry.iterations) || 120000,
          salt: text(entry.salt, "", 256),
          hash: text(entry.hash, "", 512)
        };
      }
      return;
    }
    if (/(?:token|secret|api.?key|authorization|credential|session)/i.test(key)) return;
    output[key] = sanitizePersistence(entry, seen);
  });
  return output;
}

function safeIdentifier(value, limit = 80) {
  const normalized = text(value, "", limit).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(normalized)) return "";
  return ["__proto__", "prototype", "constructor"].includes(normalized) ? "" : normalized;
}

function safeList(value, allowed, limit = 12) {
  return Object.freeze([...new Set((Array.isArray(value) ? value : [])
    .map((entry) => text(entry, "", 48).toLowerCase())
    .filter((entry) => allowed.has(entry)))].slice(0, limit));
}

function safeUrl(value) {
  const raw = text(value, "", 2048);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function inferProfileType(profile) {
  const explicit = text(profile?.profileType || profile?.type, "", 32).toLowerCase();
  if (PROFILE_TYPES.has(explicit)) return explicit;
  const name = text(profile?.name, "", 80).toLowerCase();
  if (/gaming|jeu|valorant|steam/.test(name)) return "gaming";
  if (/dev|code|github/.test(name)) return "development";
  if (/study|étude|etude|school|cours/.test(name)) return "study";
  if (/stream|twitch|obs/.test(name)) return "streaming";
  if (/work|travail|pro/.test(name)) return "work";
  if (/creative|créatif|creatif|design/.test(name)) return "creative";
  return "personal";
}

function profileAccent(profile, type) {
  const raw = text(profile?.theme?.customAccent || profile?.customAccent, "", 24).toLowerCase();
  if (["#7c3aed", "#8b5cf6", "#9333ea", "#a78bfa"].includes(raw)) return "violet";
  if (["#ef6f8f", "#f472b6", "#fb7185"].includes(raw)) return "rose";
  if (["#38bdf8", "#60a5fa", "#8bc9fa"].includes(raw)) return "sky";
  if (["#f59e0b", "#edc477", "#fbbf24"].includes(raw)) return "amber";
  if (["#34d399", "#7be5c3", "#72d6a7"].includes(raw)) return "mint";
  return PROFILE_ACCENTS[type] || "mint";
}

function profileAvatar(profile, name) {
  const image = safeUrl(profile?.avatarImg);
  if (image) return Object.freeze({ kind: "image", value: image });
  const emoji = text(profile?.avatarEmoji, "", 8);
  if (emoji) return Object.freeze({ kind: "symbol", value: emoji });
  const initials = name.split(/\s+/).map((part) => part[0] || "").join("").slice(0, 2).toUpperCase() || "E";
  return Object.freeze({ kind: "initials", value: initials });
}

function profileBanner(profile) {
  const image = safeUrl(profile?.bannerImg);
  return image || null;
}

function hasProfileLock(profile) {
  const lock = profile?.password;
  if (lock == null || lock === "") return false;
  if (typeof lock === "object") return Object.keys(lock).length > 0;
  return true;
}

function profileView(profile, index) {
  const state = profile?.state && typeof profile.state === "object" ? profile.state : {};
  const environment = profile?.environment && typeof profile.environment === "object" ? profile.environment : {};
  const type = inferProfileType(profile);
  const name = text(profile?.name || state.username, `Profil ${index + 1}`, 80);
  const openTasks = (Array.isArray(state.todos) ? state.todos : []).filter((task) => task?.done !== true && task?.completed !== true).length;
  return Object.freeze({
    id: text(profile?.id, `profile-${index}`, 80),
    name,
    type,
    description: text(profile?.description || state.bio, PROFILE_COPY[type], 180),
    avatar: profileAvatar(profile, name),
    banner: profileBanner(profile),
    accent: profileAccent(profile, type),
    wallpaperTone: type,
    locked: hasProfileLock(profile),
    space: text(profile?.defaultSpace || profile?.space, type, 80),
    flow: text(profile?.defaultFlow || profile?.flow || state.activeFlow, "Essentiel", 80),
    lastActiveAt: text(profile?.lastActiveAt || profile?.updatedAt || state.lastActiveAt || state.updatedAt, "", 40),
    environment: Object.freeze({
      widgets: safeList(environment.widgets, ENVIRONMENT_WIDGETS),
      integrations: safeList(environment.integrations, ENVIRONMENT_INTEGRATIONS, 4),
      ambience: ENVIRONMENT_AMBIENCES.has(environment.ambience) ? environment.ambience : "balanced",
      background: ENVIRONMENT_BACKGROUNDS.has(environment.background) ? environment.background : "signal"
    }),
    counts: Object.freeze({
      notes: (Array.isArray(state.notes) ? state.notes : []).length,
      openTasks,
      events: (Array.isArray(state.events) ? state.events : []).length,
      files: (Array.isArray(state.items) ? state.items : []).length
    })
  });
}

function result(ok, status, message, data = null) {
  return Object.freeze({ ok, status, message, data });
}

function noteView(note, index) {
  return Object.freeze({
    id: text(note?.id, `note-${index}`, 80),
    title: text(note?.title || note?.name, "Note sans titre", 160),
    content: text(note?.content || note?.body, "", 50000),
    tags: Object.freeze((Array.isArray(note?.tags) ? note.tags : []).map((tag) => text(tag, "", 32)).filter(Boolean).slice(0, 12)),
    pinned: note?.pinned === true,
    createdAt: text(note?.created || note?.createdAt, "", 40),
    updatedAt: text(note?.updated || note?.updatedAt, "", 40)
  });
}

function taskView(task, index) {
  return Object.freeze({
    id: text(task?.id, `task-${index}`, 80),
    title: text(task?.text || task?.title, "Tâche sans titre", 240),
    done: task?.done === true || task?.completed === true,
    priority: ["low", "normal", "high"].includes(task?.priority) ? task.priority : "normal",
    due: text(task?.due, "", 16),
    tag: text(task?.tag, "", 48),
    createdAt: text(task?.createdAt, "", 40),
    doneAt: text(task?.doneAt, "", 40)
  });
}

function eventView(event, index) {
  return Object.freeze({
    id: text(event?.id, `event-${index}`, 80),
    title: text(event?.title || event?.name, "Événement", 180),
    date: text(event?.date || event?.start, "", 16),
    time: /^\d{2}:\d{2}$/.test(event?.time) ? event.time : "",
    color: text(event?.color, "accent", 32)
  });
}

function fileView(item, index, favorites) {
  const id = text(item?.id, `file-${index}`, 80);
  return Object.freeze({
    id,
    name: text(item?.name || item?.title, "Sans titre", 180),
    type: ["file", "doc", "link", "image", "folder", "code", "video"].includes(item?.type) ? item.type : "file",
    url: safeUrl(item?.url || item?.link),
    tag: text(item?.tag, "", 80),
    date: text(item?.updatedAt || item?.createdAt || item?.date, "", 40),
    favorite: favorites.includes(id) || item?.favorite === true,
    parentId: item?.parentId ? text(item.parentId, "", 80) : null
  });
}

function activityView(entry, index) {
  return Object.freeze({
    id: text(entry?.id, `activity-${index}`, 80),
    source: text(entry?.source, "ethone", 48).toLowerCase(),
    category: ACTIVITY_CATEGORIES.has(entry?.category) ? entry.category : "system",
    icon: text(entry?.icon, "activity", 48),
    title: text(entry?.title, "Activité ETHONE", 180),
    description: text(entry?.description, "", 500),
    timestamp: text(entry?.timestamp, "", 40),
    tone: text(entry?.tone, "default", 24)
  });
}

function connectionView(id, connection = {}) {
  const status = CONNECTION_STATUSES.has(connection?.status) ? connection.status : "disconnected";
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
    detail: text(connection?.detail, "", 180)
  });
}

export function createProfileRepository(options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const requireOwner = options.requireOwner === true;
  const persistenceListeners = new Set();
  let ownerId = text(options.ownerId, "", 120);
  let persistenceMuted = 0;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  let idSequence = 0;
  const idFactory = typeof options.idFactory === "function"
    ? options.idFactory
    : () => `v8-${Date.now().toString(36)}-${(idSequence += 1).toString(36)}`;

  function readProfiles() {
    if (requireOwner && !ownerId) return [];
    const key = ownerId ? `${SCOPED_PROFILE_PREFIX}${ownerId}` : PROFILE_STORAGE_KEY;
    let profiles = readJSON(storage, key, null);
    if (!Array.isArray(profiles) && ownerId) {
      const backupOwner = text(storage?.getItem(PROFILE_OWNER_KEY), "", 120);
      const unscoped = readJSON(storage, PROFILE_STORAGE_KEY, []);
      const ownsLegacy = backupOwner === ownerId && Array.isArray(unscoped);
      profiles = ownsLegacy ? unscoped : [];
      if (ownsLegacy) {
        const clean = sanitizePersistence(profiles);
        storage?.setItem(`${SCOPED_PROFILE_PREFIX}${ownerId}`, JSON.stringify(clean));
        const legacyActive = text(storage?.getItem(ACTIVE_PROFILE_KEY), "", 80);
        if (legacyActive && profiles.some((profile) => String(profile?.id) === legacyActive)) {
          storage?.setItem(`${ACTIVE_PROFILE_KEY}:${ownerId}`, legacyActive);
        }
        storage?.removeItem(PROFILE_STORAGE_KEY);
        storage?.removeItem(PROFILE_OWNER_KEY);
        storage?.removeItem(ACTIVE_PROFILE_KEY);
      }
    }
    return Array.isArray(profiles) ? profiles : [];
  }

  function persistRawProfiles(profiles, reason = "profiles") {
    const clean = sanitizePersistence(profiles);
    if (requireOwner && !ownerId) throw new Error("Authenticated profile owner is required.");
    if (ownerId) {
      storage?.setItem(`${SCOPED_PROFILE_PREFIX}${ownerId}`, JSON.stringify(clean));
    } else {
      storage?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(clean));
    }
    if (!persistenceMuted) {
      const event = Object.freeze({ reason: text(reason, "repository", 80), ownerId });
      persistenceListeners.forEach((listener) => { try { listener(event); } catch {} });
    }
    return clean;
  }

  function setOwner(nextOwnerId) {
    ownerId = text(nextOwnerId, "", 120);
    if (!ownerId) return result(false, "unavailable", "Authenticated owner is missing.");
    const profiles = readProfiles();
    persistenceMuted += 1;
    try { persistRawProfiles(profiles, "owner"); } finally { persistenceMuted -= 1; }
    return result(true, "completed", "Cache utilisateur isole.", { ownerId, profiles: profiles.length });
  }

  function activeProfileIndex(profiles) {
    let requested = "";
    const key = ownerId ? `${ACTIVE_PROFILE_KEY}:${ownerId}` : ACTIVE_PROFILE_KEY;
    try { requested = text(storage?.getItem(key), "", 80); } catch {}
    const found = requested ? profiles.findIndex((profile) => String(profile?.id) === requested) : -1;
    return found >= 0 ? found : (profiles.length ? 0 : -1);
  }

  function exportCloudState() {
    const profiles = sanitizePersistence(readProfiles());
    const index = activeProfileIndex(profiles);
    return Object.freeze({
      version: 1,
      profiles,
      activeProfileId: index >= 0 ? text(profiles[index]?.id, "", 80) : ""
    });
  }

  function hydrateCloudState(input = {}) {
    if (requireOwner && !ownerId) return result(false, "unavailable", "Authenticated profile owner is required.");
    const source = input && typeof input === "object" ? input : {};
    if (!Array.isArray(source.profiles)) return result(false, "failed", "Le document Supabase est invalide.");
    const profiles = sanitizePersistence(source.profiles);
    const requestedActive = text(source.activeProfileId, "", 80);
    persistenceMuted += 1;
    try {
      persistRawProfiles(profiles, "supabase-hydration");
      const active = profiles.some((profile) => String(profile?.id) === requestedActive)
        ? requestedActive
        : text(profiles[0]?.id, "", 80);
      const key = ownerId ? `${ACTIVE_PROFILE_KEY}:${ownerId}` : ACTIVE_PROFILE_KEY;
      if (active) storage?.setItem(key, active);
      else storage?.removeItem?.(key);
    } catch (error) {
      return result(false, "failed", "Les données Supabase n'ont pas pu être appliquees.", error);
    } finally {
      persistenceMuted -= 1;
    }
    return result(true, "completed", "Données Supabase appliquees.", { profiles: profiles.length });
  }

  function subscribePersistence(listener) {
    if (typeof listener !== "function") return () => false;
    persistenceListeners.add(listener);
    return () => persistenceListeners.delete(listener);
  }

  function snapshot(profileId = "") {
    const profiles = readProfiles();
    const requestedIndex = profileId ? profiles.findIndex((profile) => String(profile?.id) === String(profileId)) : -1;
    const index = requestedIndex >= 0 ? requestedIndex : activeProfileIndex(profiles);
    if (index < 0) {
      return Object.freeze({ profile: null, notes: Object.freeze([]), tasks: Object.freeze([]), events: Object.freeze([]), files: Object.freeze([]), filesView: "list", activities: Object.freeze([]), connections: Object.freeze([]) });
    }
    const profile = profiles[index] || {};
    const state = profile.state && typeof profile.state === "object" ? profile.state : {};
    const favorites = Array.isArray(state.filesExplorer?.favorites) ? state.filesExplorer.favorites.map(String) : [];
    const profileName = text(profile.name || state.username, "Rub", 80);
    return Object.freeze({
      profile: Object.freeze({
        id: text(profile.id, "local", 80),
        name: profileName,
        avatar: profileAvatar(profile, profileName),
        banner: profileBanner(profile)
      }),
      notes: Object.freeze((Array.isArray(state.notes) ? state.notes : []).map(noteView)),
      tasks: Object.freeze((Array.isArray(state.todos) ? state.todos : []).map(taskView)),
      events: Object.freeze((Array.isArray(state.events) ? state.events : []).map(eventView)),
      files: Object.freeze((Array.isArray(state.items) ? state.items : []).map((item, itemIndex) => fileView(item, itemIndex, favorites))),
      filesView: state.filesExplorer?.view === "grid" ? "grid" : "list",
      activities: Object.freeze((Array.isArray(state.activityFeed) ? state.activityFeed : []).map(activityView)),
      connections: Object.freeze(Object.entries(state.connections && typeof state.connections === "object" ? state.connections : {}).map(([id, connection]) => connectionView(id, connection)))
    });
  }

  function listProfiles() {
    return Object.freeze(readProfiles().map(profileView));
  }

  function activeProfile() {
    const profiles = readProfiles();
    const index = activeProfileIndex(profiles);
    return index >= 0 ? profileView(profiles[index], index) : null;
  }

  function selectProfile(id) {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => String(profile?.id) === String(id));
    if (index < 0) return result(false, "unavailable", "Ce profil n'est pas disponible.");
    const view = profileView(profiles[index], index);
    if (view.locked) return result(false, "unavailable", "Ce profil nécessite un déverrouillage.", view);
    try {
      const key = ownerId ? `${ACTIVE_PROFILE_KEY}:${ownerId}` : ACTIVE_PROFILE_KEY;
      storage?.setItem(key, view.id);
      if (!persistenceMuted) persistenceListeners.forEach((listener) => { try { listener(Object.freeze({ reason: "active-profile", ownerId })); } catch {} });
      return result(true, "completed", `Profil ${view.name} sélectionné.`, view);
    } catch (error) {
      return result(false, "failed", "Le profil n'a pas pu être sélectionné.", error);
    }
  }

  function persistProfiles(profiles, message, data) {
    try {
      persistRawProfiles(profiles);
      return result(true, "completed", message, data ?? null);
    } catch (error) {
      return result(false, "failed", "La mise en cache a échoué.", error);
    }
  }

  function createProfile(input = {}) {
    const profiles = readProfiles();
    const type = PROFILE_TYPES.has(input.type) ? input.type : "personal";
    const accent = Object.hasOwn(ACCENT_VALUES, input.accent) ? input.accent : PROFILE_ACCENTS[type];
    const timestamp = now().toISOString();
    const name = text(input.name, "Nouvel environnement", 80);
    const profile = {
      id: String(idFactory()),
      name,
      profileType: type,
      description: text(input.description, PROFILE_COPY[type], 180),
      avatarEmoji: text(input.avatar, name.slice(0, 2).toUpperCase(), 8),
      avatarImg: safeUrl(input.avatarImg) || null,
      bannerImg: safeUrl(input.bannerImg) || null,
      customAccent: ACCENT_VALUES[accent],
      defaultSpace: text(input.space, type, 80),
      defaultFlow: text(input.flow, "Essentiel", 80),
      environment: {
        widgets: safeList(input.widgets, ENVIRONMENT_WIDGETS),
        integrations: safeList(input.integrations, ENVIRONMENT_INTEGRATIONS, 4),
        ambience: ENVIRONMENT_AMBIENCES.has(input.ambience) ? input.ambience : "balanced",
        background: ENVIRONMENT_BACKGROUNDS.has(input.background) ? input.background : "signal"
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      state: { username: name, notes: [], todos: [], events: [], items: [] }
    };
    profiles.push(profile);
    return persistProfiles(profiles, `Profil ${name} créé.`, profileView(profile, profiles.length - 1));
  }

  function updateProfile(id, patch = {}) {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => String(profile?.id) === String(id));
    if (index < 0) return result(false, "unavailable", "Ce profil n'est pas disponible.");
    const profile = profiles[index];
    const nextType = Object.hasOwn(patch, "type") && PROFILE_TYPES.has(patch.type)
      ? patch.type
      : inferProfileType(profile);
    if (Object.hasOwn(patch, "name")) {
      profile.name = text(patch.name, profileView(profile, index).name, 80);
      if (profile.state && typeof profile.state === "object") profile.state.username = profile.name;
    }
    if (Object.hasOwn(patch, "description")) profile.description = text(patch.description, PROFILE_COPY[nextType], 180);
    if (Object.hasOwn(patch, "type")) profile.profileType = nextType;
    if (Object.hasOwn(patch, "avatar")) {
      profile.avatarEmoji = text(patch.avatar, profile.name?.slice(0, 2).toUpperCase() || "E", 8);
      profile.avatarImg = null;
    }
    if (Object.hasOwn(patch, "avatarImg")) profile.avatarImg = safeUrl(patch.avatarImg) || null;
    if (Object.hasOwn(patch, "bannerImg")) profile.bannerImg = safeUrl(patch.bannerImg) || null;
    if (Object.hasOwn(patch, "accent") && Object.hasOwn(ACCENT_VALUES, patch.accent)) {
      profile.customAccent = ACCENT_VALUES[patch.accent];
    }
    if (Object.hasOwn(patch, "space")) profile.defaultSpace = text(patch.space, nextType, 80);
    if (Object.hasOwn(patch, "flow")) profile.defaultFlow = text(patch.flow, "Essentiel", 80);
    if (!profile.environment || typeof profile.environment !== "object") profile.environment = {};
    if (Object.hasOwn(patch, "widgets")) profile.environment.widgets = safeList(patch.widgets, ENVIRONMENT_WIDGETS);
    if (Object.hasOwn(patch, "intégrations")) profile.environment.integrations = safeList(patch.integrations, ENVIRONMENT_INTEGRATIONS, 4);
    if (Object.hasOwn(patch, "ambience") && ENVIRONMENT_AMBIENCES.has(patch.ambience)) profile.environment.ambience = patch.ambience;
    if (Object.hasOwn(patch, "background") && ENVIRONMENT_BACKGROUNDS.has(patch.background)) profile.environment.background = patch.background;
    profile.updatedAt = now().toISOString();
    return persistProfiles(profiles, `Profil ${profileView(profile, index).name} mis à jour.`, profileView(profile, index));
  }

  function duplicateProfile(id) {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => String(profile?.id) === String(id));
    if (index < 0) return result(false, "unavailable", "Ce profil n'est pas disponible.");
    try {
      const duplicate = JSON.parse(JSON.stringify(profiles[index]));
      duplicate.id = String(idFactory());
      duplicate.name = `${text(duplicate.name, `Profil ${index + 1}`, 70)} — copie`;
      duplicate.createdAt = now().toISOString();
      duplicate.updatedAt = duplicate.createdAt;
      delete duplicate.password;
      if (duplicate.state && typeof duplicate.state === "object") duplicate.state.username = duplicate.name;
      profiles.push(duplicate);
      return persistProfiles(profiles, `Profil ${duplicate.name} créé.`, profileView(duplicate, profiles.length - 1));
    } catch (error) {
      return result(false, "failed", "Le profil n'a pas pu être dupliqué.", error);
    }
  }

  function deleteProfile(id) {
    const profiles = readProfiles();
    if (profiles.length <= 1) return result(false, "unavailable", "Le dernier profil ne peut pas être supprimé.");
    const index = profiles.findIndex((profile) => String(profile?.id) === String(id));
    if (index < 0) return result(false, "unavailable", "Ce profil n'est pas disponible.");
    const [removed] = profiles.splice(index, 1);
    const activeKey = ownerId ? `${ACTIVE_PROFILE_KEY}:${ownerId}` : ACTIVE_PROFILE_KEY;
    const activeId = text(storage?.getItem(activeKey), "", 80);
    const nextActive = activeId === String(id)
      ? (profiles.find((profile) => !hasProfileLock(profile)) || profiles[0])
      : null;
    const persisted = persistProfiles(profiles, `Profil ${profileView(removed, index).name} supprimé.`, profileView(removed, index));
    if (!persisted.ok || !nextActive) return persisted;
    try { storage?.setItem(activeKey, text(nextActive.id, "", 80)); } catch {}
    return persisted;
  }

  function sanitizedExport(value, seen = new WeakSet()) {
    if (value == null || typeof value !== "object") return value;
    if (seen.has(value)) return null;
    seen.add(value);
    if (Array.isArray(value)) return value.map((entry) => sanitizedExport(entry, seen));
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !/(password|token|secret|api.?key|authorization|session)/i.test(key))
      .map(([key, entry]) => [key, sanitizedExport(entry, seen)]));
  }

  function exportProfile(id) {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => String(profile?.id) === String(id));
    if (index < 0) return result(false, "unavailable", "Ce profil n'est pas disponible.");
    const payload = Object.freeze({
      format: "ethone-profile",
      version: 1,
      exportedAt: now().toISOString(),
      profile: sanitizedExport(profiles[index])
    });
    return result(true, "completed", "Export prêt.", payload);
  }

  function mutate(collection, mutation) {
    const key = COLLECTIONS[collection];
    if (!key) return result(false, "failed", "Collection inconnue.");
    const profiles = readProfiles();
    const profileIndex = activeProfileIndex(profiles);
    if (profileIndex < 0) return result(false, "unavailable", "Aucun profil n'est disponible.");
    const profile = profiles[profileIndex];
    if (!profile.state || typeof profile.state !== "object") profile.state = {};
    if (!Array.isArray(profile.state[key])) profile.state[key] = [];

    try {
      const data = mutation(profile.state[key], profile.state);
      persistRawProfiles(profiles);
      return result(true, "completed", "Modification en attente de synchronisation.", data ?? null);
    } catch (error) {
      return result(false, "failed", "La mise en cache a échoué.", error);
    }
  }

  function mutateState(mutation) {
    const profiles = readProfiles();
    const profileIndex = activeProfileIndex(profiles);
    if (profileIndex < 0) return result(false, "unavailable", "Aucun profil n'est disponible.");
    const profile = profiles[profileIndex];
    if (!profile.state || typeof profile.state !== "object") profile.state = {};
    try {
      const data = mutation(profile.state);
      persistRawProfiles(profiles);
      return result(true, "completed", "Modification en attente de synchronisation.", data ?? null);
    } catch (error) {
      return result(false, "failed", "La mise en cache a échoué.", error);
    }
  }

  const notes = Object.freeze({
    create(input = {}) {
      return mutate("notes", (list) => {
        const timestamp = now().toISOString();
        const note = {
          id: String(idFactory()),
          title: text(input.title, "Note sans titre", 160),
          content: text(input.content, "", 50000),
          tags: [],
          relations: [],
          pinned: false,
          color: "",
          created: timestamp,
          updated: timestamp
        };
        list.unshift(note);
        return noteView(note, 0);
      });
    },
    update(id, patch = {}) {
      return mutate("notes", (list) => {
        const note = list.find((entry) => String(entry?.id) === String(id));
        if (!note) throw new Error("Note introuvable");
        if (Object.hasOwn(patch, "title")) note.title = text(patch.title, "Note sans titre", 160);
        if (Object.hasOwn(patch, "content")) note.content = text(patch.content, "", 50000);
        if (Object.hasOwn(patch, "tags")) note.tags = (Array.isArray(patch.tags) ? patch.tags : []).map((tag) => text(tag, "", 32)).filter(Boolean).slice(0, 12);
        if (Object.hasOwn(patch, "pinned")) note.pinned = patch.pinned === true;
        note.updated = now().toISOString();
        return noteView(note, 0);
      });
    },
    remove(id) {
      return mutate("notes", (list) => {
        const index = list.findIndex((entry) => String(entry?.id) === String(id));
        if (index < 0) throw new Error("Note introuvable");
        const [removed] = list.splice(index, 1);
        return noteView(removed, 0);
      });
    }
  });

  const tasks = Object.freeze({
    create(input = {}) {
      return mutate("tasks", (list) => {
        const timestamp = now().toISOString();
        const task = {
          id: String(idFactory()),
          text: text(input.title, "Nouvelle tâche", 240),
          priority: ["low", "normal", "high"].includes(input.priority) ? input.priority : "normal",
          done: false,
          color: "",
          due: text(input.due, "", 16),
          tag: text(input.tag, "", 48),
          date: new Intl.DateTimeFormat(localeTag(), { day: "2-digit", month: "short" }).format(now()),
          createdAt: timestamp
        };
        list.unshift(task);
        return taskView(task, 0);
      });
    },
    update(id, patch = {}) {
      return mutate("tasks", (list) => {
        const task = list.find((entry) => String(entry?.id) === String(id));
        if (!task) throw new Error("Tâche introuvable");
        if (Object.hasOwn(patch, "title")) task.text = text(patch.title, "Nouvelle tâche", 240);
        if (Object.hasOwn(patch, "priority")) task.priority = ["low", "normal", "high"].includes(patch.priority) ? patch.priority : task.priority;
        if (Object.hasOwn(patch, "due")) task.due = text(patch.due, "", 16);
        if (Object.hasOwn(patch, "tag")) task.tag = text(patch.tag, "", 48);
        return taskView(task, 0);
      });
    },
    toggle(id) {
      return mutate("tasks", (list) => {
        const task = list.find((entry) => String(entry?.id) === String(id));
        if (!task) throw new Error("Tâche introuvable");
        task.done = !(task.done === true || task.completed === true);
        if (task.done) task.doneAt = now().toISOString();
        else delete task.doneAt;
        return taskView(task, 0);
      });
    },
    setDone(ids = [], done = true) {
      const requested = new Set((Array.isArray(ids) ? ids : []).map(String));
      return mutate("tasks", (list) => {
        const timestamp = now().toISOString();
        const changed = [];
        list.forEach((task, index) => {
          if (!requested.has(String(task?.id))) return;
          task.done = done === true;
          if (task.done) task.doneAt = timestamp;
          else delete task.doneAt;
          changed.push(taskView(task, index));
        });
        return Object.freeze(changed);
      });
    },
    removeMany(ids = []) {
      const requested = new Set((Array.isArray(ids) ? ids : []).map(String));
      return mutate("tasks", (list) => {
        const removed = list.filter((task) => requested.has(String(task?.id))).map(taskView);
        for (let index = list.length - 1; index >= 0; index -= 1) {
          if (requested.has(String(list[index]?.id))) list.splice(index, 1);
        }
        return Object.freeze(removed);
      });
    },
    remove(id) {
      return mutate("tasks", (list) => {
        const index = list.findIndex((entry) => String(entry?.id) === String(id));
        if (index < 0) throw new Error("Tâche introuvable");
        return taskView(list.splice(index, 1)[0], 0);
      });
    }
  });

  const events = Object.freeze({
    create(input = {}) {
      return mutate("events", (list) => {
        const event = {
          id: String(idFactory()),
          title: text(input.title, "Événement", 180),
          date: text(input.date, "", 16),
          time: /^\d{2}:\d{2}$/.test(input.time) ? input.time : "",
          color: "accent"
        };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) throw new Error("Date invalide");
        list.push(event);
        list.sort((left, right) => {
          const dateOrder = String(left?.date || "").localeCompare(String(right?.date || ""));
          if (dateOrder) return dateOrder;
          const leftTime = left?.time || "";
          const rightTime = right?.time || "";
          if (!leftTime && rightTime) return -1;
          if (leftTime && !rightTime) return 1;
          return leftTime.localeCompare(rightTime);
        });
        return eventView(event, 0);
      });
    },
    remove(id) {
      return mutate("events", (list) => {
        const index = list.findIndex((entry) => String(entry?.id) === String(id));
        if (index < 0) throw new Error("Événement introuvable");
        return eventView(list.splice(index, 1)[0], 0);
      });
    }
  });

  function collectDescendantFileIds(list, rootId) {
    const ids = new Set();
    const queue = [String(rootId)];
    while (queue.length) {
      const current = queue.shift();
      list.forEach((entry) => {
        if (String(entry?.parentId || "") === current && !ids.has(String(entry.id))) {
          ids.add(String(entry.id));
          queue.push(String(entry.id));
        }
      });
    }
    return ids;
  }

  const files = Object.freeze({
    setView(view) {
      return mutateState((state) => {
        if (!state.filesExplorer || typeof state.filesExplorer !== "object") state.filesExplorer = {};
        state.filesExplorer.view = view === "grid" ? "grid" : "list";
        return state.filesExplorer.view;
      });
    },
    create(input = {}) {
      return mutate("files", (list) => {
        const type = ["link", "folder"].includes(input.type) ? input.type : "link";
        const url = type === "link" ? safeUrl(input.url) : "";
        if (type === "link" && !url) throw new Error("Lien invalide");
        let parentId = input.parentId ? text(input.parentId, "", 80) : null;
        if (parentId) {
          const parent = list.find((entry) => String(entry?.id) === parentId);
          if (!parent || parent.type !== "folder") throw new Error("Dossier introuvable");
        }
        const timestamp = now().toISOString();
        const item = {
          id: String(idFactory()),
          name: text(input.name, type === "folder" ? "Nouveau dossier" : "Nouveau lien", 180),
          type,
          url,
          tag: text(input.tag, "", 80),
          parentId,
          date: new Intl.DateTimeFormat(localeTag(), { day: "2-digit", month: "short" }).format(now()),
          createdAt: timestamp,
          updatedAt: timestamp
        };
        list.unshift(item);
        return fileView(item, 0, []);
      });
    },
    update(id, patch = {}) {
      return mutate("files", (list, state) => {
        const item = list.find((entry) => String(entry?.id) === String(id));
        if (!item) throw new Error("Fichier introuvable");
        if (Object.hasOwn(patch, "name")) item.name = text(patch.name, item.type === "folder" ? "Nouveau dossier" : "Nouveau lien", 180);
        if (Object.hasOwn(patch, "tag")) item.tag = text(patch.tag, "", 80);
        if (Object.hasOwn(patch, "parentId")) {
          const nextParentId = patch.parentId ? text(patch.parentId, "", 80) : null;
          if (nextParentId) {
            if (nextParentId === String(id)) throw new Error("Un dossier ne peut pas se contenir lui-même");
            const target = list.find((entry) => String(entry?.id) === nextParentId);
            if (!target || target.type !== "folder") throw new Error("Dossier introuvable");
            if (collectDescendantFileIds(list, id).has(nextParentId)) throw new Error("Impossible de déplacer un dossier dans lui-même");
          }
          item.parentId = nextParentId;
        }
        item.updatedAt = now().toISOString();
        const favorites = Array.isArray(state.filesExplorer?.favorites) ? state.filesExplorer.favorites : [];
        return fileView(item, 0, favorites);
      });
    },
    toggleFavorite(id) {
      return mutate("files", (list, state) => {
        const item = list.find((entry) => String(entry?.id) === String(id));
        if (!item) throw new Error("Fichier introuvable");
        if (!state.filesExplorer || typeof state.filesExplorer !== "object") state.filesExplorer = {};
        if (!Array.isArray(state.filesExplorer.favorites)) state.filesExplorer.favorites = [];
        const favorites = state.filesExplorer.favorites.map(String);
        const itemId = String(item.id);
        state.filesExplorer.favorites = favorites.includes(itemId)
          ? favorites.filter((entry) => entry !== itemId)
          : [...favorites, itemId];
        return fileView(item, 0, state.filesExplorer.favorites);
      });
    },
    setFavorite(ids = [], favorite = true) {
      const requested = new Set((Array.isArray(ids) ? ids : []).map(String));
      return mutate("files", (list, state) => {
        if (!state.filesExplorer || typeof state.filesExplorer !== "object") state.filesExplorer = {};
        const current = new Set((Array.isArray(state.filesExplorer.favorites) ? state.filesExplorer.favorites : []).map(String));
        requested.forEach((id) => favorite === true ? current.add(id) : current.delete(id));
        state.filesExplorer.favorites = [...current];
        return Object.freeze(list.filter((item) => requested.has(String(item?.id))).map((item, index) => fileView(item, index, state.filesExplorer.favorites)));
      });
    },
    removeMany(ids = []) {
      const requested = new Set((Array.isArray(ids) ? ids : []).map(String));
      return mutate("files", (list, state) => {
        list.forEach((item) => {
          if (item?.type === "folder" && requested.has(String(item.id))) {
            collectDescendantFileIds(list, item.id).forEach((descendantId) => requested.add(descendantId));
          }
        });
        const favorites = Array.isArray(state.filesExplorer?.favorites) ? state.filesExplorer.favorites.map(String) : [];
        const removed = list.filter((item) => requested.has(String(item?.id))).map((item, index) => fileView(item, index, favorites));
        for (let index = list.length - 1; index >= 0; index -= 1) {
          if (requested.has(String(list[index]?.id))) list.splice(index, 1);
        }
        if (Array.isArray(state.filesExplorer?.favorites)) state.filesExplorer.favorites = favorites.filter((id) => !requested.has(id));
        return Object.freeze(removed);
      });
    },
    remove(id) {
      return mutate("files", (list, state) => {
        const index = list.findIndex((entry) => String(entry?.id) === String(id));
        if (index < 0) throw new Error("Fichier introuvable");
        const target = list[index];
        const requested = new Set([String(id)]);
        if (target?.type === "folder") collectDescendantFileIds(list, id).forEach((descendantId) => requested.add(descendantId));
        for (let cursor = list.length - 1; cursor >= 0; cursor -= 1) {
          if (requested.has(String(list[cursor]?.id))) list.splice(cursor, 1);
        }
        if (Array.isArray(state.filesExplorer?.favorites)) {
          state.filesExplorer.favorites = state.filesExplorer.favorites.map(String).filter((entry) => !requested.has(entry));
        }
        return fileView(target, 0, []);
      });
    }
  });

  const activities = Object.freeze({
    record(input = {}) {
      return mutateState((state) => {
        if (!Array.isArray(state.activityFeed)) state.activityFeed = [];
        const entry = {
          id: String(idFactory()),
          source: text(input.source, "ethone", 48).toLowerCase(),
          category: ACTIVITY_CATEGORIES.has(input.category) ? input.category : "system",
          icon: text(input.icon, "activity", 48),
          title: text(input.title, "Activité ETHONE", 180),
          description: text(input.description, "", 500),
          timestamp: text(input.timestamp, now().toISOString(), 40),
          tone: text(input.tone, "default", 24)
        };
        state.activityFeed.unshift(entry);
        state.activityFeed = state.activityFeed.slice(0, 200);
        return activityView(entry, 0);
      });
    },
    clear() {
      return mutateState((state) => {
        state.activityFeed = [];
        return true;
      });
    }
  });

  const connections = Object.freeze({
    configure(id, input = {}) {
      return mutateState((state) => {
        if (!state.connections || typeof state.connections !== "object" || Array.isArray(state.connections)) state.connections = {};
        const integrationId = safeIdentifier(id);
        if (!integrationId) throw new Error("Intégration invalide");
        const existing = Object.hasOwn(state.connections, integrationId) && typeof state.connections[integrationId] === "object" ? state.connections[integrationId] : {};
        state.connections[integrationId] = {
          ...existing,
          id: integrationId,
          status: CONNECTION_STATUSES.has(existing.status) ? existing.status : "disconnected",
          setupComplete: true,
          methodId: safeIdentifier(input.methodId) || safeIdentifier(existing.methodId),
          reference: text(input.reference, existing.reference || "", 512),
          configuredAt: now().toISOString(),
          apiVersion: text(input.apiVersion || existing.apiVersion, "En attente d'OAuth", 40),
          detail: text(input.detail, "Configuration chiffree prete. Aucun secret stocke.", 180)
        };
        return connectionView(integrationId, state.connections[integrationId]);
      });
    },
    updateStatus(id, status, patch = {}) {
      return mutateState((state) => {
        if (!CONNECTION_STATUSES.has(status)) throw new Error("État de connexion invalide");
        if (!state.connections || typeof state.connections !== "object" || Array.isArray(state.connections)) state.connections = {};
        const integrationId = safeIdentifier(id);
        if (!integrationId) throw new Error("Intégration invalide");
        const existing = Object.hasOwn(state.connections, integrationId) && typeof state.connections[integrationId] === "object" ? state.connections[integrationId] : {};
        const responseMs = Number(Object.hasOwn(patch, "responseMs") ? patch.responseMs : existing.responseMs);
        state.connections[integrationId] = {
          ...existing,
          id: integrationId,
          status,
          setupComplete: existing.setupComplete === true,
          methodId: safeIdentifier(patch.methodId) || safeIdentifier(existing.methodId),
          reference: text(patch.reference, existing.reference || "", 512),
          lastSyncAt: text(patch.lastSyncAt || existing.lastSyncAt, "", 40),
          lastTestedAt: text(patch.lastTestedAt || existing.lastTestedAt, "", 40),
          responseMs: Number.isFinite(responseMs) ? Math.min(600000, Math.max(0, Math.round(responseMs))) : null,
          apiVersion: text(patch.apiVersion || existing.apiVersion, "Non connectée", 40),
          detail: text(patch.detail, existing.detail || "", 180)
        };
        return connectionView(integrationId, state.connections[integrationId]);
      });
    },
    test(id) {
      const current = snapshot().connections.find((connection) => connection.id === String(id));
      if (!current?.setupComplete) return result(false, "unavailable", "Terminez d'abord le guide de configuration.");
      if (current.status !== "connected") return result(false, "unavailable", "Le connecteur est préparé, mais aucun OAuth backend n'est actif.", current);
      return this.updateStatus(id, "connected", { lastTestedAt: now().toISOString(), lastSyncAt: current.lastSyncAt, apiVersion: current.apiVersion, detail: "État de connexion vérifié." });
    },
    disconnect(id) {
      return mutateState((state) => {
        const integrationId = safeIdentifier(id);
        if (!integrationId) throw new Error("Intégration invalide");
        if (!state.connections || typeof state.connections !== "object" || Array.isArray(state.connections)) state.connections = {};
        delete state.connections[integrationId];
        return connectionView(integrationId, { status: "disconnected", detail: "Association supprimée." });
      });
    }
  });

  return Object.freeze({
    snapshot,
    exportCloudState,
    hydrateCloudState,
    subscribePersistence,
    listProfiles,
    activeProfile,
    selectProfile,
    setOwner,
    owner: () => ownerId,
    createProfile,
    updateProfile,
    duplicateProfile,
    deleteProfile,
    exportProfile,
    notes,
    tasks,
    events,
    files,
    activities,
    connections
  });
}
