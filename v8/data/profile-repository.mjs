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
  work: "Un espace concentrÃ© sur vos prioritÃ©s.",
  development: "Code, documentation et outils rÃ©unis.",
  study: "Cours, planning et concentration.",
  gaming: "Sessions, progression et communautÃ©.",
  streaming: "Production, direct et contenus.",
  creative: "IdÃ©es, mÃ©dias et projets crÃ©atifs."
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
  if (/study|Ã©tude|etude|school|cours/.test(name)) return "study";
  if (/stream|twitch|obs/.test(name)) return "streaming";
  if (/work|travail|pro/.test(name)) return "work";
  if (/creative|crÃ©atif|creatif|design/.test(name)) return "creative";
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
    title: text(task?.text || task?.title, "TÃ¢che sans titre", 240),
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
    title: text(event?.title || event?.name, "Ã‰vÃ©nement", 180),
    date: text(event?.date || event?.start, "", 16),
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
    favorite: favorites.includes(id) || item?.favorite === true
  });
}

function activityView(entry, index) {
  return Object.freeze({
    id: text(entry?.id, `activity-${index}`, 80),
    source: text(entry?.source, "ethone", 48).toLowerCase(),
    category: ACTIVITY_CATEGORIES.has(entry?.category) ? entry.category : "system",
    icon: text(entry?.icon, "activity", 48),
    title: text(entry?.title, "Activite ETHONE", 180),
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
    apiVersion: text(connection?.apiVersion, "Non connectee", 40),
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
    const requestedActive = text(source.actß®·¶‰žËkºwµç@‰ÕÕ¸ÁÉ½™¥°¸•ÍÐ‘¥ÍÁ½¹¥‰±”¸ˆ¤ì(€€€½¹ÍÐÁÉ½™¥±”€ôÁÉ½™¥±•ÍmÁÉ½™¥±•%¹‘•átì(€€€¥˜€ …ÁÉ½™¥±”¹ÍÑ…Ñ”ñðÑåÁ•½˜ÁÉ½™¥±”¹ÍÑ…Ñ”€„ôô€‰½‰©•Ðˆ¤ÁÉ½™¥±”¹ÍÑ…Ñ”€ôíôì(€€€¥˜€ …ÉÉ…ä¹¥ÍÉÉ…ä¡ÁÉ½™¥±”¹ÍÑ…Ñ•m­•åt¤¤ÁÉ½™¥±”¹ÍÑ…Ñ•m­•åt€ômtì((€€€ÑÉäì(€€€€€½¹ÍÐ‘…Ñ„€ôµÕÑ…Ñ¥½¸¡ÁÉ½™¥±”¹ÍÑ…Ñ•m­•åt°ÁÉ½™¥±”¹ÍÑ…Ñ”¤ì(€€€€€Á•ÉÍ¥ÍÑI…ÝAÉ½™¥±•Ì¡ÁÉ½™¥±•Ì¤ì(€€€€€É•ÑÕÉ¸É•ÍÕ±Ð¡ÑÉÕ”°€‰½µÁ±•Ñ•ˆ°€‰5½‘¥™¥…Ñ¥½¸•¸…ÑÑ•¹Ñ”‘”Íå¹¡É½¹¥Í…Ñ¥½¸¸ˆ°‘…Ñ„€üü¹Õ±°¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€É•ÑÕÉ¸É•ÍÕ±Ð¡™…±Í”°€‰™…¥±•ˆ°€‰1„µ¥Í”•¸…¡”„ƒ¥¡½×¤¸ˆ°•ÉÉ½È¤ì(€€€ô(€ô((€™Õ¹Ñ¥½¸µÕÑ…Ñ•MÑ…Ñ”¡µÕÑ…Ñ¥½¸¤ì(€€€½¹ÍÐÁÉ½™¥±•Ì€ôÉ•…‘AÉ½™¥±•Ì ¤ì(€€€½¹ÍÐÁÉ½™¥±•%¹‘•à€ô…Ñ¥Ù•AÉ½™¥±•%¹‘•à¡ÁÉ½™¥±•Ì¤ì(€€€¥˜€¡ÁÉ½™¥±•%¹‘•à€ð€À¤É•ÑÕÉ¸É•ÍÕ±Ð¡™…±Í”°€‰Õ¹…Ù…¥±…‰±”ˆ°€‰ÕÕ¸ÁÉ½™¥°¸•ÍÐ‘¥ÍÁ½¹¥‰±”¸ˆ¤ì(€€€½¹ÍÐÁÉ½™¥±”€ôÁÉ½™¥±•ÍmÁÉ½™¥±•%¹‘•átì(€€€¥˜€ …ÁÉ½™¥±”¹ÍÑ…Ñ”ñðÑåÁ•½˜ÁÉ½™¥±”¹ÍÑ…Ñ”€„ôô€‰½‰©•Ðˆ¤ÁÉ½™¥±”¹ÍÑ…Ñ”€ôíôì(€€€ÑÉäì(€€€€€½¹ÍÐ‘…Ñ„€ôµÕÑ…Ñ¥½¸¡ÁÉ½™¥±”¹ÍÑ…Ñ”¤ì(€€€€€Á•ÉÍ¥ÍÑI…ÝAÉ½™¥±•Ì¡ÁÉ½™¥±•Ì¤ì(€€€€€É•ÑÕÉ¸É•ÍÕ±Ð¡ÑÉÕ”°€‰½µÁ±•Ñ•ˆ°€‰5½‘¥™¥…Ñ¥½¸•¸…ÑÑ•¹Ñ”‘”Íå¹¡É½¹¥Í…Ñ¥½¸¸ˆ°‘…Ñ„€üü¹Õ±°¤ì(€€€ô…Ñ €¡•ÉÉ½È¤ì(€€€€€É•ÑÕÉ¸É•ÍÕ±Ð¡™…±Í”°€‰™…¥±•ˆ°€‰1„µ¥Í”•¸…¡”„•¡½Õ”¸ˆ°•ÉÉ½È¤ì(€€€ô(€ô((€½¹ÍÐ¹½Ñ•Ì€ô=‰©•Ð¹™É••é”¡ì(€€€É•…Ñ”¡¥¹ÁÕÐ€ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰¹½Ñ•Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐÑ¥µ•ÍÑ…µÀ€ô¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€€€€€½¹ÍÐ¹½Ñ”€ôì(€€€€€€€€€¥èMÑÉ¥¹œ¡¥‘…Ñ½Éä ¤¤°(€€€€€€€€€Ñ¥Ñ±”èÑ•áÐ¡¥¹ÁÕÐ¹Ñ¥Ñ±”°€‰9½Ñ”Í…¹ÌÑ¥ÑÉ”ˆ°€ÄØÀ¤°(€€€€€€€€€½¹Ñ•¹ÐèÑ•áÐ¡¥¹ÁÕÐ¹½¹Ñ•¹Ð°€ˆˆ°€ÔÀÀÀÀ¤°(€€€€€€€€€Ñ…Ìèmt°(€€€€€€€€€É•±…Ñ¥½¹Ìèmt°(€€€€€€€€€Á¥¹¹•è™…±Í”°(€€€€€€€€€½±½Èè€ˆˆ°(€€€€€€€€€É•…Ñ•èÑ¥µ•ÍÑ…µÀ°(€€€€€€€€€ÕÁ‘…Ñ•èÑ¥µ•ÍÑ…µÀ(€€€€€€€ôì(€€€€€€€±¥ÍÐ¹Õ¹Í¡¥™Ð¡¹½Ñ”¤ì(€€€€€€€É•ÑÕÉ¸¹½Ñ•Y¥•Ü¡¹½Ñ”°€À¤ì(€€€€€ô¤ì(€€€ô°(€€€ÕÁ‘…Ñ”¡¥°Á…Ñ €ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰¹½Ñ•Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐ¹½Ñ”€ô±¥ÍÐ¹™¥¹ ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€ …¹½Ñ”¤Ñ¡É½Ü¹•ÜÉÉ½È ‰9½Ñ”¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€¥˜€¡=‰©•Ð¹¡…Í=Ý¸¡Á…Ñ °€‰Ñ¥Ñ±”ˆ¤¤¹½Ñ”¹Ñ¥Ñ±”€ôÑ•áÐ¡Á…Ñ ¹Ñ¥Ñ±”°€‰9½Ñ”Í…¹ÌÑ¥ÑÉ”ˆ°€ÄØÀ¤ì(€€€€€€€¥˜€¡=‰©•Ð¹¡…Í=Ý¸¡Á…Ñ °€‰½¹Ñ•¹Ðˆ¤¤¹½Ñ”¹½¹Ñ•¹Ð€ôÑ•áÐ¡Á…Ñ ¹½¹Ñ•¹Ð°€ˆˆ°€ÔÀÀÀÀ¤ì(€€€€€€€¹½Ñ”¹ÕÁ‘…Ñ•€ô¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€€€€€É•ÑÕÉ¸¹½Ñ•Y¥•Ü¡¹½Ñ”°€À¤ì(€€€€€ô¤ì(€€€ô°(€€€É•µ½Ù”¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰¹½Ñ•Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐ¥¹‘•à€ô±¥ÍÐ¹™¥¹‘%¹‘•à ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€¡¥¹‘•à€ð€À¤Ñ¡É½Ü¹•ÜÉÉ½È ‰9½Ñ”¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€½¹ÍÐmÉ•µ½Ù•‘t€ô±¥ÍÐ¹ÍÁ±¥”¡¥¹‘•à°€Ä¤ì(€€€€€€€É•ÑÕÉ¸¹½Ñ•Y¥•Ü¡É•µ½Ù•°€À¤ì(€€€€€ô¤ì(€€€ô(€ô¤ì((€½¹ÍÐÑ…Í­Ì€ô=‰©•Ð¹™É••é”¡ì(€€€É•…Ñ”¡¥¹ÁÕÐ€ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰Ñ…Í­Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐÑ¥µ•ÍÑ…µÀ€ô¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€€€€€½¹ÍÐÑ…Í¬€ôì(€€€€€€€€€¥èMÑÉ¥¹œ¡¥‘…Ñ½Éä ¤¤°(€€€€€€€€€Ñ•áÐèÑ•áÐ¡¥¹ÁÕÐ¹Ñ¥Ñ±”°€‰9½ÕÙ•±±”Ó‰¡”ˆ°€ÈÐÀ¤°(€€€€€€€€€ÁÉ¥½É¥Ñäèl‰±½Üˆ°€‰¹½Éµ…°ˆ°€‰¡¥ ‰t¹¥¹±Õ‘•Ì¡¥¹ÁÕÐ¹ÁÉ¥½É¥Ñä¤€ü¥¹ÁÕÐ¹ÁÉ¥½É¥Ñä€è€‰¹½Éµ…°ˆ°(€€€€€€€€€‘½¹”è™…±Í”°(€€€€€€€€€½±½Èè€ˆˆ°(€€€€€€€€€‘Õ”èÑ•áÐ¡¥¹ÁÕÐ¹‘Õ”°€ˆˆ°€ÄØ¤°(€€€€€€€€€Ñ…œèÑ•áÐ¡¥¹ÁÕÐ¹Ñ…œ°€ˆˆ°€Ðà¤°(€€€€€€€€€‘…Ñ”è¹•Ü%¹Ñ°¹…Ñ•Q¥µ•½Éµ…Ð¡±½…±•Q…œ ¤°ì‘…äè€ˆÈµ‘¥¥Ðˆ°µ½¹Ñ è€‰Í¡½ÉÐˆô¤¹™½Éµ…Ð¡¹½Ü ¤¤°(€€€€€€€€€É•…Ñ•‘ÐèÑ¥µ•ÍÑ…µÀ(€€€€€€€ôì(€€€€€€€±¥ÍÐ¹Õ¹Í¡¥™Ð¡Ñ…Í¬¤ì(€€€€€€€É•ÑÕÉ¸Ñ…Í­Y¥•Ü¡Ñ…Í¬°€À¤ì(€€€€€ô¤ì(€€€ô°(€€€Ñ½±”¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰Ñ…Í­Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐÑ…Í¬€ô±¥ÍÐ¹™¥¹ ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€ …Ñ…Í¬¤Ñ¡É½Ü¹•ÜÉÉ½È ‰S‰¡”¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€Ñ…Í¬¹‘½¹”€ô€„¡Ñ…Í¬¹‘½¹”€ôôôÑÉÕ”ñðÑ…Í¬¹½µÁ±•Ñ•€ôôôÑÉÕ”¤ì(€€€€€€€¥˜€¡Ñ…Í¬¹‘½¹”¤Ñ…Í¬¹‘½¹•Ð€ô¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€€€€€•±Í”‘•±•Ñ”Ñ…Í¬¹‘½¹•Ðì(€€€€€€€É•ÑÕÉ¸Ñ…Í­Y¥•Ü¡Ñ…Í¬°€À¤ì(€€€€€ô¤ì(€€€ô°(€€€Í•Ñ½¹”¡¥‘Ì€ômt°‘½¹”€ôÑÉÕ”¤ì(€€€€€½¹ÍÐÉ•ÅÕ•ÍÑ•€ô¹•ÜM•Ð ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥‘Ì¤€ü¥‘Ì€èmt¤¹µ…À¡MÑÉ¥¹œ¤¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰Ñ…Í­Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐÑ¥µ•ÍÑ…µÀ€ô¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€€€€€½¹ÍÐ¡…¹•€ômtì(€€€€€€€±¥ÍÐ¹™½É…  ¡Ñ…Í¬°¥¹‘•à¤€ôøì(€€€€€€€€€¥˜€ …É•ÅÕ•ÍÑ•¹¡…Ì¡MÑÉ¥¹œ¡Ñ…Í¬ü¹¥¤¤¤É•ÑÕÉ¸ì(€€€€€€€€€Ñ…Í¬¹‘½¹”€ô‘½¹”€ôôôÑÉÕ”ì(€€€€€€€€€¥˜€¡Ñ…Í¬¹‘½¹”¤Ñ…Í¬¹‘½¹•Ð€ôÑ¥µ•ÍÑ…µÀì(€€€€€€€€€•±Í”‘•±•Ñ”Ñ…Í¬¹‘½¹•Ðì(€€€€€€€€€¡…¹•¹ÁÕÍ ¡Ñ…Í­Y¥•Ü¡Ñ…Í¬°¥¹‘•à¤¤ì(€€€€€€€ô¤ì(€€€€€€€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡¡…¹•¤ì(€€€€€ô¤ì(€€€ô°(€€€É•µ½Ù•5…¹ä¡¥‘Ì€ômt¤ì(€€€€€½¹ÍÐÉ•ÅÕ•ÍÑ•€ô¹•ÜM•Ð ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥‘Ì¤€ü¥‘Ì€èmt¤¹µ…À¡MÑÉ¥¹œ¤¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰Ñ…Í­Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐÉ•µ½Ù•€ô±¥ÍÐ¹™¥±Ñ•È ¡Ñ…Í¬¤€ôøÉ•ÅÕ•ÍÑ•¹¡…Ì¡MÑÉ¥¹œ¡Ñ…Í¬ü¹¥¤¤¤¹µ…À¡Ñ…Í­Y¥•Ü¤ì(€€€€€€€™½È€¡±•Ð¥¹‘•à€ô±¥ÍÐ¹±•¹Ñ €´€Äì¥¹‘•à€øô€Àì¥¹‘•à€´ô€Ä¤ì(€€€€€€€€€¥˜€¡É•ÅÕ•ÍÑ•¹¡…Ì¡MÑÉ¥¹œ¡±¥ÍÑm¥¹‘•átü¹¥¤¤¤±¥ÍÐ¹ÍÁ±¥”¡¥¹‘•à°€Ä¤ì(€€€€€€€ô(€€€€€€€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡É•µ½Ù•¤ì(€€€€€ô¤ì(€€€ô°(€€€É•µ½Ù”¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰Ñ…Í­Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐ¥¹‘•à€ô±¥ÍÐ¹™¥¹‘%¹‘•à ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€¡¥¹‘•à€ð€À¤Ñ¡É½Ü¹•ÜÉÉ½È ‰S‰¡”¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€É•ÑÕÉ¸Ñ…Í­Y¥•Ü¡±¥ÍÐ¹ÍÁ±¥”¡¥¹‘•à°€Ä¥lÁt°€À¤ì(€€€€€ô¤ì(€€€ô(€ô¤ì((€½¹ÍÐ•Ù•¹ÑÌ€ô=‰©•Ð¹™É••é”¡ì(€€€É•…Ñ”¡¥¹ÁÕÐ€ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰•Ù•¹ÑÌˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐ•Ù•¹Ð€ôì(€€€€€€€€€¥èMÑÉ¥¹œ¡¥‘…Ñ½Éä ¤¤°(€€€€€€€€€Ñ¥Ñ±”èÑ•áÐ¡¥¹ÁÕÐ¹Ñ¥Ñ±”°€‹%Û¥¹•µ•¹Ðˆ°€ÄàÀ¤°(€€€€€€€€€‘…Ñ”èÑ•áÐ¡¥¹ÁÕÐ¹‘…Ñ”°€ˆˆ°€ÄØ¤°(€€€€€€€€€½±½Èè€‰…•¹Ðˆ(€€€€€€€ôì(€€€€€€€¥˜€ „½yq‘ìÑôµq‘ìÉôµq‘ìÉô¼¹Ñ•ÍÐ¡•Ù•¹Ð¹‘…Ñ”¤¤Ñ¡É½Ü¹•ÜÉÉ½È ‰…Ñ”¥¹Ù…±¥‘”ˆ¤ì(€€€€€€€±¥ÍÐ¹ÁÕÍ ¡•Ù•¹Ð¤ì(€€€€€€€±¥ÍÐ¹Í½ÉÐ ¡±•™Ð°É¥¡Ð¤€ôøMÑÉ¥¹œ¡±•™Ðü¹‘…Ñ”ñð€ˆˆ¤¹±½…±•½µÁ…É”¡MÑÉ¥¹œ¡É¥¡Ðü¹‘…Ñ”ñð€ˆˆ¤¤¤ì(€€€€€€€É•ÑÕÉ¸•Ù•¹ÑY¥•Ü¡•Ù•¹Ð°€À¤ì(€€€€€ô¤ì(€€€ô°(€€€É•µ½Ù”¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰•Ù•¹ÑÌˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐ¥¹‘•à€ô±¥ÍÐ¹™¥¹‘%¹‘•à ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€¡¥¹‘•à€ð€À¤Ñ¡É½Ü¹•ÜÉÉ½È ‹%Û¥¹•µ•¹Ð¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€É•ÑÕÉ¸•Ù•¹ÑY¥•Ü¡±¥ÍÐ¹ÍÁ±¥”¡¥¹‘•à°€Ä¥lÁt°€À¤ì(€€€€€ô¤ì(€€€ô(€ô¤ì((€½¹ÍÐ™¥±•Ì€ô=‰©•Ð¹™É••é”¡ì(€€€Í•ÑY¥•Ü¡Ù¥•Ü¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ•MÑ…Ñ” ¡ÍÑ…Ñ”¤€ôøì(€€€€€€€¥˜€ …ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•ÈñðÑåÁ•½˜ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È€„ôô€‰½‰©•Ðˆ¤ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È€ôíôì(€€€€€€€ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹Ù¥•Ü€ôÙ¥•Ü€ôôô€‰É¥ˆ€ü€‰É¥ˆ€è€‰±¥ÍÐˆì(€€€€€€€É•ÑÕÉ¸ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹Ù¥•Üì(€€€€€ô¤ì(€€€ô°(€€€É•…Ñ”¡¥¹ÁÕÐ€ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰™¥±•Ìˆ°€¡±¥ÍÐ¤€ôøì(€€€€€€€½¹ÍÐÑåÁ”€ôl‰±¥¹¬ˆ°€‰™½±‘•È‰t¹¥¹±Õ‘•Ì¡¥¹ÁÕÐ¹ÑåÁ”¤€ü¥¹ÁÕÐ¹ÑåÁ”€è€‰±¥¹¬ˆì(€€€€€€€½¹ÍÐÕÉ°€ôÑåÁ”€ôôô€‰±¥¹¬ˆ€üÍ…™•UÉ°¡¥¹ÁÕÐ¹ÕÉ°¤€è€ˆˆì(€€€€€€€¥˜€¡ÑåÁ”€ôôô€‰±¥¹¬ˆ€˜˜€…ÕÉ°¤Ñ¡É½Ü¹•ÜÉÉ½È ‰1¥•¸¥¹Ù…±¥‘”ˆ¤ì(€€€€€€€½¹ÍÐÑ¥µ•ÍÑ…µÀ€ô¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤ì(€€€€€€€½¹ÍÐ¥Ñ•´€ôì(€€€€€€€€€¥èMÑÉ¥¹œ¡¥‘…Ñ½Éä ¤¤°(€€€€€€€€€¹…µ”èÑ•áÐ¡¥¹ÁÕÐ¹¹…µ”°ÑåÁ”€ôôô€‰™½±‘•Èˆ€ü€‰9½ÕÙ•…Ô‘½ÍÍ¥•Èˆ€è€‰9½ÕÙ•…Ô±¥•¸ˆ°€ÄàÀ¤°(€€€€€€€€€ÑåÁ”°(€€€€€€€€€ÕÉ°°(€€€€€€€€€Ñ…œèÑ•áÐ¡¥¹ÁÕÐ¹Ñ…œ°€ˆˆ°€àÀ¤°(€€€€€€€€€‘…Ñ”è¹•Ü%¹Ñ°¹…Ñ•Q¥µ•½Éµ…Ð¡±½…±•Q…œ ¤°ì‘…äè€ˆÈµ‘¥¥Ðˆ°µ½¹Ñ è€‰Í¡½ÉÐˆô¤¹™½Éµ…Ð¡¹½Ü ¤¤°(€€€€€€€€€É•…Ñ•‘ÐèÑ¥µ•ÍÑ…µÀ°(€€€€€€€€€ÕÁ‘…Ñ•‘ÐèÑ¥µ•ÍÑ…µÀ(€€€€€€€ôì(€€€€€€€±¥ÍÐ¹Õ¹Í¡¥™Ð¡¥Ñ•´¤ì(€€€€€€€É•ÑÕÉ¸™¥±•Y¥•Ü¡¥Ñ•´°€À°mt¤ì(€€€€€ô¤ì(€€€ô°(€€€Ñ½±•…Ù½É¥Ñ”¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰™¥±•Ìˆ°€¡±¥ÍÐ°ÍÑ…Ñ”¤€ôøì(€€€€€€€½¹ÍÐ¥Ñ•´€ô±¥ÍÐ¹™¥¹ ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€ …¥Ñ•´¤Ñ¡É½Ü¹•ÜÉÉ½È ‰¥¡¥•È¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€¥˜€ …ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•ÈñðÑåÁ•½˜ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È€„ôô€‰½‰©•Ðˆ¤ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È€ôíôì(€€€€€€€¥˜€ …ÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¤¤ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì€ômtì(€€€€€€€½¹ÍÐ™…Ù½É¥Ñ•Ì€ôÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¹µ…À¡MÑÉ¥¹œ¤ì(€€€€€€€½¹ÍÐ¥Ñ•µ%€ôMÑÉ¥¹œ¡¥Ñ•´¹¥¤ì(€€€€€€€ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì€ô™…Ù½É¥Ñ•Ì¹¥¹±Õ‘•Ì¡¥Ñ•µ%¤(€€€€€€€€€€ü™…Ù½É¥Ñ•Ì¹™¥±Ñ•È ¡•¹ÑÉä¤€ôø•¹ÑÉä€„ôô¥Ñ•µ%¤(€€€€€€€€€€èl¸¸¹™…Ù½É¥Ñ•Ì°¥Ñ•µ%‘tì(€€€€€€€É•ÑÕÉ¸™¥±•Y¥•Ü¡¥Ñ•´°€À°ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¤ì(€€€€€ô¤ì(€€€ô°(€€€Í•Ñ…Ù½É¥Ñ”¡¥‘Ì€ômt°™…Ù½É¥Ñ”€ôÑÉÕ”¤ì(€€€€€½¹ÍÐÉ•ÅÕ•ÍÑ•€ô¹•ÜM•Ð ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥‘Ì¤€ü¥‘Ì€èmt¤¹µ…À¡MÑÉ¥¹œ¤¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰™¥±•Ìˆ°€¡±¥ÍÐ°ÍÑ…Ñ”¤€ôøì(€€€€€€€¥˜€ …ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•ÈñðÑåÁ•½˜ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È€„ôô€‰½‰©•Ðˆ¤ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È€ôíôì(€€€€€€€½¹ÍÐÕÉÉ•¹Ð€ô¹•ÜM•Ð ¡ÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¤€üÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì€èmt¤¹µ…À¡MÑÉ¥¹œ¤¤ì(€€€€€€€É•ÅÕ•ÍÑ•¹™½É…  ¡¥¤€ôø™…Ù½É¥Ñ”€ôôôÑÉÕ”€üÕÉÉ•¹Ð¹…‘¡¥¤€èÕÉÉ•¹Ð¹‘•±•Ñ”¡¥¤¤ì(€€€€€€€ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì€ôl¸¸¹ÕÉÉ•¹Ñtì(€€€€€€€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡±¥ÍÐ¹™¥±Ñ•È ¡¥Ñ•´¤€ôøÉ•ÅÕ•ÍÑ•¹¡…Ì¡MÑÉ¥¹œ¡¥Ñ•´ü¹¥¤¤¤¹µ…À ¡¥Ñ•´°¥¹‘•à¤€ôø™¥±•Y¥•Ü¡¥Ñ•´°¥¹‘•à°ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¤¤¤ì(€€€€€ô¤ì(€€€ô°(€€€É•µ½Ù•5…¹ä¡¥‘Ì€ômt¤ì(€€€€€½¹ÍÐÉ•ÅÕ•ÍÑ•€ô¹•ÜM•Ð ¡ÉÉ…ä¹¥ÍÉÉ…ä¡¥‘Ì¤€ü¥‘Ì€èmt¤¹µ…À¡MÑÉ¥¹œ¤¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰™¥±•Ìˆ°€¡±¥ÍÐ°ÍÑ…Ñ”¤€ôøì(€€€€€€€½¹ÍÐ™…Ù½É¥Ñ•Ì€ôÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•Èü¹™…Ù½É¥Ñ•Ì¤€üÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¹µ…À¡MÑÉ¥¹œ¤€èmtì(€€€€€€€½¹ÍÐÉ•µ½Ù•€ô±¥ÍÐ¹™¥±Ñ•È ¡¥Ñ•´¤€ôøÉ•ÅÕ•ÍÑ•¹¡…Ì¡MÑÉ¥¹œ¡¥Ñ•´ü¹¥¤¤¤¹µ…À ¡¥Ñ•´°¥¹‘•à¤€ôø™¥±•Y¥•Ü¡¥Ñ•´°¥¹‘•à°™…Ù½É¥Ñ•Ì¤¤ì(€€€€€€€™½È€¡±•Ð¥¹‘•à€ô±¥ÍÐ¹±•¹Ñ €´€Äì¥¹‘•à€øô€Àì¥¹‘•à€´ô€Ä¤ì(€€€€€€€€€¥˜€¡É•ÅÕ•ÍÑ•¹¡…Ì¡MÑÉ¥¹œ¡±¥ÍÑm¥¹‘•átü¹¥¤¤¤±¥ÍÐ¹ÍÁ±¥”¡¥¹‘•à°€Ä¤ì(€€€€€€€ô(€€€€€€€¥˜€¡ÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•Èü¹™…Ù½É¥Ñ•Ì¤¤ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì€ô™…Ù½É¥Ñ•Ì¹™¥±Ñ•È ¡¥¤€ôø€…É•ÅÕ•ÍÑ•¹¡…Ì¡¥¤¤ì(€€€€€€€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡É•µ½Ù•¤ì(€€€€€ô¤ì(€€€ô°(€€€É•µ½Ù”¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ” ‰™¥±•Ìˆ°€¡±¥ÍÐ°ÍÑ…Ñ”¤€ôøì(€€€€€€€½¹ÍÐ¥¹‘•à€ô±¥ÍÐ¹™¥¹‘%¹‘•à ¡•¹ÑÉä¤€ôøMÑÉ¥¹œ¡•¹ÑÉäü¹¥¤€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€¥˜€¡¥¹‘•à€ð€À¤Ñ¡É½Ü¹•ÜÉÉ½È ‰¥¡¥•È¥¹ÑÉ½ÕÙ…‰±”ˆ¤ì(€€€€€€€½¹ÍÐÉ•µ½Ù•€ô±¥ÍÐ¹ÍÁ±¥”¡¥¹‘•à°€Ä¥lÁtì(€€€€€€€¥˜€¡ÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•Èü¹™…Ù½É¥Ñ•Ì¤¤ì(€€€€€€€€€ÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì€ôÍÑ…Ñ”¹™¥±•ÍáÁ±½É•È¹™…Ù½É¥Ñ•Ì¹µ…À¡MÑÉ¥¹œ¤¹™¥±Ñ•È ¡•¹ÑÉä¤€ôø•¹ÑÉä€„ôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€€€ô(€€€€€€€É•ÑÕÉ¸™¥±•Y¥•Ü¡É•µ½Ù•°€À°mt¤ì(€€€€€ô¤ì(€€€ô(€ô¤ì((€½¹ÍÐ…Ñ¥Ù¥Ñ¥•Ì€ô=‰©•Ð¹™É••é”¡ì(€€€É•½É¡¥¹ÁÕÐ€ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ•MÑ…Ñ” ¡ÍÑ…Ñ”¤€ôøì(€€€€€€€¥˜€ …ÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹…Ñ¥Ù¥Ñå••¤¤ÍÑ…Ñ”¹…Ñ¥Ù¥Ñå••€ômtì(€€€€€€€½¹ÍÐ•¹ÑÉä€ôì(€€€€€€€€€¥èMÑÉ¥¹œ¡¥‘…Ñ½Éä ¤¤°(€€€€€€€€€Í½ÕÉ”èÑ•áÐ¡¥¹ÁÕÐ¹Í½ÕÉ”°€‰•Ñ¡½¹”ˆ°€Ðà¤¹Ñ½1½Ý•É…Í” ¤°(€€€€€€€€€…Ñ•½ÉäèQ%Y%Qe}Q=I%L¹¡…Ì¡¥¹ÁÕÐ¹…Ñ•½Éä¤€ü¥¹ÁÕÐ¹…Ñ•½Éä€è€‰ÍåÍÑ•´ˆ°(€€€€€€€€€¥½¸èÑ•áÐ¡¥¹ÁÕÐ¹¥½¸°€‰…Ñ¥Ù¥Ñäˆ°€Ðà¤°(€€€€€€€€€Ñ¥Ñ±”èÑ•áÐ¡¥¹ÁÕÐ¹Ñ¥Ñ±”°€‰Ñ¥Ù¥Ñ”Q!=9ˆ°€ÄàÀ¤°(€€€€€€€€€‘•ÍÉ¥ÁÑ¥½¸èÑ•áÐ¡¥¹ÁÕÐ¹‘•ÍÉ¥ÁÑ¥½¸°€ˆˆ°€ÔÀÀ¤°(€€€€€€€€€Ñ¥µ•ÍÑ…µÀèÑ•áÐ¡¥¹ÁÕÐ¹Ñ¥µ•ÍÑ…µÀ°¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤°€ÐÀ¤°(€€€€€€€€€Ñ½¹”èÑ•áÐ¡¥¹ÁÕÐ¹Ñ½¹”°€‰‘•™…Õ±Ðˆ°€ÈÐ¤(€€€€€€€ôì(€€€€€€€ÍÑ…Ñ”¹…Ñ¥Ù¥Ñå••¹Õ¹Í¡¥™Ð¡•¹ÑÉä¤ì(€€€€€€€ÍÑ…Ñ”¹…Ñ¥Ù¥Ñå••€ôÍÑ…Ñ”¹…Ñ¥Ù¥Ñå••¹Í±¥” À°€ÈÀÀ¤ì(€€€€€€€É•ÑÕÉ¸…Ñ¥Ù¥ÑåY¥•Ü¡•¹ÑÉä°€À¤ì(€€€€€ô¤ì(€€€ô°(€€€±•…È ¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ•MÑ…Ñ” ¡ÍÑ…Ñ”¤€ôøì(€€€€€€€ÍÑ…Ñ”¹…Ñ¥Ù¥Ñå••€ômtì(€€€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€€€ô¤ì(€€€ô(€ô¤ì((€½¹ÍÐ½¹¹•Ñ¥½¹Ì€ô=‰©•Ð¹™É••é”¡ì(€€€½¹™¥ÕÉ”¡¥°¥¹ÁÕÐ€ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ•MÑ…Ñ” ¡ÍÑ…Ñ”¤€ôøì(€€€€€€€¥˜€ …ÍÑ…Ñ”¹½¹¹•Ñ¥½¹ÌñðÑåÁ•½˜ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì€„ôô€‰½‰©•ÐˆñðÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì¤¤ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì€ôíôì(€€€€€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¹%€ôÍ…™•%‘•¹Ñ¥™¥•È¡¥¤ì(€€€€€€€¥˜€ …¥¹Ñ•É…Ñ¥½¹%¤Ñ¡É½Ü¹•ÜÉÉ½È ‰%¹Ñ•É…Ñ¥½¸¥¹Ù…±¥‘”ˆ¤ì(€€€€€€€½¹ÍÐ•á¥ÍÑ¥¹œ€ô=‰©•Ð¹¡…Í=Ý¸¡ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì°¥¹Ñ•É…Ñ¥½¹%¤€˜˜ÑåÁ•½˜ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t€ôôô€‰½‰©•Ðˆ€üÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t€èíôì(€€€€€€€ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t€ôì(€€€€€€€€€€¸¸¹•á¥ÍÑ¥¹œ°(€€€€€€€€€¥è¥¹Ñ•É…Ñ¥½¹%°(€€€€€€€€€ÍÑ…ÑÕÌè=99Q%=9}MQQUML¹¡…Ì¡•á¥ÍÑ¥¹œ¹ÍÑ…ÑÕÌ¤€ü•á¥ÍÑ¥¹œ¹ÍÑ…ÑÕÌ€è€‰‘¥Í½¹¹•Ñ•ˆ°(€€€€€€€€€Í•ÑÕÁ½µÁ±•Ñ”èÑÉÕ”°(€€€€€€€€€µ•Ñ¡½‘%èÍ…™•%‘•¹Ñ¥™¥•È¡¥¹ÁÕÐ¹µ•Ñ¡½‘%¤ñðÍ…™•%‘•¹Ñ¥™¥•È¡•á¥ÍÑ¥¹œ¹µ•Ñ¡½‘%¤°(€€€€€€€€€É•™•É•¹”èÑ•áÐ¡¥¹ÁÕÐ¹É•™•É•¹”°•á¥ÍÑ¥¹œ¹É•™•É•¹”ñð€ˆˆ°€ÔÄÈ¤°(€€€€€€€€€½¹™¥ÕÉ•‘Ðè¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤°(€€€€€€€€€…Á¥Y•ÉÍ¥½¸èÑ•áÐ¡¥¹ÁÕÐ¹…Á¥Y•ÉÍ¥½¸ñð•á¥ÍÑ¥¹œ¹…Á¥Y•ÉÍ¥½¸°€‰¸…ÑÑ•¹Ñ”=ÕÑ ˆ°€ÐÀ¤°(€€€€€€€€€‘•Ñ…¥°èÑ•áÐ¡¥¹ÁÕÐ¹‘•Ñ…¥°°€‰½¹™¥ÕÉ…Ñ¥½¸¡¥™™É•”ÁÉ•Ñ”¸ÕÕ¸Í•É•ÐÍÑ½­”¸ˆ°€ÄàÀ¤(€€€€€€€ôì(€€€€€€€É•ÑÕÉ¸½¹¹•Ñ¥½¹Y¥•Ü¡¥¹Ñ•É…Ñ¥½¹%°ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t¤ì(€€€€€ô¤ì(€€€ô°(€€€ÕÁ‘…Ñ•MÑ…ÑÕÌ¡¥°ÍÑ…ÑÕÌ°Á…Ñ €ôíô¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ•MÑ…Ñ” ¡ÍÑ…Ñ”¤€ôøì(€€€€€€€¥˜€ …=99Q%=9}MQQUML¹¡…Ì¡ÍÑ…ÑÕÌ¤¤Ñ¡É½Ü¹•ÜÉÉ½È ‰Ñ…Ð‘”½¹¹•á¥½¸¥¹Ù…±¥‘”ˆ¤ì(€€€€€€€¥˜€ …ÍÑ…Ñ”¹½¹¹•Ñ¥½¹ÌñðÑåÁ•½˜ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì€„ôô€‰½‰©•ÐˆñðÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì¤¤ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì€ôíôì(€€€€€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¹%€ôÍ…™•%‘•¹Ñ¥™¥•È¡¥¤ì(€€€€€€€¥˜€ …¥¹Ñ•É…Ñ¥½¹%¤Ñ¡É½Ü¹•ÜÉÉ½È ‰%¹Ñ•É…Ñ¥½¸¥¹Ù…±¥‘”ˆ¤ì(€€€€€€€½¹ÍÐ•á¥ÍÑ¥¹œ€ô=‰©•Ð¹¡…Í=Ý¸¡ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì°¥¹Ñ•É…Ñ¥½¹%¤€˜˜ÑåÁ•½˜ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t€ôôô€‰½‰©•Ðˆ€üÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t€èíôì(€€€€€€€½¹ÍÐÉ•ÍÁ½¹Í•5Ì€ô9Õµ‰•È¡=‰©•Ð¹¡…Í=Ý¸¡Á…Ñ °€‰É•ÍÁ½¹Í•5Ìˆ¤€üÁ…Ñ ¹É•ÍÁ½¹Í•5Ì€è•á¥ÍÑ¥¹œ¹É•ÍÁ½¹Í•5Ì¤ì(€€€€€€€ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t€ôì(€€€€€€€€€€¸¸¹•á¥ÍÑ¥¹œ°(€€€€€€€€€¥è¥¹Ñ•É…Ñ¥½¹%°(€€€€€€€€€ÍÑ…ÑÕÌ°(€€€€€€€€€Í•ÑÕÁ½µÁ±•Ñ”è•á¥ÍÑ¥¹œ¹Í•ÑÕÁ½µÁ±•Ñ”€ôôôÑÉÕ”°(€€€€€€€€€µ•Ñ¡½‘%èÍ…™•%‘•¹Ñ¥™¥•È¡Á…Ñ ¹µ•Ñ¡½‘%¤ñðÍ…™•%‘•¹Ñ¥™¥•È¡•á¥ÍÑ¥¹œ¹µ•Ñ¡½‘%¤°(€€€€€€€€€É•™•É•¹”èÑ•áÐ¡Á…Ñ ¹É•™•É•¹”°•á¥ÍÑ¥¹œ¹É•™•É•¹”ñð€ˆˆ°€ÔÄÈ¤°(€€€€€€€€€±…ÍÑMå¹ÐèÑ•áÐ¡Á…Ñ ¹±…ÍÑMå¹Ðñð•á¥ÍÑ¥¹œ¹±…ÍÑMå¹Ð°€ˆˆ°€ÐÀ¤°(€€€€€€€€€±…ÍÑQ•ÍÑ•‘ÐèÑ•áÐ¡Á…Ñ ¹±…ÍÑQ•ÍÑ•‘Ðñð•á¥ÍÑ¥¹œ¹±…ÍÑQ•ÍÑ•‘Ð°€ˆˆ°€ÐÀ¤°(€€€€€€€€€É•ÍÁ½¹Í•5Ìè9Õµ‰•È¹¥Í¥¹¥Ñ”¡É•ÍÁ½¹Í•5Ì¤€ü5…Ñ ¹µ¥¸ ØÀÀÀÀÀ°5…Ñ ¹µ…à À°5…Ñ ¹É½Õ¹¡É•ÍÁ½¹Í•5Ì¤¤¤€è¹Õ±°°(€€€€€€€€€…Á¥Y•ÉÍ¥½¸èÑ•áÐ¡Á…Ñ ¹…Á¥Y•ÉÍ¥½¸ñð•á¥ÍÑ¥¹œ¹…Á¥Y•ÉÍ¥½¸°€‰9½¸½¹¹•Ñ•”ˆ°€ÐÀ¤°(€€€€€€€€€‘•Ñ…¥°èÑ•áÐ¡Á…Ñ ¹‘•Ñ…¥°°•á¥ÍÑ¥¹œ¹‘•Ñ…¥°ñð€ˆˆ°€ÄàÀ¤(€€€€€€€ôì(€€€€€€€É•ÑÕÉ¸½¹¹•Ñ¥½¹Y¥•Ü¡¥¹Ñ•É…Ñ¥½¹%°ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘t¤ì(€€€€€ô¤ì(€€€ô°(€€€Ñ•ÍÐ¡¥¤ì(€€€€€½¹ÍÐÕÉÉ•¹Ð€ôÍ¹…ÁÍ¡½Ð ¤¹½¹¹•Ñ¥½¹Ì¹™¥¹ ¡½¹¹•Ñ¥½¸¤€ôø½¹¹•Ñ¥½¸¹¥€ôôôMÑÉ¥¹œ¡¥¤¤ì(€€€€€¥˜€ …ÕÉÉ•¹Ðü¹Í•ÑÕÁ½µÁ±•Ñ”¤É•ÑÕÉ¸É•ÍÕ±Ð¡™…±Í”°€‰Õ¹…Ù…¥±…‰±”ˆ°€‰Q•Éµ¥¹•è…‰½É±”Õ¥‘”‘”½¹™¥ÕÉ…Ñ¥½¸¸ˆ¤ì(€€€€€¥˜€¡ÕÉÉ•¹Ð¹ÍÑ…ÑÕÌ€„ôô€‰½¹¹•Ñ•ˆ¤É•ÑÕÉ¸É•ÍÕ±Ð¡™…±Í”°€‰Õ¹…Ù…¥±…‰±”ˆ°€‰1”½¹¹•Ñ•ÕÈ•ÍÐÁÉ•Á…É”°µ…¥Ì…ÕÕ¸=ÕÑ ‰…­•¹¸•ÍÐ…Ñ¥˜¸ˆ°ÕÉÉ•¹Ð¤ì(€€€€€É•ÑÕÉ¸Ñ¡¥Ì¹ÕÁ‘…Ñ•MÑ…ÑÕÌ¡¥°€‰½¹¹•Ñ•ˆ°ì±…ÍÑQ•ÍÑ•‘Ðè¹½Ü ¤¹Ñ½%M=MÑÉ¥¹œ ¤°±…ÍÑMå¹ÐèÕÉÉ•¹Ð¹±…ÍÑMå¹Ð°…Á¥Y•ÉÍ¥½¸èÕÉÉ•¹Ð¹…Á¥Y•ÉÍ¥½¸°‘•Ñ…¥°è€‰Ñ…Ð‘”½¹¹•á¥½¸Ù•É¥™¥”¸ˆô¤ì(€€€ô°(€€€‘¥Í½¹¹•Ð¡¥¤ì(€€€€€É•ÑÕÉ¸µÕÑ…Ñ•MÑ…Ñ” ¡ÍÑ…Ñ”¤€ôøì(€€€€€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¹%€ôÍ…™•%‘•¹Ñ¥™¥•È¡¥¤ì(€€€€€€€¥˜€ …¥¹Ñ•É…Ñ¥½¹%¤Ñ¡É½Ü¹•ÜÉÉ½È ‰%¹Ñ•É…Ñ¥½¸¥¹Ù…±¥‘”ˆ¤ì(€€€€€€€¥˜€ …ÍÑ…Ñ”¹½¹¹•Ñ¥½¹ÌñðÑåÁ•½˜ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì€„ôô€‰½‰©•ÐˆñðÉÉ…ä¹¥ÍÉÉ…ä¡ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì¤¤ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ì€ôíôì(€€€€€€€‘•±•Ñ”ÍÑ…Ñ”¹½¹¹•Ñ¥½¹Ím¥¹Ñ•É…Ñ¥½¹%‘tì(€€€€€€€É•ÑÕÉ¸½¹¹•Ñ¥½¹Y¥•Ü¡¥¹Ñ•É…Ñ¥½¹%°ìÍÑ…ÑÕÌè€‰‘¥Í½¹¹•Ñ•ˆ°‘•Ñ…¥°è€‰ÍÍ½¥…Ñ¥½¸ÍÕÁÁÉ¥µ•”¸ˆô¤ì(€€€€€ô¤ì(€€€ô(€ô¤ì((€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì(€€€Í¹…ÁÍ¡½Ð°(€€€•áÁ½ÉÑ±½Õ‘MÑ…Ñ”°(€€€¡å‘É…Ñ•±½Õ‘MÑ…Ñ”°(€€€ÍÕ‰ÍÉ¥‰•A•ÉÍ¥ÍÑ•¹”°(€€€±¥ÍÑAÉ½™¥±•Ì°(€€€…Ñ¥Ù•AÉ½™¥±”°(€€€Í•±•ÑAÉ½™¥±”°(€€€Í•Ñ=Ý¹•È°(€€€½Ý¹•Èè€ ¤€ôø½Ý¹•É%°(€€€É•…Ñ•AÉ½™¥±”°(€€€ÕÁ‘…Ñ•AÉ½™¥±”°(€€€‘ÕÁ±¥…Ñ•AÉ½™¥±”°(€€€‘•±•Ñ•AÉ½™¥±”°(€€€•áÁ½ÉÑAÉ½™¥±”°(€€€¹½Ñ•Ì°(€€€Ñ…Í­Ì°(€€€•Ù•¹ÑÌ°(€€€™¥±•Ì°(€€€…Ñ¥Ù¥Ñ¥•Ì°(€€€½¹¹•Ñ¥½¹Ì(€ô¤ì)ô(