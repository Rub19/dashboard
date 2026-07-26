import { createDailyBriefing } from "../data/daily-briefing.mjs";
import { element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { enhanceForm, formField, runFormSubmission, setFieldState, validateControl } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { computeFloatingPosition, getLayerManager } from "../ui/layer-manager.mjs";
import { createWindowController } from "../ui/window-system.mjs";
import { createSelect } from "../ui/select.mjs";

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
      Object.freeze({ id: "weather", label: "Meteo", icon: "cloud-sun", value: weather?.value || "Non connectee", detail: weather?.detail || "Configurer", state: weather?.state || "unavailable" }),
      Object.freeze({ id: "calendar", label: "Agenda", icon: "calendar-days", value: events?.value || "Aucun evenement", detail: events?.detail || "Aujourd'hui", state: events?.state || "empty" }),
      Object.freeze({ id: "music", label: "Musique", icon: "audio-lines", value: music?.value || "Non connectee", detail: music?.detail || "Spotify", state: music?.state || "unavailable" }),
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
  const previewSignals = element("div", { className: "v8-profile-preview__signals" });
  const previewMeta = element("div", { className: "v8-profile-preview__meta" });
  const previewWidgets = element("div", { className: "v8-profile-preview__widgets" });
  const previewLive = element("div", { className: "v8-profile-preview__live-grid", attributes: { "aria-label": "Signaux en direct" } });
  const liveTime = element("time", { className: "v8-profile-preview__time", dataset: { liveWidget: "clock", liveKind: "clock" } });
  const liveDate = element("span", { className: "v8-profile-preview__date" });
  const liveCloud = element("span", { className: "v8-profile-preview__cloud" });
  const enterLabel = element("span");
  const enterButton = element("button", { className: "v8-button v8-button--primary v8-profile-select__enter", attributes: { type: "button" } }, [icon("arrow-right"), enterLabel]);

  const preview = element("section", { className: "v8-profile-preview", attributes: { "aria-label": "Apercu vivant de l'environnement" } }, [
    element("div", { className: "v8-profile-preview__ambient", attributes: { "aria-hidden": "true" } }, [element("span", { text: "8" }), element("i"), element("i")]),
    element("header", { className: "v8-profile-preview__chrome" }, [
      element("div", { className: "v8-profile-preview__eyebrow" }, [icon("orbit"), element("span", { text: "ENVIRONNEMENT EN DIRECT" })]),
      element("div", { className: "v8-profile-preview__clock" }, [liveTime, liveDate]),
      element("div", { className: "v8-profile-preview__connectivity" }, [icon("cloud"), liveCloud])
    ]),
    element("div", { className: "v8-profile-preview__identity" }, [
      previewAvatarHost,
      element("div", { className: "v8-profile-preview__copy" }, [
        element("div", { className: "v8-profile-preview__presence" }, [previewType, previewStatus, previewLastActive]),
        previewName,
        previewDescription
      ])
    ]),
    previewMeta,
    previewLive,
    element("footer", { className: "v8-profile-preview__footer" }, [
      element("div", { className: "v8-profile-preview__widget-group" }, [
        element("div", { className: "v8-profile-preview__section-title" }, [element("span", { text: "Modules prets" }), element("small", { text: "Charges a l'ouverture" })]),
        previewWidgets
      ]),
      previewSignals
    ])
  ]);

  const list = element("div", { className: "v8-profile-list", attributes: { role: "listbox", "aria-label": "Environnements ETHONE", "aria-orientation": "vertical" } });
  const createButton = element("button", { className: "v8-button v8-button--secondary v8-profile-browser__create", attributes: { type: "button" } }, [icon("plus"), element("span", { text: "Nouvel environnement" })]);
  const browserPanel = element("aside", { className: "v8-profile-browser", attributes: { "aria-label": "Selecteur d'environnements" } }, [
    element("div", { className: "v8-profile-browser__header" }, [
      element("div", {}, [element("span", { className: "v8-entry__eyebrow", text: "VOS UNIVERS" }), element("div", { className: "v8-profile-browser__title" }, [element("h2", { text: "Environnements" }), profileCount])]),
      createButton
    ]),
    list,
    element("div", { className: "v8-profile-browser__footnote" }, [icon("mouse-pointer-2"), element("span", { text: "Survolez pour explorer, double-cliquez pour entrer" })])
  ]);

  const menu = element("div", { className: "v8-profile-menu", attributes: { role: "menu", "aria-label": "Actions du profil", hidden: true } });
  const menuButtons = MENU_ACTIONS.map((action) => {
    const button = element("button", {
      className: `v8-profile-menu__item${action.danger ? " is-danger" : ""}`,
      attributes: { type: "button", role: "menuitem" },
      dataset: { profileAction: action.id }
    }, [icon(action.icon), element("span", { text: action.label })]);
    menu.append(button);
    return button;
  });

  const dialogLayer = element("div", { className: "v8-profile-dialog-layer", attributes: { hidden: true } });
  const signOut = element("button", { className: "v8-button v8-button--outline", attributes: { type: "button" } }, [icon("log-out"), element("span", { text: "Changer de compte" })]);
  const emptyCreateButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" } }, [icon("plus"), element("span", { text: "Creer un environnement" })]);
  const profileEmpty = emptyState({
    iconName: "user-round-plus",
    eyebrow: "Premier environnement",
    title: "Composez votre premier univers",
    description: "Un environnement rassemble votre Space, votre rythme et les modules qui comptent.",
    actions: [emptyCreateButton],
    className: "v8-profile-empty"
  });

  const workspace = element("div", { className: "v8-profile-select__workspace" }, [preview, browserPanel]);
  const surface = element("section", { className: "v8-entry v8-entry--profiles", attributes: { "aria-label": "Selection de l'environnement" } }, [
    element("div", { className: "v8-entry__signal-field", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
    element("div", { className: "v8-entry__frame v8-profile-select__frame" }, [
      element("header", { className: "v8-entry__topbar" }, [
        element("div", { className: "v8-entry__brand" }, [
          element("span", { className: "v8-entry__mark", text: "E", attributes: { "aria-hidden": "true" } }),
          element("span", { className: "v8-entry__wordmark", text: "ETHONE" }),
          element("span", { className: "v8-badge", text: "ENVIRONMENTS" })
        ]),
        signOut
      ]),
      element("main", { className: "v8-profile-select__main" }, [
        element("div", { className: "v8-profile-select__intro" }, [
          element("div", {}, [element("span", { className: "v8-entry__eyebrow", text: "ETHONE ENVIRONMENTS" }), element("h1", { text: "Quel univers ouvrez-vous ?" })]),
          element("p", { text: "Chaque environnement restaure son Space, son Flow, ses signaux et son rythme." })
        ]),
        workspace,
        profileEmpty,
        status
      ]),
      element("footer", { className: "v8-profile-select__footer" }, [
        element("div", { className: "v8-profile-select__hint" }, [icon("keyboard"), element("span", { text: "Fleches pour parcourir / Entree pour ouvrir / Menu pour gerer" })]),
        enterButton
      ]),
      menu,
      dialogLayer
    ])
  ]);

  root.append(surface);

  function profileModels() {
    return makeModels(repository.listProfiles());
  }

  function refreshClock(snapshot = null) {
    if (destroyed) return;
    const date = snapshot?.timestamp ? new Date(snapshot.timestamp) : now();
    const clock = formatEnvironmentClock(date);
    const time = snapshot?.time || clock.time;
    if (presence) presence.transitionText(liveTime, time, { kind: "clock" });
    else liveTime.textContent = time;
    liveTime.dateTime = date.toISOString();
    if (presence) presence.transitionText(liveDate, clock.date, { kind: "clock" });
    else liveDate.textContent = clock.date;
  }

  function updateConnectivity() {
    const profile = profiles[selectedIndex];
    if (!profile) return;
    const offline = globalThis.navigator?.onLine === false;
    const syncState = cloudSync?.status?.() || {};
    const values = { loading: "Connexion Supabase", saving: "Synchronisation", saved: "Supabase synchronise", retrying: "Nouvelle tentative", error: "Erreur Supabase", expired: "Session expiree" };
    const nextValue = offline ? "Hors ligne" : values[syncState.syncStatus] || profile.live.cloud.value;
    if (presence) presence.transitionText(liveCloud, nextValue, { kind: "signal" });
    else liveCloud.textContent = nextValue;
    liveCloud.dataset.state = offline ? "offline" : syncState.syncStatus || profile.live.cloud.state;
  }

  function animatePreview() {
    presence?.transitionSurface(preview, { kind: "profile" });
  }

  function selectPreview(index, focusCard = false) {
    if (!profiles.length || destroyed) return;
    selectedIndex = Math.min(profiles.length - 1, Math.max(0, index));
    const profile = profiles[selectedIndex];
    document.documentElement.dataset.accent = profile.accent;
    surface.dataset.tone = profile.tone;
    preview.dataset.ambience = profile.environment.ambience;
    preview.dataset.background = profile.environment.background;
    cards.forEach((card, cardIndex) => {
      const selected = cardIndex === selectedIndex;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-selected", String(selected));
      card.tabIndex = selected ? 0 : -1;
    });
    previewAvatarHost.replaceChildren(avatarNode(profile.avatar, "v8-profile-preview__avatar-content", "eager"));
    previewType.textContent = profile.typeLabel;
    previewName.textContent = profile.name;
    previewDescription.textContent = profile.description;
    previewStatus.textContent = profile.statusLabel;
    previewLastActive.textContent = profile.lastActiveLabel;
    previewMeta.replaceChildren(
      metaItem("panels-top-left", "Space", profile.spaceLabel),
      metaItem("workflow", "Flow", profile.flowLabel),
      metaItem("palette", "Ambiance", profile.ambienceLabel),
      metaItem("image", "Fond", profile.backgroundLabel)
    );
    previewWidgets.replaceChildren(...profile.favoriteWidgets.map(widgetChip));
    previewSignals.replaceChildren(...profile.signals.map(signalRow));
    previewLive.replaceChildren(...profile.live.signals.map(liveSignalNode));
    enterButton.replaceChildren(icon(profile.locked ? "lock-keyhole" : "arrow-right"), enterLabel);
    enterLabel.textContent = profile.locked ? "Continuer avec verification" : `Entrer dans ${profile.name}`;
    status.textContent = profile.locked ? "Ce profil necessite un deverrouillage." : "";
    updateConnectivity();
    animatePreview();
    presence?.revealWidgets(preview);
    if (focusCard) cards[selectedIndex]?.focus();
    refreshIcons();
  }

  function cardNode(profile, index) {
    const menuButton = element("button", {
      className: "v8-icon-button v8-profile-card__menu",
      attributes: { type: "button", "aria-label": `Gerer ${profile.name}`, "aria-haspopup": "menu", "aria-expanded": "false" }
    }, icon("ellipsis"));
    const card = element("div", {
      className: "v8-profile-card",
      attributes: { role: "option", "aria-selected": "false", tabindex: "-1", "aria-label": `${profile.name}${profile.locked ? ", verrouille" : ""}` },
      dataset: { profileId: profile.id, accent: profile.accent, tone: profile.tone }
    }, [
      element("div", { className: "v8-profile-card__avatar-wrap" }, [avatarNode(profile.avatar, "v8-profile-card__avatar")]),
      element("div", { className: "v8-profile-card__body" }, [
        element("div", { className: "v8-profile-card__headline" }, [element("strong", { text: profile.name, attributes: { translate: "no" } }), element("span", { text: profile.statusLabel })]),
        element("span", { className: "v8-profile-card__context", text: `${profile.spaceLabel} / ${profile.flowLabel}` }),
        element("div", { className: "v8-profile-card__facts" }, [
          element("span", {}, [icon("layout-grid"), element("span", { text: `${profile.widgetCount} widgets` })]),
          element("span", {}, [icon("brain"), element("span", { text: "Brain pret" })]),
          element("span", {}, [icon("clock-3"), element("span", { text: profile.lastActiveLabel })])
        ])
      ]),
      element("div", { className: "v8-profile-card__aside" }, [element("span", { className: "v8-profile-card__swatch", attributes: { "aria-label": `Theme ${profile.themeLabel}` } }), menuButton])
    ]);
    card.addEventListener("pointerenter", () => selectPreview(index), listenerOptions);
    card.addEventListener("focus", () => selectPreview(index), listenerOptions);
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      selectPreview(index, true);
    }, listenerOptions);
    card.addEventListener("dblclick", (event) => {
      if (event.target.closest("button")) return;
      activate(index);
    }, listenerOptions);
    card.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      selectPreview(index);
      openMenu(profile.id, menuButton, { x: event.clientX, y: event.clientY });
    }, listenerOptions);
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      selectPreview(index);
      openMenu(profile.id, menuButton);
    }, listenerOptions);
    return card;
  }

  function renderProfiles(preferredId = "", focusSelected = false) {
    profiles = profileModels();
    const fallbackId = profiles[selectedIndex]?.id || repository.activeProfile()?.id || "";
    const nextIndex = profiles.findIndex((profile) => profile.id === (preferredId || fallbackId));
    selectedIndex = nextIndex >= 0 ? nextIndex : 0;
    cards = profiles.map(cardNode);
    list.replaceChildren(...cards);
    profileCount.textContent = String(profiles.length).padStart(2, "0");
    workspace.hidden = profiles.length === 0;
    profileEmpty.hidden = profiles.length > 0;
    enterButton.hidden = profiles.length === 0;
    if (profiles.length) selectPreview(selectedIndex, focusSelected);
    refreshIcons();
  }

  function closeMenu({ restoreFocus = false } = {}) {
    if (menu.hidden) return;
    menuRegistration?.release?.({ restoreFocus });
    menuRegistration = null;
    menu.hidden = true;
    menu.style.removeProperty("left");
    menu.style.removeProperty("top");
    menu.style.removeProperty("max-height");
    delete menu.dataset.placement;
    menuTrigger?.setAttribute("aria-expanded", "false");
    if (restoreFocus) menuTrigger?.focus();
    menuTrigger = null;
    menuProfileId = "";
  }

  function openMenu(profileId, trigger, point = null) {
    closeMenu();
    menuProfileId = profileId;
    menuTrigger = trigger;
    trigger.setAttribute("aria-expanded", "true");
    menuButtons.find((button) => button.dataset.profileAction === "delete").disabled = profiles.length <= 1;
    menu.hidden = false;
    const anchor = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const position = computeFloatingPosition({
      anchor,
      point: point ? { x: point.x - menuRect.width, y: point.y } : null,
      floating: menuRect,
      viewport: { width: globalThis.innerWidth, height: globalThis.innerHeight },
      preferred: "bottom-end"
    });
    menu.dataset.placement = position.placement;
    menu.style.left = `${position.x}px`;
    menu.style.top = `${position.y}px`;
    menu.style.maxHeight = `${position.maxHeight}px`;
    menuRegistration = layerManager.register({
      element: menu,
      boundary: menu,
      anchor: trigger,
      returnFocus: trigger,
      kind: "popover",
      closeOnEscape: true,
      closeOnOutside: true,
      closeOnScroll: true,
      closeOnResize: true,
      closeOnTab: true,
      rovingSelector: "button:not([disabled])",
      onDismiss: (reason) => closeMenu({ restoreFocus: reason === "escape" || reason === "tab" })
    });
    refreshIcons();
    menuButtons[0]?.focus();
  }

  function closeDialog({ restoreFocus = true } = {}) {
    if (dialogLayer.hidden || !dialogWindow.isOpen()) return;
    releaseDialogForm();
    releaseDialogForm = () => {};
    surface.classList.remove("has-profile-dialog");
    dialogWindow.close({ restoreFocus });
  }

  function dialogShell(title, description, content, actions) {
    const closeButton = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Fermer" } }, icon("x"));
    const dialog = element("section", { className: "v8-profile-dialog", attributes: { role: "dialog", "aria-modal": "true", "aria-labelledby": "v8-profile-dialog-title" } }, [
      element("header", { className: "v8-profile-dialog__header" }, [
        element("div", { className: "v8-profile-dialog__identity" }, [
          element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
          element("div", {}, [element("span", { className: "v8-entry__eyebrow", text: "ENVIRONNEMENT ETHONE" }), element("h2", { id: "v8-profile-dialog-title", text: title }), element("p", { text: description })])
        ]),
        closeButton
      ]),
      content,
      actions
    ]);
    closeButton.addEventListener("click", () => closeDialog(), listenerOptions);
    dialogLayer.replaceChildren(dialog);
    dialogLayer.hidden = false;
    surface.classList.add("has-profile-dialog");
    refreshIcons();
    dialogWindow.open(dialogLayer, {
      initialFocus: closeButton,
      modal: true,
      retain: true,
      onAfterClose: () => dialogLayer.replaceChildren()
    });
    return dialog;
  }

  function openEditor(mode, profile = null, focusTarget = "name") {
    closeMenu();
    let chosenAccent = profile?.accent || "mint";
    let chosenAvatar = profile?.avatar.kind === "image" ? profile.name.slice(0, 1).toUpperCase() : (profile?.avatar.value || "E");
    let chosenWidgets = new Set(profile?.environment.widgets?.length ? profile.environment.widgets : WIDGETS_BY_TYPE[profile?.type || "personal"]);
    const chosenIntegrations = new Set(profile?.environment.integrations || []);
    let widgetsTouched = false;
    let activeStep = focusTarget === "space" || focusTarget === "theme" ? 1 : 0;
    const nameInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", required: true, value: profile?.name || "", placeholder: "Nom du profil", autocomplete: "off" } });
    const descriptionInput = element("textarea", { className: "v8-input v8-profile-dialog__textarea", attributes: { maxlength: "180", rows: "3", placeholder: "Decrivez cet environnement" } }, profile?.description || "");
    const typeSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Space principal" } }, Object.entries(TYPE_LABELS).map(([value, label]) => optionNode(value, label)));
    typeSelect.value = profile?.type || "personal";
    const flowInput = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", value: profile?.flowLabel || "Essentiel", placeholder: "Flow principal" } });
    const ambienceSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Ambiance" } }, Object.entries(AMBIENCE_LABELS).map(([value, label]) => optionNode(value, label)));
    ambienceSelect.value = profile?.environment.ambience || "balanced";
    const backgroundSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Fond" } }, Object.entries(BACKGROUND_LABELS).map(([value, label]) => optionNode(value, label)));
    backgroundSelect.value = profile?.environment.background || "signal";
    const avatarPicker = element("div", { className: "v8-profile-dialog__avatar-picker", attributes: { role: "radiogroup", "aria-label": "Avatar" } });
    const accentPicker = element("div", { className: "v8-profile-dialog__accent-picker", attributes: { role: "radiogroup", "aria-label": "Theme" } });
    const widgetPicker = element("div", { className: "v8-profile-dialog__module-picker", attributes: { role: "group", "aria-label": "Widgets" } });
    const integrationPicker = element("div", { className: "v8-profile-dialog__module-picker", attributes: { role: "group", "aria-label": "Integrations" } });
    const setupSummary = element("p", { className: "v8-profile-dialog__summary" });

    AVATAR_CHOICES.forEach((choice) => {
      const button = element("button", { className: "v8-profile-dialog__avatar-choice", text: choice, attributes: { type: "button", role: "radio", "aria-checked": String(choice === chosenAvatar), "aria-label": `Avatar ${choice}`, tabindex: choice === chosenAvatar ? "0" : "-1" } });
      button.addEventListener("click", () => {
        chosenAvatar = choice;
        [...avatarPicker.children].forEach((node) => {
          node.setAttribute("aria-checked", String(node === button));
          node.tabIndex = node === button ? 0 : -1;
        });
      }, listenerOptions);
      avatarPicker.append(button);
    });

    Object.entries(ACCENT_LABELS).forEach(([accent, label]) => {
      const button = element("button", { className: "v8-profile-dialog__accent-choice", attributes: { type: "button", role: "radio", "aria-checked": String(accent === chosenAccent), "aria-label": label, tabindex: accent === chosenAccent ? "0" : "-1" }, dataset: { accent } }, [element("span"), element("small", { text: label })]);
      button.addEventListener("click", () => {
        chosenAccent = accent;
        [...accentPicker.children].forEach((node) => {
          node.setAttribute("aria-checked", String(node === button));
          node.tabIndex = node === button ? 0 : -1;
        });
      }, listenerOptions);
      accentPicker.append(button);
    });

    function updateModuleSummary() {
      const summary = `${chosenWidgets.size} widgets / ${chosenIntegrations.size} integration${chosenIntegrations.size === 1 ? "" : "s"} / ${AMBIENCE_LABELS[ambienceSelect.value]}`;
      if (presence) presence.transitionText(setupSummary, summary, { kind: "metric" });
      else setupSummary.textContent = summary;
    }

    function syncWidgetPicker() {
      [...widgetPicker.children].forEach((button) => button.setAttribute("aria-checked", String(chosenWidgets.has(button.dataset.choiceId))));
      updateModuleSummary();
    }

    Object.entries(WIDGET_CATALOG).forEach(([id, widget]) => {
      const button = element("button", { className: "v8-profile-dialog__module-choice", attributes: { type: "button", role: "checkbox", "aria-checked": String(chosenWidgets.has(id)) }, dataset: { choiceId: id } }, [icon(widget.icon), element("span", { text: widget.label }), icon("check")]);
      button.addEventListener("click", () => {
        widgetsTouched = true;
        const selected = !chosenWidgets.has(id);
        if (selected) chosenWidgets.add(id);
        else chosenWidgets.delete(id);
        syncWidgetPicker();
        presence?.signalActivity?.(button, "widget", { phase: selected ? "enter" : "update" });
      }, listenerOptions);
      widgetPicker.append(button);
    });

    INTEGRATIONS.forEach((integration) => {
      const button = element("button", { className: "v8-profile-dialog__module-choice", attributes: { type: "button", role: "checkbox", "aria-checked": String(chosenIntegrations.has(integration.id)) }, dataset: { choiceId: integration.id } }, [icon(integration.icon), element("span", { text: integration.label }), icon("check")]);
      button.addEventListener("click", () => {
        if (chosenIntegrations.has(integration.id)) chosenIntegrations.delete(integration.id);
        else chosenIntegrations.add(integration.id);
        button.setAttribute("aria-checked", String(chosenIntegrations.has(integration.id)));
        updateModuleSummary();
      }, listenerOptions);
      integrationPicker.append(button);
    });

    typeSelect.addEventListener("change", () => {
      if (!widgetsTouched) {
        chosenWidgets = new Set(WIDGETS_BY_TYPE[typeSelect.value] || WIDGETS_BY_TYPE.personal);
        syncWidgetPicker();
      }
    }, listenerOptions);
    ambienceSelect.addEventListener("change", updateModuleSummary, listenerOptions);

    const stepDefinitions = Object.freeze([
      Object.freeze({ label: "Identite", icon: "circle-user-round" }),
      Object.freeze({ label: "Univers", icon: "panels-top-left" }),
      Object.freeze({ label: "Modules", icon: "layout-grid" })
    ]);
    const stepButtons = stepDefinitions.map((step, index) => element("button", { className: "v8-profile-dialog__step", attributes: { type: "button", "aria-current": index === activeStep ? "step" : "false" }, dataset: { step: String(index) } }, [element("span", { text: String(index + 1) }), icon(step.icon), element("strong", { text: step.label })]));
    const stepper = element("nav", { className: "v8-profile-dialog__steps", attributes: { "aria-label": "Etapes de configuration" } }, stepButtons);

    const pages = [
      element("section", { className: "v8-profile-dialog__page", dataset: { wizardStep: "0" } }, [
        element("div", { className: "v8-profile-dialog__page-heading" }, [element("span", { text: "01 / IDENTITE" }), element("h3", { text: "Donnez un visage a cet univers" }), element("p", { text: "Un nom, une intention et un repere visuel immediat." })]),
        formField({ label: "Nom", control: nameInput, required: true, help: "80 caracteres maximum" }),
        formField({ label: "Description", control: descriptionInput, help: "180 caracteres maximum" }),
        element("fieldset", { className: "v8-profile-dialog__fieldset" }, [element("legend", { text: "Avatar" }), avatarPicker])
      ]),
      element("section", { className: "v8-profile-dialog__page", dataset: { wizardStep: "1" } }, [
        element("div", { className: "v8-profile-dialog__page-heading" }, [element("span", { text: "02 / UNIVERS" }), element("h3", { text: "Reglez son rythme" }), element("p", { text: "Space, Flow et ambiance composent la premiere impression." })]),
        element("div", { className: "v8-profile-dialog__row" }, [
          formField({ label: "Space principal", control: typeSelect, help: "Environnement charge a l'ouverture" }),
          formField({ label: "Flow principal", control: flowInput, help: "80 caracteres maximum" })
        ]),
        element("div", { className: "v8-profile-dialog__row" }, [
          formField({ label: "Ambiance", control: ambienceSelect, help: "Rythme visuel de l'environnement" }),
          formField({ label: "Fond", control: backgroundSelect, help: "Fond applique au Dashboard" })
        ]),
        element("fieldset", { className: "v8-profile-dialog__fieldset" }, [element("legend", { text: "Couleur dominante" }), accentPicker])
      ]),
      element("section", { className: "v8-profile-dialog__page", dataset: { wizardStep: "2" } }, [
        element("div", { className: "v8-profile-dialog__page-heading" }, [element("span", { text: "03 / MODULES" }), element("h3", { text: "Choisissez ce qui vous attend" }), element("p", { text: "Ces modules seront prepares sans connecter de service a votre place." })]),
        element("fieldset", { className: "v8-profile-dialog__fieldset" }, [element("legend", { text: "Widgets" }), widgetPicker]),
        element("fieldset", { className: "v8-profile-dialog__fieldset" }, [element("legend", { text: "Integrations a preparer" }), integrationPicker]),
        setupSummary
      ])
    ];

    const cancel = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [element("span", { text: "Annuler" })]);
    const back = element("button", { className: "v8-button v8-button--ghost", attributes: { type: "button" } }, [icon("arrow-left"), element("span", { text: "Retour" })]);
    const next = element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" } }, [element("span", { text: "Continuer" }), icon("arrow-right")]);
    const submit = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon(mode === "create" ? "sparkles" : "check"), element("span", { text: mode === "create" ? "Creer l'environnement" : "Enregistrer" })]);
    const form = element("form", { className: "v8-profile-dialog__form" }, [
      stepper,
      element("div", { className: "v8-profile-dialog__pages" }, pages),
      element("div", { className: "v8-profile-dialog__actions" }, [cancel, element("span", { className: "v8-profile-dialog__action-spacer" }), back, next, submit])
    ]);
    releaseDialogForm();
    releaseDialogForm = enhanceForm(form);
    const dialog = dialogShell(
      mode === "create" ? "Composer un environnement" : `Modifier ${profile.name}`,
      mode === "create" ? "Trois etapes courtes, puis ETHONE est pret a prendre vie." : "Ajustez son identite et ses modules sans toucher a ses donnees.",
      form,
      element("span")
    );

    function showStep(index, focus = true) {
      activeStep = Math.min(pages.length - 1, Math.max(0, index));
      dialog.dataset.wizardStep = String(activeStep);
      pages.forEach((page, pageIndex) => {
        const active = pageIndex === activeStep;
        page.hidden = !active;
        page.toggleAttribute("inert", !active);
      });
      stepButtons.forEach((button, buttonIndex) => button.setAttribute("aria-current", buttonIndex === activeStep ? "step" : "false"));
      back.hidden = activeStep === 0;
      next.hidden = activeStep === pages.length - 1;
      submit.hidden = activeStep !== pages.length - 1;
      if (focus) pages[activeStep].querySelector("input, select, button")?.focus();
    }

    stepButtons.forEach((button, index) => button.addEventListener("click", () => {
      if (index > 0 && !validateControl(nameInput, { force: true, focus: true })) return;
      showStep(index);
    }, listenerOptions));
    cancel.addEventListener("click", () => closeDialog(), listenerOptions);
    back.addEventListener("click", () => showStep(activeStep - 1), listenerOptions);
    next.addEventListener("click", () => {
      if (activeStep === 0 && !validateControl(nameInput, { force: true, focus: true })) return;
      showStep(activeStep + 1);
    }, listenerOptions);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (activeStep < pages.length - 1) {
        if (activeStep !== 0 || validateControl(nameInput, { force: true, focus: true })) showStep(activeStep + 1);
        return;
      }
      const payload = {
        name: nameInput.value,
        description: descriptionInput.value,
        type: typeSelect.value,
        space: typeSelect.value,
        flow: flowInput.value,
        avatar: chosenAvatar,
        accent: chosenAccent,
        widgets: [...chosenWidgets],
        integrations: [...chosenIntegrations],
        ambience: ambienceSelect.value,
        background: backgroundSelect.value
      };
      const submission = await runFormSubmission({
        form,
        submit,
        status,
        messages: { loading: mode === "create" ? "Creation de l'environnement..." : "Enregistrement du profil..." },
        task: () => mode === "create" ? repository.createProfile(payload) : repository.updateProfile(profile.id, payload)
      });
      if (!submission.accepted) return;
      const response = submission.value;
      if (submission.error || !response?.ok) {
        if (response?.message) setFieldState(nameInput, "invalid", response.message);
        return;
      }
      closeDialog({ restoreFocus: false });
      renderProfiles(response.data.id, true);
      status.textContent = response.message;
    }, listenerOptions);
    syncWidgetPicker();
    updateModuleSummary();
    showStep(activeStep, false);
    const target = focusTarget === "avatar" ? avatarPicker.querySelector('[aria-checked="true"]')
      : focusTarget === "space" ? typeSelect
        : focusTarget === "theme" ? accentPicker.querySelector('[aria-checked="true"]')
          : nameInput;
    queueMicrotask(() => target?.focus());
    return dialog;
  }

  function openDeleteConfirmation(profile) {
    closeMenu();
    const cancel = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" } }, [element("span", { text: "Annuler" })]);
    const confirm = element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" } }, [icon("trash-2"), element("span", { text: "Supprimer definitivement" })]);
    const content = element("div", { className: "v8-profile-dialog__confirm" }, [
      element("div", { className: "v8-profile-dialog__danger-icon" }, icon("triangle-alert")),
      element("p", { text: `Les donnees du profil ${profile.name} seront supprimees de Supabase et du cache de cet appareil. Cette action est irreversible.` })
    ]);
    dialogShell("Supprimer ce profil ?", "Une confirmation est necessaire avant toute suppression.", content, element("div", { className: "v8-profile-dialog__actions" }, [cancel, confirm]));
    cancel.addEventListener("click", () => closeDialog(), listenerOptions);
    confirm.addEventListener("click", () => {
      const response = repository.deleteProfile(profile.id);
      if (!response.ok) {
        status.textContent = response.message;
        closeDialog();
        return;
      }
      closeDialog({ restoreFocus: false });
      renderProfiles(repository.activeProfile()?.id || "", true);
      status.textContent = response.message;
    }, listenerOptions);
    queueMicrotask(() => cancel.focus());
  }

  function downloadExport(profile) {
    const response = repository.exportProfile(profile.id);
    if (!response.ok) {
      status.textContent = response.message;
      return;
    }
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = element("a", { attributes: { href: url, download: `ethone-${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "profil"}.json` } });
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    status.textContent = "Export du profil pret.";
  }

  function runMenuAction(actionId) {
    const profile = profiles.find((entry) => entry.id === menuProfileId);
    if (!profile) return;
    if (actionId === "rename") openEditor("edit", profile, "name");
    else if (actionId === "edit") openEditor("edit", profile, "name");
    else if (actionId === "avatar") openEditor("edit", profile, "avatar");
    else if (actionId === "space") openEditor("edit", profile, "space");
    else if (actionId === "theme") openEditor("edit", profile, "theme");
    else if (actionId === "export") { closeMenu(); downloadExport(profile); }
    else if (actionId === "duplicate") {
      closeMenu();
      const response = repository.duplicateProfile(profile.id);
      if (response.ok) renderProfiles(response.data.id, true);
      status.textContent = response.message;
    } else if (actionId === "delete") openDeleteConfirmation(profile);
  }

  async function activate(index = selectedIndex) {
    if (!profiles.length || destroyed) return;
    const token = ++activation;
    selectPreview(index);
    const profile = profiles[selectedIndex];
    if (profile.locked) {
      status.textContent = "Profil verrouille : vos donnees restent intactes.";
      return;
    }
    const selected = repository.selectProfile(profile.id);
    if (!selected.ok) {
      status.textContent = selected.message;
      return;
    }
    surface.classList.add("is-launching");
    surface.setAttribute("aria-busy", "true");
    enterButton.disabled = true;
    try {
      let activationResult;
      const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!reducedMotion && typeof document.startViewTransition === "function") {
        const transition = document.startViewTransition(async () => { activationResult = await options.onSelect?.(selected.data); });
        await transition.finished;
      } else {
        activationResult = await options.onSelect?.(selected.data);
      }
      if (!destroyed && token === activation) settleActivationResult(activationResult, { surface, enterButton, status });
    } catch {
      if (!destroyed && token === activation) settleActivationResult({ ok: false, message: "L'environnement n'a pas pu etre ouvert." }, { surface, enterButton, status });
    }
  }

  list.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      selectPreview(nextProfileIndex(profiles.length, selectedIndex, event.key), true);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      activate(selectedIndex);
    }
    if (event.key === " ") {
      event.preventDefault();
      selectPreview(selectedIndex, true);
    }
  }, listenerOptions);
  enterButton.addEventListener("click", () => activate(selectedIndex), listenerOptions);
  createButton.addEventListener("click", () => openEditor("create"), listenerOptions);
  emptyCreateButton.addEventListener("click", () => openEditor("create"), listenerOptions);
  menuButtons.forEach((button) => button.addEventListener("click", () => runMenuAction(button.dataset.profileAction), listenerOptions));
  signOut.addEventListener("click", async () => {
    signOut.classList.add("is-loading");
    signOut.disabled = true;
    const response = await options.onSignOut?.();
    if (!destroyed && response && !response.ok) {
      signOut.classList.remove("is-loading");
      signOut.disabled = false;
      status.textContent = response.message;
    }
  }, listenerOptions);
  globalThis.addEventListener?.("online", updateConnectivity, listenerOptions);
  globalThis.addEventListener?.("offline", updateConnectivity, listenerOptions);

  renderProfiles(repository.activeProfile()?.id || "");
  const releaseClock = clockManager?.subscribe?.(refreshClock) || (() => {});
  const releaseCloudStatus = cloudSync?.subscribe?.(updateConnectivity) || (() => {});
  if (!clockManager) refreshClock();
  queueMicrotask(() => { if (!destroyed && profiles.length) cards[selectedIndex]?.focus(); });

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    activation += 1;
    releaseClock();
    releaseCloudStatus();
    closeMenu();
    closeDialog({ restoreFocus: false });
    dialogWindow.destroy();
    abortController.abort();
    surface.remove();
    root.removeAttribute("data-entry-state");
    if (document.documentElement.dataset.entry === "profiles") delete document.documentElement.dataset.entry;
    return true;
  }

  return Object.freeze({
    destroy,
    focus: () => profiles.length && cards[selectedIndex]?.focus(),
    selectedId: () => profiles[selectedIndex]?.id || null
  });
}
