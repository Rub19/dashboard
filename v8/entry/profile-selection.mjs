import { createDailyBriefing } from "../data/daily-briefing.mjs";
import { element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { enhanceForm, formField, runFormSubmission, setFieldState, validateControl } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { computeFloatingPosition, getLayerManager } from "../ui/layer-manager.mjs";
import { createWindowController } from "../ui/window-system.mjs";

const TYPE_LABELS = Object.freeze({
  personal: "Personnel",
  work: "Travail",
  development: "Developpement",
  study: "Etudes",
  gaming: "Gaming",
  streaming: "Streaming",
  creative: "Creatif"
});

const ACCENT_LABELS = Object.freeze({
  mint: "Menthe",
  sky: "Azur",
  amber: "Ambre",
  violet: "Violet",
  rose: "Rose"
});

const WIDGET_CATALOG = Object.freeze({
  today: Object.freeze({ label: "Aujourd'hui", icon: "sun-medium" }),
  notes: Object.freeze({ label: "Notes", icon: "notebook-pen" }),
  calendar: Object.freeze({ label: "Calendrier", icon: "calendar-days" }),
  tasks: Object.freeze({ label: "Taches", icon: "circle-check-big" }),
  focus: Object.freeze({ label: "Focus", icon: "timer" }),
  github: Object.freeze({ label: "GitHub", icon: "github" }),
  terminal: Object.freeze({ label: "Terminal", icon: "square-terminal" }),
  brain: Object.freeze({ label: "Brain", icon: "brain" }),
  planning: Object.freeze({ label: "Planning", icon: "calendar-range" }),
  discord: Object.freeze({ label: "Discord", icon: "message-circle" }),
  spotify: Object.freeze({ label: "Spotify", icon: "audio-lines" }),
  sessions: Object.freeze({ label: "Sessions", icon: "gamepad-2" }),
  live: Object.freeze({ label: "Direct", icon: "radio" }),
  clips: Object.freeze({ label: "Clips", icon: "clapperboard" }),
  projects: Object.freeze({ label: "Projets", icon: "panels-top-left" }),
  files: Object.freeze({ label: "Fichiers", icon: "folder" })
});

const WIDGETS_BY_TYPE = Object.freeze({
  personal: Object.freeze(["today", "notes", "calendar"]),
  work: Object.freeze(["tasks", "calendar", "focus"]),
  development: Object.freeze(["github", "terminal", "brain"]),
  study: Object.freeze(["notes", "planning", "focus"]),
  gaming: Object.freeze(["discord", "spotify", "sessions"]),
  streaming: Object.freeze(["live", "planning", "clips"]),
  creative: Object.freeze(["projects", "files", "brain"])
});

const INTEGRATIONS = Object.freeze([
  Object.freeze({ id: "spotify", label: "Spotify", icon: "audio-lines" }),
  Object.freeze({ id: "discord", label: "Discord", icon: "message-circle" }),
  Object.freeze({ id: "github", label: "GitHub", icon: "github" }),
  Object.freeze({ id: "google-calendar", label: "Google Calendar", icon: "calendar-sync" })
]);

const AMBIENCE_LABELS = Object.freeze({ balanced: "Equilibree", focus: "Concentration", quiet: "Calme", dynamic: "Vivante" });
const BACKGROUND_LABELS = Object.freeze({ signal: "Signal ETHONE", horizon: "Horizon", graphite: "Graphite", aurora: "Aurora" });
const AVATAR_CHOICES = Object.freeze(["E", "R", "W", "D", "G", "S"]);

const MENU_ACTIONS = Object.freeze([
  Object.freeze({ id: "rename", label: "Renommer", icon: "text-cursor-input" }),
  Object.freeze({ id: "edit", label: "Modifier le profil", icon: "sliders-horizontal" }),
  Object.freeze({ id: "avatar", label: "Changer l'avatar", icon: "circle-user-round" }),
  Object.freeze({ id: "space", label: "Changer le Space", icon: "panels-top-left" }),
  Object.freeze({ id: "theme", label: "Changer le theme", icon: "palette" }),
  Object.freeze({ id: "export", label: "Exporter", icon: "download" }),
  Object.freeze({ id: "duplicate", label: "Dupliquer", icon: "copy" }),
  Object.freeze({ id: "delete", label: "Supprimer", icon: "trash-2", danger: true })
]);

export function nextProfileIndex(totalInput, currentInput, key) {
  const total = Math.max(0, Number(totalInput) || 0);
  if (!total) return -1;
  const current = Math.min(total - 1, Math.max(0, Number(currentInput) || 0));
  if (key === "Home") return 0;
  if (key === "End") return total - 1;
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % total;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + total) % total;
  return current;
}

function count(value) {
  return Math.max(0, Number(value) || 0);
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function formatEnvironmentClock(dateInput = new Date()) {
  const date = dateInput instanceof Date && !Number.isNaN(dateInput.getTime()) ? dateInput : new Date();
  return Object.freeze({
    time: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date),
    date: new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(date)
  });
}

function lastActiveLabel(value, date) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recemment";
  const minutes = Math.max(0, Math.round((date.getTime() - timestamp) / 60000));
  if (minutes < 2) return "A l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  if (hours < 48) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(timestamp));
}

function latestActivity(snapshot, predicate) {
  return safeArray(snapshot?.activities)
    .filter(predicate)
    .sort((left, right) => new Date(right?.timestamp || 0).getTime() - new Date(left?.timestamp || 0).getTime())[0] || null;
}

function livePreviewModel(snapshot, date) {
  const briefing = createDailyBriefing({ snapshot, date });
  const item = (id) => briefing.items.find((entry) => entry.id === id);
  const connections = safeArray(snapshot?.connections);
  const connection = (id) => connections.find((entry) => entry.id === id);
  const brain = latestActivity(snapshot, (entry) => entry?.category === "brain" || entry?.source === "brain");
  const discord = latestActivity(snapshot, (entry) => entry?.source === "discord");
  const syncedConnections = connections.filter((entry) => entry.status === "connected");
  const syncing = connections.some((entry) => entry.status === "syncing");
  const weather = item("weather");
  const events = item("events");
  const music = item("music");
  const discordConnected = connection("discord")?.status === "connected";
  return Object.freeze({
    cloud: Object.freeze({
      value: syncing ? "Synchronisation" : syncedConnections.length ? "Services synchronises" : "Supabase pret",
      state: syncing ? "syncing" : "ready"
    }),
    signals: Object.freeze([
      Object.freeze({ id: "brain", label: "Brain", icon: "brain", value: brain?.title || "Contexte pret", detail: brain ? "Activite recente" : "Pret pour cet environnement", state: brain ? "ready" : "idle" }),
      Object.freeze({ id: "weather", label: "Meteo", icon: "cloud-sun", value: weather?.value || "Source non connectee", detail: weather?.detail || "Connections", state: weather?.state || "unavailable" }),
      Object.freeze({ id: "calendar", label: "Agenda", icon: "calendar-days", value: events?.value || "Aucun evenement", detail: events?.detail || "Aujourd'hui", state: events?.state || "empty" }),
      Object.freeze({ id: "music", label: "Musique", icon: "audio-lines", value: music?.value || "Source non connectee", detail: music?.detail || "Spotify", state: music?.state || "unavailable" }),
      Object.freeze({ id: "discord", label: "Discord", icon: "message-circle", value: discord?.title || (discordConnected ? "Connecte" : "Non connecte"), detail: discord ? "Activite recente" : "Presence", state: discord ? "ready" : discordConnected ? "idle" : "unavailable" })
    ])
  });
}

export function profilePreviewModel(profile = {}, snapshot = {}, dateInput = new Date()) {
  const date = dateInput instanceof Date && !Number.isNaN(dateInput.getTime()) ? dateInput : new Date();
  const avatar = profile.avatar && typeof profile.avatar === "object"
    ? Object.freeze({ kind: String(profile.avatar.kind || "initials"), value: String(profile.avatar.value || "E") })
    : Object.freeze({ kind: "initials", value: "E" });
  const type = TYPE_LABELS[profile.type] ? profile.type : "personal";
  const accent = Object.hasOwn(ACCENT_LABELS, profile.accent) ? profile.accent : "mint";
  const environment = profile.environment && typeof profile.environment === "object" ? profile.environment : {};
  const configuredWidgets = safeArray(environment.widgets).filter((widgetId) => Object.hasOwn(WIDGET_CATALOG, widgetId));
  const favoriteWidgets = Object.freeze((configuredWidgets.length ? configuredWidgets : WIDGETS_BY_TYPE[type]).slice(0, 6));
  const live = livePreviewModel(snapshot, date);
  const signals = Object.freeze([
    Object.freeze({ label: "Notes", value: count(profile.counts?.notes) }),
    Object.freeze({ label: "A faire", value: count(profile.counts?.openTasks) }),
    Object.freeze({ label: "Agenda", value: count(profile.counts?.events) }),
    Object.freeze({ label: "Fichiers", value: count(profile.counts?.files) })
  ]);
  return Object.freeze({
    id: String(profile.id || ""),
    name: String(profile.name || "Profil"),
    type,
    typeLabel: TYPE_LABELS[type],
    description: String(profile.description || "Votre environnement ETHONE."),
    avatar,
    accent,
    tone: TYPE_LABELS[profile.wallpaperTone] ? profile.wallpaperTone : type,
    locked: profile.locked === true,
    statusLabel: profile.locked === true ? "Protege" : "Pret",
    lastActiveLabel: lastActiveLabel(profile.lastActiveAt, date),
    space: String(profile.space || type),
    spaceLabel: TYPE_LABELS[profile.space] || String(profile.space || TYPE_LABELS[type]),
    themeLabel: ACCENT_LABELS[accent],
    flowLabel: String(profile.flow || "Essentiel"),
    favoriteWidgets,
    widgetCount: favoriteWidgets.length,
    ambienceLabel: AMBIENCE_LABELS[environment.ambience] || AMBIENCE_LABELS.balanced,
    backgroundLabel: BACKGROUND_LABELS[environment.background] || BACKGROUND_LABELS.signal,
    environment: Object.freeze({
      widgets: favoriteWidgets,
      integrations: Object.freeze(safeArray(environment.integrations).filter((id) => INTEGRATIONS.some((integration) => integration.id === id))),
      ambience: Object.hasOwn(AMBIENCE_LABELS, environment.ambience) ? environment.ambience : "balanced",
      background: Object.hasOwn(BACKGROUND_LABELS, environment.background) ? environment.background : "signal"
    }),
    live,
    signals
  });
}

export function settleActivationResult(result, view) {
  if (!result || result.ok !== false) return false;
  view.surface.classList.remove("is-launching");
  view.surface.setAttribute("aria-busy", "false");
  view.enterButton.disabled = false;
  view.status.textContent = result.message || "L'environnement n'a pas pu etre ouvert.";
  return true;
}

function avatarNode(avatar, className, loading = "lazy") {
  if (avatar.kind === "image") {
    return element("img", { className, attributes: { src: avatar.value, alt: "", loading, referrerpolicy: "no-referrer" } });
  }
  return element("span", { className, text: avatar.value, attributes: { "aria-hidden": "true" } });
}

function signalRow(signal) {
  return element("div", { className: "v8-profile-preview__signal", dataset: { liveWidget: "metric", liveKind: "metric" } }, [
    element("span", { text: signal.label }),
    element("strong", { text: signal.value, dataset: { liveNumber: signal.value } })
  ]);
}

function metaItem(iconName, label, value) {
  return element("div", { className: "v8-profile-preview__meta-item" }, [
    icon(iconName),
    element("span", {}, [element("small", { text: label }), element("strong", { text: value })])
  ]);
}

function widgetChip(widgetId) {
  const widget = WIDGET_CATALOG[widgetId] || Object.freeze({ label: widgetId, icon: "box" });
  return element("span", { className: "v8-profile-preview__widget", dataset: { liveWidget: "widget", liveKind: "widget" } }, [icon(widget.icon), element("span", { text: widget.label })]);
}

function liveSignalNode(signal) {
  return element("article", { className: "v8-profile-live", dataset: { state: signal.state, signal: signal.id, liveWidget: "signal", liveKind: "signal" } }, [
    element("div", { className: "v8-profile-live__header" }, [
      element("span", { className: "v8-profile-live__icon" }, icon(signal.icon)),
      element("span", { text: signal.label }),
      element("i", { attributes: { "aria-hidden": "true" } })
    ]),
    element("strong", { text: signal.value }),
    element("small", { text: signal.detail })
  ]);
}

function optionNode(value, label) {
  return element("option", { text: label, attributes: { value } });
}

export function mountProfileSelection(root, options = {}) {
  if (!root) throw new TypeError("Profile selection requires a root element");
  const repository = options.repository;
  if (!repository) throw new TypeError("Profile selection requires a repository");
  const presence = options.presenceEngine || null;
  const cloudSync = options.cloudSync || null;
  const clockManager = options.clockManager || null;
  const now = typeof options.now === "function" ? options.now : () => new Date();
  const abortController = new AbortController();
  const listenerOptions = { signal: abortController.signal };
  const makeModels = (source) => Object.freeze(source.map((profile) => profilePreviewModel(profile, repository.snapshot?.(profile.id) || {}, now())));
  let profiles = makeModels(options.profiles || repository.listProfiles());
  let selectedIndex = Math.max(0, profiles.findIndex((profile) => profile.id === repository.activeProfile()?.id));
  let cards = [];
  let destroyed = false;
  let activation = 0;
  let menuProfileId = "";
  let menuTrigger = null;
  let menuRegistration = null;
  let releaseDialogForm = () => {};
  const layerManager = getLayerManager({ document, runtime: globalThis });
  const dialogWindow = createWindowController({ onEscape: () => closeDialog() });

  root.replaceChildren();
  root.dataset.entryState = "profiles";
  document.documentElement.dataset.entry = "profiles";

  const status = element("div", { className: "v8-profile-select__status", attributes: { role: "status", "aria-live": "polite", "aria-atomic": "true" } });
  const profileCount = element("span", { className: "v8-profile-browser__count" });
  const previewAvatarHost = element("div", { className: "v8-profile-preview__avatar" });
  const previewType = element("span", { className: "v8-profile-preview__type" });
  const previewName = element("h2", { className: "v8-profile-preview__name", attributes: { translate: "no" } });
  const previewDescription = element("p", { className: "v8-profile-preview__description" });
  const previewStatus = element("span", { className: "v8-profile-preview__status" });
  const previewLastActive = element("span", { className: "v8-profile-preview__last-active" });
  const previewSignals = elemómz¶‰žËkºwµç@€¥˜€ …Ý¥‘•ÑÍQ½Õ¡•¤ì(€€€€€€€¡½Í•¹]¥‘•ÑÌ€ô¹•ÜM•Ð¡]%QM}	e}QeAmÑåÁ•M•±•Ð¹Ù…±Õ•tñð]%QM}	e}QeA¹Á•ÉÍ½¹…°¤ì(€€€€€€€Íå¹]¥‘•ÑA¥­•È ¤ì(€€€€€ô(€€€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€…µ‰¥•¹•M•±•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°ÕÁ‘…Ñ•5½‘Õ±•MÕµµ…Éä°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì((€€€½¹ÍÐÍÑ•Á•™¥¹¥Ñ¥½¹Ì€ô=‰©•Ð¹™É••é”¡l(€€€€€=‰©•Ð¹™É••é”¡ì±…‰•°è€‰%‘•¹Ñ¥Ñ”ˆ°¥½¸è€‰¥É±”µÕÍ•ÈµÉ½Õ¹ˆô¤°(€€€€€=‰©•Ð¹™É••é”¡ì±…‰•°è€‰U¹¥Ù•ÉÌˆ°¥½¸è€‰Á…¹•±ÌµÑ½Àµ±•™Ðˆô¤°(€€€€€=‰©•Ð¹™É••é”¡ì±…‰•°è€‰5½‘Õ±•Ìˆ°¥½¸è€‰±…å½ÕÐµÉ¥ˆô¤(€€€t¤ì(€€€½¹ÍÐÍÑ•Á	ÕÑÑ½¹Ì€ôÍÑ•Á•™¥¹¥Ñ¥½¹Ì¹µ…À ¡ÍÑ•À°¥¹‘•à¤€ôø•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}ÍÑ•Àˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆ°€‰…É¥„µÕÉÉ•¹Ðˆè¥¹‘•à€ôôô…Ñ¥Ù•MÑ•À€ü€‰ÍÑ•Àˆ€è€‰™…±Í”ˆô°‘…Ñ…Í•ÐèìÍÑ•ÀèMÑÉ¥¹œ¡¥¹‘•à¤ôô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐèMÑÉ¥¹œ¡¥¹‘•à€¬€Ä¤ô¤°¥½¸¡ÍÑ•À¹¥½¸¤°•±•µ•¹Ð ‰ÍÑÉ½¹œˆ°ìÑ•áÐèÍÑ•À¹±…‰•°ô¥t¤¤ì(€€€½¹ÍÐÍÑ•ÁÁ•È€ô•±•µ•¹Ð ‰¹…Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}ÍÑ•ÁÌˆ°…ÑÑÉ¥‰ÕÑ•Ìèì€‰…É¥„µ±…‰•°ˆè€‰Ñ…Á•Ì‘”½¹™¥ÕÉ…Ñ¥½¸ˆôô°ÍÑ•Á	ÕÑÑ½¹Ì¤ì((€€€½¹ÍÐÁ…•Ì€ôl(€€€€€•±•µ•¹Ð ‰Í•Ñ¥½¸ˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…”ˆ°‘…Ñ…Í•ÐèìÝ¥é…É‘MÑ•Àè€ˆÀˆôô°l(€€€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…”µ¡•…‘¥¹œˆô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€ˆÀÄ€¼%9Q%Qˆô¤°•±•µ•¹Ð ‰ Ìˆ°ìÑ•áÐè€‰½¹¹•èÕ¸Ù¥Í…”„•ÐÕ¹¥Ù•ÉÌˆô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè€‰U¸¹½´°Õ¹”¥¹Ñ•¹Ñ¥½¸•ÐÕ¸É•Á•É”Ù¥ÍÕ•°¥µµ•‘¥…Ð¸ˆô¥t¤°(€€€€€€€™½Éµ¥•±¡ì±…‰•°è€‰9½´ˆ°½¹ÑÉ½°è¹…µ•%¹ÁÕÐ°É•ÅÕ¥É•èÑÉÕ”°¡•±Àè€ˆàÀ…É…Ñ•É•Ìµ…á¥µÕ´ˆô¤°(€€€€€€€™½Éµ¥•±¡ì±…‰•°è€‰•ÍÉ¥ÁÑ¥½¸ˆ°½¹ÑÉ½°è‘•ÍÉ¥ÁÑ¥½¹%¹ÁÕÐ°¡•±Àè€ˆÄàÀ…É…Ñ•É•Ìµ…á¥µÕ´ˆô¤°(€€€€€€€•±•µ•¹Ð ‰™¥•±‘Í•Ðˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}™¥•±‘Í•Ðˆô°m•±•µ•¹Ð ‰±••¹ˆ°ìÑ•áÐè€‰Ù…Ñ…Èˆô¤°…Ù…Ñ…ÉA¥­•Ét¤(€€€€€t¤°(€€€€€•±•µ•¹Ð ‰Í•Ñ¥½¸ˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…”ˆ°‘…Ñ…Í•ÐèìÝ¥é…É‘MÑ•Àè€ˆÄˆôô°l(€€€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…”µ¡•…‘¥¹œˆô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€ˆÀÈ€¼U9%YILˆô¤°•±•µ•¹Ð ‰ Ìˆ°ìÑ•áÐè€‰I•±•èÍ½¸ÉåÑ¡µ”ˆô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè€‰MÁ…”°±½Ü•Ð…µ‰¥…¹”½µÁ½Í•¹Ð±„ÁÉ•µ¥•É”¥µÁÉ•ÍÍ¥½¸¸ˆô¥t¤°(€€€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}É½Üˆô°l(€€€€€€€€€™½Éµ¥•±¡ì±…‰•°è€‰MÁ…”ÁÉ¥¹¥Á…°ˆ°½¹ÑÉ½°èÑåÁ•M•±•Ð°¡•±Àè€‰¹Ù¥É½¹¹•µ•¹Ð¡…É”„°½ÕÙ•ÉÑÕÉ”ˆô¤°(€€€€€€€€€™½Éµ¥•±¡ì±…‰•°è€‰±½ÜÁÉ¥¹¥Á…°ˆ°½¹ÑÉ½°è™±½Ý%¹ÁÕÐ°¡•±Àè€ˆàÀ…É…Ñ•É•Ìµ…á¥µÕ´ˆô¤(€€€€€€€t¤°(€€€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}É½Üˆô°l(€€€€€€€€€™½Éµ¥•±¡ì±…‰•°è€‰µ‰¥…¹”ˆ°½¹ÑÉ½°è…µ‰¥•¹•M•±•Ð°¡•±Àè€‰IåÑ¡µ”Ù¥ÍÕ•°‘”°•¹Ù¥É½¹¹•µ•¹Ðˆô¤°(€€€€€€€€€™½Éµ¥•±¡ì±…‰•°è€‰½¹ˆ°½¹ÑÉ½°è‰…­É½Õ¹‘M•±•Ð°¡•±Àè€‰½¹…ÁÁ±¥ÅÕ”…Ô…Í¡‰½…Éˆô¤(€€€€€€€t¤°(€€€€€€€•±•µ•¹Ð ‰™¥•±‘Í•Ðˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}™¥•±‘Í•Ðˆô°m•±•µ•¹Ð ‰±••¹ˆ°ìÑ•áÐè€‰½Õ±•ÕÈ‘½µ¥¹…¹Ñ”ˆô¤°…•¹ÑA¥­•Ét¤(€€€€€t¤°(€€€€€•±•µ•¹Ð ‰Í•Ñ¥½¸ˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…”ˆ°‘…Ñ…Í•ÐèìÝ¥é…É‘MÑ•Àè€ˆÈˆôô°l(€€€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…”µ¡•…‘¥¹œˆô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€ˆÀÌ€¼5=U1Lˆô¤°•±•µ•¹Ð ‰ Ìˆ°ìÑ•áÐè€‰¡½¥Í¥ÍÍ•è”ÅÕ¤Ù½ÕÌ…ÑÑ•¹ˆô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè€‰•Ìµ½‘Õ±•ÌÍ•É½¹ÐÁÉ•Á…É•ÌÍ…¹Ì½¹¹•Ñ•È‘”Í•ÉÙ¥”„Ù½ÑÉ”Á±…”¸ˆô¥t¤°(€€€€€€€•±•µ•¹Ð ‰™¥•±‘Í•Ðˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}™¥•±‘Í•Ðˆô°m•±•µ•¹Ð ‰±••¹ˆ°ìÑ•áÐè€‰]¥‘•ÑÌˆô¤°Ý¥‘•ÑA¥­•Ét¤°(€€€€€€€•±•µ•¹Ð ‰™¥•±‘Í•Ðˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}™¥•±‘Í•Ðˆô°m•±•µ•¹Ð ‰±••¹ˆ°ìÑ•áÐè€‰%¹Ñ•É…Ñ¥½¹Ì„ÁÉ•Á…É•Èˆô¤°¥¹Ñ•É…Ñ¥½¹A¥­•Ét¤°(€€€€€€€Í•ÑÕÁMÕµµ…Éä(€€€€€t¤(€€€tì((€€€½¹ÍÐ…¹•°€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µÍ•½¹‘…Éäˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆôô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€‰¹¹Õ±•Èˆô¥t¤ì(€€€½¹ÍÐ‰…¬€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µ¡½ÍÐˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆôô°m¥½¸ ‰…ÉÉ½Üµ±•™Ðˆ¤°•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€‰I•Ñ½ÕÈˆô¥t¤ì(€€€½¹ÍÐ¹•áÐ€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µÁÉ¥µ…Éäˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆôô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€‰½¹Ñ¥¹Õ•Èˆô¤°¥½¸ ‰…ÉÉ½ÜµÉ¥¡Ðˆ¥t¤ì(€€€½¹ÍÐÍÕ‰µ¥Ð€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µÁÉ¥µ…Éäˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰ÍÕ‰µ¥Ðˆôô°m¥½¸¡µ½‘”€ôôô€‰É•…Ñ”ˆ€ü€‰ÍÁ…É­±•Ìˆ€è€‰¡•¬ˆ¤°•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐèµ½‘”€ôôô€‰É•…Ñ”ˆ€ü€‰É••È°•¹Ù¥É½¹¹•µ•¹Ðˆ€è€‰¹É•¥ÍÑÉ•Èˆô¥t¤ì(€€€½¹ÍÐ™½É´€ô•±•µ•¹Ð ‰™½É´ˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}™½É´ˆô°l(€€€€€ÍÑ•ÁÁ•È°(€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}Á…•Ìˆô°Á…•Ì¤°(€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}…Ñ¥½¹Ìˆô°m…¹•°°•±•µ•¹Ð ‰ÍÁ…¸ˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}…Ñ¥½¸µÍÁ…•Èˆô¤°‰…¬°¹•áÐ°ÍÕ‰µ¥Ñt¤(€€€t¤ì(€€€É•±•…Í•¥…±½½É´ ¤ì(€€€É•±•…Í•¥…±½½É´€ô•¹¡…¹•½É´¡™½É´¤ì(€€€½¹ÍÐ‘¥…±½œ€ô‘¥…±½M¡•±° (€€€€€µ½‘”€ôôô€‰É•…Ñ”ˆ€ü€‰½µÁ½Í•ÈÕ¸•¹Ù¥É½¹¹•µ•¹Ðˆ€è5½‘¥™¥•È€‘íÁÉ½™¥±”¹¹…µ•õ€°(€€€€€µ½‘”€ôôô€‰É•…Ñ”ˆ€ü€‰QÉ½¥Ì•Ñ…Á•Ì½ÕÉÑ•Ì°ÁÕ¥ÌQ!=9•ÍÐÁÉ•Ð„ÁÉ•¹‘É”Ù¥”¸ˆ€è€‰©ÕÍÑ•èÍ½¸¥‘•¹Ñ¥Ñ”•ÐÍ•Ìµ½‘Õ±•ÌÍ…¹ÌÑ½Õ¡•È„Í•Ì‘½¹¹••Ì¸ˆ°(€€€€€™½É´°(€€€€€•±•µ•¹Ð ‰ÍÁ…¸ˆ¤(€€€€¤ì((€€€™Õ¹Ñ¥½¸Í¡½ÝMÑ•À¡¥¹‘•à°™½ÕÌ€ôÑÉÕ”¤ì(€€€€€…Ñ¥Ù•MÑ•À€ô5…Ñ ¹µ¥¸¡Á…•Ì¹±•¹Ñ €´€Ä°5…Ñ ¹µ…à À°¥¹‘•à¤¤ì(€€€€€‘¥…±½œ¹‘…Ñ…Í•Ð¹Ý¥é…É‘MÑ•À€ôMÑÉ¥¹œ¡…Ñ¥Ù•MÑ•À¤ì(€€€€€Á…•Ì¹™½É…  ¡Á…”°Á…•%¹‘•à¤€ôøì(€€€€€€€½¹ÍÐ…Ñ¥Ù”€ôÁ…•%¹‘•à€ôôô…Ñ¥Ù•MÑ•Àì(€€€€€€€Á…”¹¡¥‘‘•¸€ô€……Ñ¥Ù”ì(€€€€€€€Á…”¹Ñ½±•ÑÑÉ¥‰ÕÑ” ‰¥¹•ÉÐˆ°€……Ñ¥Ù”¤ì(€€€€€ô¤ì(€€€€€ÍÑ•Á	ÕÑÑ½¹Ì¹™½É…  ¡‰ÕÑÑ½¸°‰ÕÑÑ½¹%¹‘•à¤€ôø‰ÕÑÑ½¸¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µÕÉÉ•¹Ðˆ°‰ÕÑÑ½¹%¹‘•à€ôôô…Ñ¥Ù•MÑ•À€ü€‰ÍÑ•Àˆ€è€‰™…±Í”ˆ¤¤ì(€€€€€‰…¬¹¡¥‘‘•¸€ô…Ñ¥Ù•MÑ•À€ôôô€Àì(€€€€€¹•áÐ¹¡¥‘‘•¸€ô…Ñ¥Ù•MÑ•À€ôôôÁ…•Ì¹±•¹Ñ €´€Äì(€€€€€ÍÕ‰µ¥Ð¹¡¥‘‘•¸€ô…Ñ¥Ù•MÑ•À€„ôôÁ…•Ì¹±•¹Ñ €´€Äì(€€€€€¥˜€¡™½ÕÌ¤Á…•Ím…Ñ¥Ù•MÑ•Át¹ÅÕ•ÉåM•±•Ñ½È ‰¥¹ÁÕÐ°Í•±•Ð°‰ÕÑÑ½¸ˆ¤ü¹™½ÕÌ ¤ì(€€€ô((€€€ÍÑ•Á	ÕÑÑ½¹Ì¹™½É…  ¡‰ÕÑÑ½¸°¥¹‘•à¤€ôø‰ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€¥˜€¡¥¹‘•à€ø€À€˜˜€…Ù…±¥‘…Ñ•½¹ÑÉ½°¡¹…µ•%¹ÁÕÐ°ì™½É”èÑÉÕ”°™½ÕÌèÑÉÕ”ô¤¤É•ÑÕÉ¸ì(€€€€€Í¡½ÝMÑ•À¡¥¹‘•à¤ì(€€€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤¤ì(€€€…¹•°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø±½Í•¥…±½œ ¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€‰…¬¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøÍ¡½ÝMÑ•À¡…Ñ¥Ù•MÑ•À€´€Ä¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€¹•áÐ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€¥˜€¡…Ñ¥Ù•MÑ•À€ôôô€À€˜˜€…Ù…±¥‘…Ñ•½¹ÑÉ½°¡¹…µ•%¹ÁÕÐ°ì™½É”èÑÉÕ”°™½ÕÌèÑÉÕ”ô¤¤É•ÑÕÉ¸ì(€€€€€Í¡½ÝMÑ•À¡…Ñ¥Ù•MÑ•À€¬€Ä¤ì(€€€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€™½É´¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰ÍÕ‰µ¥Ðˆ°…Íå¹Œ€¡•Ù•¹Ð¤€ôøì(€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€€€¥˜€¡…Ñ¥Ù•MÑ•À€ðÁ…•Ì¹±•¹Ñ €´€Ä¤ì(€€€€€€€¥˜€¡…Ñ¥Ù•MÑ•À€„ôô€ÀñðÙ…±¥‘…Ñ•½¹ÑÉ½°¡¹…µ•%¹ÁÕÐ°ì™½É”èÑÉÕ”°™½ÕÌèÑÉÕ”ô¤¤Í¡½ÝMÑ•À¡…Ñ¥Ù•MÑ•À€¬€Ä¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€½¹ÍÐÁ…å±½…€ôì(€€€€€€€¹…µ”è¹…µ•%¹ÁÕÐ¹Ù…±Õ”°(€€€€€€€‘•ÍÉ¥ÁÑ¥½¸è‘•ÍÉ¥ÁÑ¥½¹%¹ÁÕÐ¹Ù…±Õ”°(€€€€€€€ÑåÁ”èÑåÁ•M•±•Ð¹Ù…±Õ”°(€€€€€€€ÍÁ…”èÑåÁ•M•±•Ð¹Ù…±Õ”°(€€€€€€€™±½Üè™±½Ý%¹ÁÕÐ¹Ù…±Õ”°(€€€€€€€…Ù…Ñ…Èè¡½Í•¹Ù…Ñ…È°(€€€€€€€…•¹Ðè¡½Í•¹•¹Ð°(€€€€€€€Ý¥‘•ÑÌèl¸¸¹¡½Í•¹]¥‘•ÑÍt°(€€€€€€€¥¹Ñ•É…Ñ¥½¹Ìèl¸¸¹¡½Í•¹%¹Ñ•É…Ñ¥½¹Ít°(€€€€€€€…µ‰¥•¹”è…µ‰¥•¹•M•±•Ð¹Ù…±Õ”°(€€€€€€€‰…­É½Õ¹è‰…­É½Õ¹‘M•±•Ð¹Ù…±Õ”(€€€€€ôì(€€€€€½¹ÍÐÍÕ‰µ¥ÍÍ¥½¸€ô…Ý…¥ÐÉÕ¹½ÉµMÕ‰µ¥ÍÍ¥½¸¡ì(€€€€€€€™½É´°(€€€€€€€ÍÕ‰µ¥Ð°(€€€€€€€ÍÑ…ÑÕÌ°(€€€€€€€µ•ÍÍ…•Ìèì±½…‘¥¹œèµ½‘”€ôôô€‰É•…Ñ”ˆ€ü€‰É•…Ñ¥½¸‘”°•¹Ù¥É½¹¹•µ•¹Ð¸¸¸ˆ€è€‰¹É•¥ÍÑÉ•µ•¹Ð‘ÔÁÉ½™¥°¸¸¸ˆô°(€€€€€€€Ñ…Í¬è€ ¤€ôøµ½‘”€ôôô€‰É•…Ñ”ˆ€üÉ•Á½Í¥Ñ½Éä¹É•…Ñ•AÉ½™¥±”¡Á…å±½…¤€èÉ•Á½Í¥Ñ½Éä¹ÕÁ‘…Ñ•AÉ½™¥±”¡ÁÉ½™¥±”¹¥°Á…å±½…¤(€€€€€ô¤ì(€€€€€¥˜€ …ÍÕ‰µ¥ÍÍ¥½¸¹…•ÁÑ•¤É•ÑÕÉ¸ì(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ôÍÕ‰µ¥ÍÍ¥½¸¹Ù…±Õ”ì(€€€€€¥˜€¡ÍÕ‰µ¥ÍÍ¥½¸¹•ÉÉ½Èñð€…É•ÍÁ½¹Í”ü¹½¬¤ì(€€€€€€€¥˜€¡É•ÍÁ½¹Í”ü¹µ•ÍÍ…”¤Í•Ñ¥•±‘MÑ…Ñ”¡¹…µ•%¹ÁÕÐ°€‰¥¹Ù…±¥ˆ°É•ÍÁ½¹Í”¹µ•ÍÍ…”¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€±½Í•¥…±½œ¡ìÉ•ÍÑ½É•½ÕÌè™…±Í”ô¤ì(€€€€€É•¹‘•ÉAÉ½™¥±•Ì¡É•ÍÁ½¹Í”¹‘…Ñ„¹¥°ÑÉÕ”¤ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€Íå¹]¥‘•ÑA¥­•È ¤ì(€€€ÕÁ‘…Ñ•5½‘Õ±•MÕµµ…Éä ¤ì(€€€Í¡½ÝMÑ•À¡…Ñ¥Ù•MÑ•À°™…±Í”¤ì(€€€½¹ÍÐÑ…É•Ð€ô™½ÕÍQ…É•Ð€ôôô€‰…Ù…Ñ…Èˆ€ü…Ù…Ñ…ÉA¥­•È¹ÅÕ•ÉåM•±•Ñ½È m…É¥„µ¡•­•ô‰ÑÉÕ”‰tœ¤(€€€€€€è™½ÕÍQ…É•Ð€ôôô€‰ÍÁ…”ˆ€üÑåÁ•M•±•Ð(€€€€€€€€è™½ÕÍQ…É•Ð€ôôô€‰Ñ¡•µ”ˆ€ü…•¹ÑA¥­•È¹ÅÕ•ÉåM•±•Ñ½È m…É¥„µ¡•­•ô‰ÑÉÕ”‰tœ¤(€€€€€€€€€€è¹…µ•%¹ÁÕÐì(€€€ÅÕ•Õ•5¥É½Ñ…Í¬  ¤€ôøÑ…É•Ðü¹™½ÕÌ ¤¤ì(€€€É•ÑÕÉ¸‘¥…±½œì(€ô((€™Õ¹Ñ¥½¸½Á•¹•±•Ñ•½¹™¥Éµ…Ñ¥½¸¡ÁÉ½™¥±”¤ì(€€€±½Í•5•¹Ô ¤ì(€€€½¹ÍÐ…¹•°€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µÍ•½¹‘…Éäˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆôô°m•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€‰¹¹Õ±•Èˆô¥t¤ì(€€€½¹ÍÐ½¹™¥É´€ô•±•µ•¹Ð ‰‰ÕÑÑ½¸ˆ°ì±…ÍÍ9…µ”è€‰Øàµ‰ÕÑÑ½¸Øàµ‰ÕÑÑ½¸´µ‘…¹•Èˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÑåÁ”è€‰‰ÕÑÑ½¸ˆôô°m¥½¸ ‰ÑÉ…Í ´Èˆ¤°•±•µ•¹Ð ‰ÍÁ…¸ˆ°ìÑ•áÐè€‰MÕÁÁÉ¥µ•È‘•™¥¹¥Ñ¥Ù•µ•¹Ðˆô¥t¤ì(€€€½¹ÍÐ½¹Ñ•¹Ð€ô•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}½¹™¥É´ˆô°l(€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}‘…¹•Èµ¥½¸ˆô°¥½¸ ‰ÑÉ¥…¹±”µ…±•ÉÐˆ¤¤°(€€€€€•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè1•Ì‘½¹¹••Ì‘ÔÁÉ½™¥°€‘íÁÉ½™¥±”¹¹…µ•ôÍ•É½¹ÐÍÕÁÁÉ¥µ••Ì‘”MÕÁ…‰…Í”•Ð‘Ô…¡”‘”•Ð…ÁÁ…É•¥°¸•ÑÑ”…Ñ¥½¸•ÍÐ¥ÉÉ•Ù•ÉÍ¥‰±”¹€ô¤(€€€t¤ì(€€€‘¥…±½M¡•±° ‰MÕÁÁÉ¥µ•È”ÁÉ½™¥°€üˆ°€‰U¹”½¹™¥Éµ…Ñ¥½¸•ÍÐ¹••ÍÍ…¥É”…Ù…¹ÐÑ½ÕÑ”ÍÕÁÁÉ•ÍÍ¥½¸¸ˆ°½¹Ñ•¹Ð°•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰ØàµÁÉ½™¥±”µ‘¥…±½}}…Ñ¥½¹Ìˆô°m…¹•°°½¹™¥Éµt¤¤ì(€€€…¹•°¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø±½Í•¥…±½œ ¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€½¹™¥É´¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøì(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ôÉ•Á½Í¥Ñ½Éä¹‘•±•Ñ•AÉ½™¥±”¡ÁÉ½™¥±”¹¥¤ì(€€€€€¥˜€ …É•ÍÁ½¹Í”¹½¬¤ì(€€€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€€€€€±½Í•¥…±½œ ¤ì(€€€€€€€É•ÑÕÉ¸ì(€€€€€ô(€€€€€±½Í•¥…±½œ¡ìÉ•ÍÑ½É•½ÕÌè™…±Í”ô¤ì(€€€€€É•¹‘•ÉAÉ½™¥±•Ì¡É•Á½Í¥Ñ½Éä¹…Ñ¥Ù•AÉ½™¥±” ¤ü¹¥ñð€ˆˆ°ÑÉÕ”¤ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€€€ÅÕ•Õ•5¥É½Ñ…Í¬  ¤€ôø…¹•°¹™½ÕÌ ¤¤ì(€ô((€™Õ¹Ñ¥½¸‘½Ý¹±½…‘áÁ½ÉÐ¡ÁÉ½™¥±”¤ì(€€€½¹ÍÐÉ•ÍÁ½¹Í”€ôÉ•Á½Í¥Ñ½Éä¹•áÁ½ÉÑAÉ½™¥±”¡ÁÉ½™¥±”¹¥¤ì(€€€¥˜€ …É•ÍÁ½¹Í”¹½¬¤ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€½¹ÍÐ‰±½ˆ€ô¹•Ü	±½ˆ¡m)M=8¹ÍÑÉ¥¹¥™ä¡É•ÍÁ½¹Í”¹‘…Ñ„°¹Õ±°°€È¥t°ìÑåÁ”è€‰…ÁÁ±¥…Ñ¥½¸½©Í½¸ˆô¤ì(€€€½¹ÍÐÕÉ°€ôUI0¹É•…Ñ•=‰©•ÑUI0¡‰±½ˆ¤ì(€€€½¹ÍÐ…¹¡½È€ô•±•µ•¹Ð ‰„ˆ°ì…ÑÑÉ¥‰ÕÑ•Ìèì¡É•˜èÕÉ°°‘½Ý¹±½…è•Ñ¡½¹”´‘íÁÉ½™¥±”¹¹…µ”¹Ñ½1½Ý•É…Í” ¤¹É•Á±…” ½my„µèÀ´åt¬½œ°€ˆ´ˆ¤ñð€‰ÁÉ½™¥°‰ô¹©Í½¹€ôô¤ì(€€€‘½Õµ•¹Ð¹‰½‘ä¹…ÁÁ•¹¡…¹¡½È¤ì(€€€…¹¡½È¹±¥¬ ¤ì(€€€…¹¡½È¹É•µ½Ù” ¤ì(€€€UI0¹É•Ù½­•=‰©•ÑUI0¡ÕÉ°¤ì(€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ô€‰áÁ½ÉÐ‘ÔÁÉ½™¥°ÁÉ•Ð¸ˆì(€ô((€™Õ¹Ñ¥½¸ÉÕ¹5•¹ÕÑ¥½¸¡…Ñ¥½¹%¤ì(€€€½¹ÍÐÁÉ½™¥±”€ôÁÉ½™¥±•Ì¹™¥¹ ¡•¹ÑÉä¤€ôø•¹ÑÉä¹¥€ôôôµ•¹ÕAÉ½™¥±•%¤ì(€€€¥˜€ …ÁÉ½™¥±”¤É•ÑÕÉ¸ì(€€€¥˜€¡…Ñ¥½¹%€ôôô€‰É•¹…µ”ˆ¤½Á•¹‘¥Ñ½È ‰•‘¥Ðˆ°ÁÉ½™¥±”°€‰¹…µ”ˆ¤ì(€€€•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰•‘¥Ðˆ¤½Á•¹‘¥Ñ½È ‰•‘¥Ðˆ°ÁÉ½™¥±”°€‰¹…µ”ˆ¤ì(€€€•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰…Ù…Ñ…Èˆ¤½Á•¹‘¥Ñ½È ‰•‘¥Ðˆ°ÁÉ½™¥±”°€‰…Ù…Ñ…Èˆ¤ì(€€€•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰ÍÁ…”ˆ¤½Á•¹‘¥Ñ½È ‰•‘¥Ðˆ°ÁÉ½™¥±”°€‰ÍÁ…”ˆ¤ì(€€€•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰Ñ¡•µ”ˆ¤½Á•¹‘¥Ñ½È ‰•‘¥Ðˆ°ÁÉ½™¥±”°€‰Ñ¡•µ”ˆ¤ì(€€€•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰•áÁ½ÉÐˆ¤ì±½Í•5•¹Ô ¤ì‘½Ý¹±½…‘áÁ½ÉÐ¡ÁÉ½™¥±”¤ìô(€€€•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰‘ÕÁ±¥…Ñ”ˆ¤ì(€€€€€±½Í•5•¹Ô ¤ì(€€€€€½¹ÍÐÉ•ÍÁ½¹Í”€ôÉ•Á½Í¥Ñ½Éä¹‘ÕÁ±¥…Ñ•AÉ½™¥±”¡ÁÉ½™¥±”¹¥¤ì(€€€€€¥˜€¡É•ÍÁ½¹Í”¹½¬¤É•¹‘•ÉAÉ½™¥±•Ì¡É•ÍÁ½¹Í”¹‘…Ñ„¹¥°ÑÉÕ”¤ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€ô•±Í”¥˜€¡…Ñ¥½¹%€ôôô€‰‘•±•Ñ”ˆ¤½Á•¹•±•Ñ•½¹™¥Éµ…Ñ¥½¸¡ÁÉ½™¥±”¤ì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸…Ñ¥Ù…Ñ”¡¥¹‘•à€ôÍ•±•Ñ•‘%¹‘•à¤ì(€€€¥˜€ …ÁÉ½™¥±•Ì¹±•¹Ñ ñð‘•ÍÑÉ½å•¤É•ÑÕÉ¸ì(€€€½¹ÍÐÑ½­•¸€ô€¬­…Ñ¥Ù…Ñ¥½¸ì(€€€Í•±•ÑAÉ•Ù¥•Ü¡¥¹‘•à¤ì(€€€½¹ÍÐÁÉ½™¥±”€ôÁÉ½™¥±•ÍmÍ•±•Ñ•‘%¹‘•átì(€€€¥˜€¡ÁÉ½™¥±”¹±½­•¤ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ô€‰AÉ½™¥°Ù•ÉÉ½Õ¥±±”€èÙ½Ì‘½¹¹••ÌÉ•ÍÑ•¹Ð¥¹Ñ…Ñ•Ì¸ˆì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€½¹ÍÐÍ•±•Ñ•€ôÉ•Á½Í¥Ñ½Éä¹Í•±•ÑAÉ½™¥±”¡ÁÉ½™¥±”¹¥¤ì(€€€¥˜€ …Í•±•Ñ•¹½¬¤ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÍ•±•Ñ•¹µ•ÍÍ…”ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€ÍÕÉ™…”¹±…ÍÍ1¥ÍÐ¹…‘ ‰¥Ìµ±…Õ¹¡¥¹œˆ¤ì(€€€ÍÕÉ™…”¹Í•ÑÑÑÉ¥‰ÕÑ” ‰…É¥„µ‰ÕÍäˆ°€‰ÑÉÕ”ˆ¤ì(€€€•¹Ñ•É	ÕÑÑ½¸¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€ÑÉäì(€€€€€±•Ð…Ñ¥Ù…Ñ¥½¹I•ÍÕ±Ðì(€€€€€½¹ÍÐÉ•‘Õ•‘5½Ñ¥½¸€ô±½‰…±Q¡¥Ì¹µ…Ñ¡5•‘¥„ü¸ ˆ¡ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸èÉ•‘Õ”¤ˆ¤¹µ…Ñ¡•Ìì(€€€€€¥˜€ …É•‘Õ•‘5½Ñ¥½¸€˜˜ÑåÁ•½˜‘½Õµ•¹Ð¹ÍÑ…ÉÑY¥•ÝQÉ…¹Í¥Ñ¥½¸€ôôô€‰™Õ¹Ñ¥½¸ˆ¤ì(€€€€€€€½¹ÍÐÑÉ…¹Í¥Ñ¥½¸€ô‘½Õµ•¹Ð¹ÍÑ…ÉÑY¥•ÝQÉ…¹Í¥Ñ¥½¸¡…Íå¹Œ€ ¤€ôøì…Ñ¥Ù…Ñ¥½¹I•ÍÕ±Ð€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹½¹M•±•Ðü¸¡Í•±•Ñ•¹‘…Ñ„¤ìô¤ì(€€€€€€€…Ý…¥ÐÑÉ…¹Í¥Ñ¥½¸¹™¥¹¥Í¡•ì(€€€€€ô•±Í”ì(€€€€€€€…Ñ¥Ù…Ñ¥½¹I•ÍÕ±Ð€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹½¹M•±•Ðü¸¡Í•±•Ñ•¹‘…Ñ„¤ì(€€€€€ô(€€€€€¥˜€ …‘•ÍÑÉ½å•€˜˜Ñ½­•¸€ôôô…Ñ¥Ù…Ñ¥½¸¤Í•ÑÑ±•Ñ¥Ù…Ñ¥½¹I•ÍÕ±Ð¡…Ñ¥Ù…Ñ¥½¹I•ÍÕ±Ð°ìÍÕÉ™…”°•¹Ñ•É	ÕÑÑ½¸°ÍÑ…ÑÕÌô¤ì(€€€ô…Ñ ì(€€€€€¥˜€ …‘•ÍÑÉ½å•€˜˜Ñ½­•¸€ôôô…Ñ¥Ù…Ñ¥½¸¤Í•ÑÑ±•Ñ¥Ù…Ñ¥½¹I•ÍÕ±Ð¡ì½¬è™…±Í”°µ•ÍÍ…”è€‰0•¹Ù¥É½¹¹•µ•¹Ð¸„Á…ÌÁÔ•ÑÉ”½ÕÙ•ÉÐ¸ˆô°ìÍÕÉ™…”°•¹Ñ•É	ÕÑÑ½¸°ÍÑ…ÑÕÌô¤ì(€€€ô(€ô((€±¥ÍÐ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰­•å‘½Ý¸ˆ°€¡•Ù•¹Ð¤€ôøì(€€€¥˜€¡l‰ÉÉ½Ý1•™Ðˆ°€‰ÉÉ½ÝI¥¡Ðˆ°€‰ÉÉ½ÝUÀˆ°€‰ÉÉ½Ý½Ý¸ˆ°€‰!½µ”ˆ°€‰¹‰t¹¥¹±Õ‘•Ì¡•Ù•¹Ð¹­•ä¤¤ì(€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€€€Í•±•ÑAÉ•Ù¥•Ü¡¹•áÑAÉ½™¥±•%¹‘•à¡ÁÉ½™¥±•Ì¹±•¹Ñ °Í•±•Ñ•‘%¹‘•à°•Ù•¹Ð¹­•ä¤°ÑÉÕ”¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰¹Ñ•Èˆ¤ì(€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€€€…Ñ¥Ù…Ñ”¡Í•±•Ñ•‘%¹‘•à¤ì(€€€ô(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€ˆ€ˆ¤ì(€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€€€Í•±•ÑAÉ•Ù¥•Ü¡Í•±•Ñ•‘%¹‘•à°ÑÉÕ”¤ì(€€€ô(€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€•¹Ñ•É	ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø…Ñ¥Ù…Ñ”¡Í•±•Ñ•‘%¹‘•à¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€É•…Ñ•	ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø½Á•¹‘¥Ñ½È ‰É•…Ñ”ˆ¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€•µÁÑåÉ•…Ñ•	ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôø½Á•¹‘¥Ñ½È ‰É•…Ñ”ˆ¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€µ•¹Õ	ÕÑÑ½¹Ì¹™½É…  ¡‰ÕÑÑ½¸¤€ôø‰ÕÑÑ½¸¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€ ¤€ôøÉÕ¹5•¹ÕÑ¥½¸¡‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹ÁÉ½™¥±•Ñ¥½¸¤°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤¤ì(€Í¥¹=ÕÐ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°…Íå¹Œ€ ¤€ôøì(€€€Í¥¹=ÕÐ¹±…ÍÍ1¥ÍÐ¹…‘ ‰¥Ìµ±½…‘¥¹œˆ¤ì(€€€Í¥¹=ÕÐ¹‘¥Í…‰±•€ôÑÉÕ”ì(€€€½¹ÍÐÉ•ÍÁ½¹Í”€ô…Ý…¥Ð½ÁÑ¥½¹Ì¹½¹M¥¹=ÕÐü¸ ¤ì(€€€¥˜€ …‘•ÍÑÉ½å•€˜˜É•ÍÁ½¹Í”€˜˜€…É•ÍÁ½¹Í”¹½¬¤ì(€€€€€Í¥¹=ÕÐ¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ‰¥Ìµ±½…‘¥¹œˆ¤ì(€€€€€Í¥¹=ÕÐ¹‘¥Í…‰±•€ô™…±Í”ì(€€€€€ÍÑ…ÑÕÌ¹Ñ•áÑ½¹Ñ•¹Ð€ôÉ•ÍÁ½¹Í”¹µ•ÍÍ…”ì(€€€ô(€ô°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€±½‰…±Q¡¥Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•Èü¸ ‰½¹±¥¹”ˆ°ÕÁ‘…Ñ•½¹¹•Ñ¥Ù¥Ñä°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì(€±½‰…±Q¡¥Ì¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•Èü¸ ‰½™™±¥¹”ˆ°ÕÁ‘…Ñ•½¹¹•Ñ¥Ù¥Ñä°±¥ÍÑ•¹•É=ÁÑ¥½¹Ì¤ì((€É•¹‘•ÉAÉ½™¥±•Ì¡É•Á½Í¥Ñ½Éä¹…Ñ¥Ù•AÉ½™¥±” ¤ü¹¥ñð€ˆˆ¤ì(€½¹ÍÐÉ•±•…Í•±½¬€ô±½­5…¹…•Èü¹ÍÕ‰ÍÉ¥‰”ü¸¡É•™É•Í¡±½¬¤ñð€  ¤€ôøíô¤ì(€½¹ÍÐÉ•±•…Í•±½Õ‘MÑ…ÑÕÌ€ô±½Õ‘Må¹Œü¹ÍÕ‰ÍÉ¥‰”ü¸¡ÕÁ‘…Ñ•½¹¹•Ñ¥Ù¥Ñä¤ñð€  ¤€ôøíô¤ì(€¥˜€ …±½­5…¹…•È¤É•™É•Í¡±½¬ ¤ì(€ÅÕ•Õ•5¥É½Ñ…Í¬  ¤€ôøì¥˜€ …‘•ÍÑÉ½å•€˜˜ÁÉ½™¥±•Ì¹±•¹Ñ ¤…É‘ÍmÍ•±•Ñ•‘%¹‘•átü¹™½ÕÌ ¤ìô¤ì((€™Õ¹Ñ¥½¸‘•ÍÑÉ½ä ¤ì(€€€¥˜€¡‘•ÍÑÉ½å•¤É•ÑÕÉ¸™…±Í”ì(€€€‘•ÍÑÉ½å•€ôÑÉÕ”ì(€€€…Ñ¥Ù…Ñ¥½¸€¬ô€Äì(€€€É•±•…Í•±½¬ ¤ì(€€€É•±•…Í•±½Õ‘MÑ…ÑÕÌ ¤ì(€€€±½Í•5•¹Ô ¤ì(€€€±½Í•¥…±½œ¡ìÉ•ÍÑ½É•½ÕÌè™…±Í”ô¤ì(€€€‘¥…±½]¥¹‘½Ü¹‘•ÍÑÉ½ä ¤ì(€€€…‰½ÉÑ½¹ÑÉ½±±•È¹…‰½ÉÐ ¤ì(€€€ÍÕÉ™…”¹É•µ½Ù” ¤ì(€€€É½½Ð¹É•µ½Ù•ÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ•¹ÑÉäµÍÑ…Ñ”ˆ¤ì(€€€¥˜€¡‘½Õµ•¹Ð¹‘½Õµ•¹Ñ±•µ•¹Ð¹‘…Ñ…Í•Ð¹•¹ÑÉä€ôôô€‰ÁÉ½™¥±•Ìˆ¤‘•±•Ñ”‘½Õµ•¹Ð¹‘½Õµ•¹Ñ±•µ•¹Ð¹‘…Ñ…Í•Ð¹•¹ÑÉäì(€€€É•ÑÕÉ¸ÑÉÕ”ì(€ô((€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì(€€€‘•ÍÑÉ½ä°(€€€™½ÕÌè€ ¤€ôøÁÉ½™¥±•Ì¹±•¹Ñ €˜˜…É‘ÍmÍ•±•Ñ•‘%¹‘•átü¹™½ÕÌ ¤°(€€€Í•±•Ñ•‘%è€ ¤€ôøÁÉ½™¥±•ÍmÍ•±•Ñ•‘%¹‘•átü¹¥ñð¹Õ±°(€ô¤ì)ô(