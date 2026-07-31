import { integrationById } from "../data/integrations.mjs";
import { actionButton, debounce, element, icon } from "../ui/dom.mjs";
import { collectionDensityControl, updateCollectionDensityControl } from "../ui/dense-content.mjs";
import { emptyState, statusState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { spotifyLiveCard } from "../ui/spotify-live.mjs";
import { discordLiveCard } from "../ui/discord-live.mjs";
import { weatherLiveCard } from "../ui/weather-live.mjs";
import { createWeatherDetail } from "../ui/weather-detail.mjs";
import { minecraftLiveCard } from "../ui/minecraft-live.mjs";
import { steamLiveCard } from "../ui/steam-live.mjs";
import { githubLiveCard } from "../ui/github-live.mjs";
import { googleCalendarLiveCard } from "../ui/google-calendar-live.mjs";
import { notionLiveCard } from "../ui/notion-live.mjs";
import { todoistLiveCard } from "../ui/todoist-live.mjs";
import { valorantLiveCard } from "../ui/valorant-live.mjs";
import { lolLiveCard } from "../ui/lol-live.mjs";
import { twitchLiveCard } from "../ui/twitch-live.mjs";
import { lastfmLiveCard } from "../ui/lastfm-live.mjs";
import { trackerLiveCard } from "../ui/tracker-live.mjs";
import { googleDriveLiveCard } from "../ui/google-drive-live.mjs";
import { youtubeLiveCard } from "../ui/youtube-live.mjs";
import { redditLiveCard } from "../ui/reddit-live.mjs";
import { createSelect } from "../ui/select.mjs";
import { prepareActivityUI } from "./activity-style.mjs";

export { prepareActivityUI as prepare };

const FILTERS = Object.freeze([
  { id: "all", label: "Tout" },
  { id: "today", label: "Aujourd'hui" },
  { id: "week", label: "Cette semaine" },
  { id: "gaming", label: "Gaming" },
  { id: "development", label: "Developpement" },
  { id: "work", label: "Travail" },
  { id: "study", label: "Etudes" },
  { id: "productivity", label: "Productivite" },
  { id: "media", label: "Medias" },
  { id: "social", label: "Social" },
  { id: "brain", label: "Brain" }
]);

function completed(message, data = null) {
  return Object.freeze({ ok: true, status: "completed", message, data });
}

const LIVE_CARD_META = Object.freeze({
  system: Object.freeze({ label: "Systeme ETHONE", icon: "orbit" }),
  spotify: Object.freeze({ label: "Spotify", icon: "music-2" }),
  discord: Object.freeze({ label: "Discord", icon: "messages-square" }),
  weather: Object.freeze({ label: "Meteo", icon: "cloud-sun" }),
  minecraft: Object.freeze({ label: "Minecraft", icon: "box" }),
  steam: Object.freeze({ label: "Steam", icon: "gamepad-2" }),
  github: Object.freeze({ label: "GitHub", icon: "github" }),
  "google-calendar": Object.freeze({ label: "Google Calendar", icon: "calendar-days" }),
  notion: Object.freeze({ label: "Notion", icon: "notebook-tabs" }),
  todoist: Object.freeze({ label: "Todoist", icon: "circle-check-big" }),
  valorant: Object.freeze({ label: "Valorant", icon: "swords" }),
  lol: Object.freeze({ label: "League of Legends", icon: "swords" }),
  twitch: Object.freeze({ label: "Twitch", icon: "twitch" }),
  lastfm: Object.freeze({ label: "Last.fm", icon: "history" }),
  "tracker-gg": Object.freeze({ label: "Tracker.gg", icon: "chart-no-axes-combined" }),
  "google-drive": Object.freeze({ label: "Google Drive", icon: "hard-drive" }),
  youtube: Object.freeze({ label: "YouTube", icon: "youtube" }),
  reddit: Object.freeze({ label: "Reddit", icon: "message-circle" })
});
const DEFAULT_LIVE_LAYOUT = Object.freeze({ order: Object.freeze(["system", "spotify", "discord", "weather", "minecraft", "steam", "github", "google-calendar", "notion", "todoist", "valorant", "lol", "twitch", "lastfm", "tracker-gg", "google-drive", "youtube", "reddit"]), hidden: Object.freeze([]) });

function moveButton(id, direction, disabled, label) {
  const button = actionButton({ actionId: "v8.activity.live.move", className: "v8-icon-button", ariaLabel: label, disabled }, [icon(direction === "up" ? "chevron-up" : "chevron-down")]);
  button.dataset.liveCard = id;
  button.dataset.direction = direction;
  return button;
}

function visibilityButton(id, hidden) {
  const meta = LIVE_CARD_META[id];
  const button = actionButton({ actionId: "v8.activity.live.toggle", className: "v8-icon-button", ariaLabel: hidden ? `Afficher ${meta.label}` : `Masquer ${meta.label}` }, [icon(hidden ? "eye-off" : "eye")]);
  button.dataset.liveCard = id;
  return button;
}

function customizeRow(id, index, total, hidden) {
  const meta = LIVE_CARD_META[id];
  return element("div", { className: `v8-now-customize-row${hidden ? " is-hidden" : ""}` }, [
    element("span", { className: "v8-now-customize-row__label" }, [icon(meta.icon), element("span", { text: meta.label })]),
    element("div", { className: "v8-now-customize-row__actions" }, [
      moveButton(id, "up", index === 0, `Monter ${meta.label}`),
      moveButton(id, "down", index === total - 1, `Descendre ${meta.label}`),
      visibilityButton(id, hidden)
    ])
  ]);
}

function sameDay(value, date = new Date()) {
  const parsed = new Date(value || "");
  return !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === date.getFullYear()
    && parsed.getMonth() === date.getMonth()
    && parsed.getDate() === date.getDate();
}

function sameWeek(value, date = new Date()) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return false;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return parsed >= start && parsed < end;
}

function timeLabel(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "Local";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(parsed);
}

function relativeLabel(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "Maintenant";
  const seconds = Math.max(0, Math.round((Date.now() - parsed.getTime()) / 1000));
  if (seconds < 60) return "A l'instant";
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(parsed);
}

function sourceName(source) {
  const integration = integrationById(source);
  if (integration) return integration.name;
  const labels = { ethone: "ETHONE", notes: "Notes", tasks: "Taches", calendar: "Calendrier", files: "Fichiers", brain: "Brain" };
  return labels[source] || String(source || "ETHONE");
}

function eventMatches(event, filter) {
  if (filter === "all") return true;
  if (filter === "today") return sameDay(event.timestamp);
  if (filter === "week") return sameWeek(event.timestamp);
  return event.category === filter;
}

function eventMatchesQuery(event, query) {
  const normalized = String(query || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  if (!normalized) return true;
  return [event.title, event.description, sourceName(event.source), event.category]
    .some((value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized));
}

function sortEvents(events, order) {
  return events.slice().sort((left, right) => {
    if (order === "oldest") return String(left.timestamp || "").localeCompare(String(right.timestamp || ""));
    if (order === "source") return sourceName(left.source).localeCompare(sourceName(right.source), "fr", { sensitivity: "base" }) || String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
    return String(right.timestamp || "").localeCompare(String(left.timestamp || ""));
  });
}

function timelineEntry(event) {
  return element("article", { className: `v8-live-entry v8-live-entry--${event.tone || "default"}`, attributes: { tabindex: "0" } }, [
    element("time", { className: "v8-live-entry__time", text: timeLabel(event.timestamp), attributes: { datetime: event.timestamp || null } }),
    element("span", { className: "v8-live-entry__node", attributes: { "aria-hidden": "true" } }),
    element("div", { className: "v8-live-entry__card" }, [
      element("span", { className: "v8-live-entry__icon", dataset: { presenceIcon: event.source === "email" ? "mail" : null } }, [icon(event.icon || "activity")]),
      element("div", { className: "v8-live-entry__copy" }, [
        element("div", { className: "v8-live-entry__meta" }, [element("strong", { text: sourceName(event.source), attributes: { translate: "no" } }), element("span", { text: relativeLabel(event.timestamp) })]),
        element("h3", { text: event.title, attributes: { translate: "no" } }),
        element("p", { text: event.description })
      ]),
      element("span", { className: `v8-live-entry__category v8-live-entry__category--${event.category}`, text: event.category })
    ])
  ]);
}

function liveCard(integration, connection, latest) {
  return element("article", { className: "v8-now-card v8-surface", dataset: { integration: integration.id } }, [
    element("div", { className: "v8-now-card__top" }, [
      element("span", { className: "v8-now-card__icon", dataset: { presenceIcon: integration.id === "email" ? "mail" : null } }, [icon(integration.icon)]),
      element("span", { className: "v8-live-pill" }, [element("i", { attributes: { "aria-hidden": "true" } }), "LIVE"])
    ]),
    element("div", { className: "v8-now-card__copy" }, [
      element("small", { text: integration.name, attributes: { translate: "no" } }),
      element("strong", { text: latest?.title || "Connecte et en attente" }),
      element("p", { text: latest?.description || "Le prochain evenement apparaitra sans recharger la page." })
    ]),
    element("footer", {}, [element("span", { text: connection.lastSyncAt ? relativeLabel(connection.lastSyncAt) : "Synchronisation prete" }), icon("arrow-up-right")])
  ]);
}

function emptyFeed(onReset) {
  const primaryAction = onReset
    ? element("button", {
      className: "v8-button v8-button--primary",
      text: "Voir toute l'activité",
      attributes: { type: "button" },
      events: { click: onReset }
    })
    : actionButton({ actionId: "v8.connections.open", variant: "primary" }, [icon("plug"), element("span", { text: "Ajouter une source" })]);
  return emptyState({
    kind: onReset ? "no-results" : "empty",
    iconName: "activity",
    eyebrow: "Chronologie prête",
    title: "Aucun signal dans ce filtre",
    description: "Les activités locales et les intégrations connectées apparaîtront ici.",
    actions: [primaryAction],
    brain: {
      title: "Suggestion Brain",
      description: "Connectez une source pour enrichir votre contexte sans suivi global.",
      action: actionButton({ actionId: "v8.brain.open", variant: "secondary" }, [icon("brain"), element("span", { text: "Ouvrir Brain" })])
    },
    className: "v8-empty-state--wide"
  });
}

export function mountActivity(stage, options = {}) {
  const repository = options.repository;
  const journal = options.journal;
  const actions = options.actions;
  const notify = options.notify || (() => {});
  const spotifyLive = options.spotifyLive || null;
  const discordLive = options.discordLive || null;
  const weatherLive = options.weatherLive || null;
  const minecraftLive = options.minecraftLive || null;
  const steamLive = options.steamLive || null;
  const githubLive = options.githubLive || null;
  const googleCalendarLive = options.googleCalendarLive || null;
  const notionLive = options.notionLive || null;
  const todoistLive = options.todoistLive || null;
  const valorantLive = options.valorantLive || null;
  const lolLive = options.lolLive || null;
  const twitchLive = options.twitchLive || null;
  const lastfmLive = options.lastfmLive || null;
  const trackerLive = options.trackerLive || null;
  const googleDriveLive = options.googleDriveLive || null;
  const youtubeLive = options.youtubeLive || null;
  const redditLive = options.redditLive || null;
  const presence = options.presence || null;
  const state = options.state || {};
  let activeFilter = "all";
  let query = "";
  let order = "recent";
  let refreshTimer = 0;
  let liveLayout = state.activityLiveLayout || DEFAULT_LIVE_LAYOUT;
  let customizeOpen = false;
  let spotifyPlayback = spotifyLive?.state?.() || {};
  let discordPresence = discordLive?.state?.() || {};
  let weatherPresence = weatherLive?.state?.() || {};
  let minecraftPresence = minecraftLive?.state?.() || {};
  let steamPresence = steamLive?.state?.() || {};
  let githubPresence = githubLive?.state?.() || {};
  let googleCalendarPresence = googleCalendarLive?.state?.() || {};
  let notionPresence = notionLive?.state?.() || {};
  let todoistPresence = todoistLive?.state?.() || {};
  let valorantPresence = valorantLive?.state?.() || {};
  let lolPresence = lolLive?.state?.() || {};
  let twitchPresence = twitchLive?.state?.() || {};
  let lastfmPresence = lastfmLive?.state?.() || {};
  let trackerPresence = trackerLive?.state?.() || {};
  let googleDrivePresence = googleDriveLive?.state?.() || {};
  let youtubePresence = youtubeLive?.state?.() || {};
  let redditPresence = redditLive?.state?.() || {};
  const controller = new AbortController();

  const filterBar = element("div", { className: "v8-activity-filters", attributes: { role: "toolbar", "aria-label": "Filtrer l'activite" } });
  const liveGrid = element("div", { className: "v8-now-grid" });
  const customizeHost = element("div", { className: "v8-now-customize", attributes: { hidden: true } });
  const customizeToggle = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button", "aria-expanded": "false" } }, [icon("sliders-horizontal"), element("span", { text: "Personnaliser" })]);
  const timeline = element("div", { className: "v8-live-timeline", attributes: { role: "feed", "aria-label": "Flux d'activite" } });
  const countLabel = element("span", { className: "v8-section-count" });
  const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher dans l'activité", "aria-label": "Rechercher dans l'activité", autocomplete: "off" } });
  const sortSelect = createSelect({ className: "v8-input v8-activity-sort", attributes: { "aria-label": "Trier l'activité" } }, [
    element("option", { text: "Plus récent", attributes: { value: "recent" } }),
    element("option", { text: "Plus ancien", attributes: { value: "oldest" } }),
    element("option", { text: "Source", attributes: { value: "source" } })
  ]);
  const densityControl = collectionDensityControl(options.state?.density || document.documentElement.dataset.density || "automatic");
  const connectionMetric = element("strong");
  const signalMetric = element("strong");
  const brainCopy = element("p");

  FILTERS.forEach((filter) => filterBar.append(element("button", {
    className: `v8-filter-chip${filter.id === activeFilter ? " is-active" : ""}`,
    text: filter.label,
    attributes: { type: "button", "aria-pressed": filter.id === activeFilter ? "true" : "false" },
    dataset: { activityFilter: filter.id }
  })));

  const page = element("section", { className: "v8-page v8-activity-page-v2", dataset: { page: "activity" } }, [
    element("header", { className: "v8-page-heading v8-activity-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: "Continuite numerique" }), element("h1", { text: "Activity Hub" }), element("p", { text: "Tout ce qui compte dans votre ecosysteme, regroupe sans bruit." })]),
      element("div", { className: "v8-page-heading__actions" }, [
        element("span", { className: "v8-live-state" }, [element("i", { attributes: { "aria-hidden": "true" } }), element("span", { text: "Flux actif" })]),
        actionButton({ actionId: "v8.activity.refresh", variant: "secondary" }, [icon("refresh-cw"), element("span", { text: "Actualiser" })]),
        actionButton({ actionId: "v8.connections.open", variant: "primary" }, [icon("plug"), element("span", { text: "Connections" })])
      ])
    ]),
    element("section", { className: "v8-now-section" }, [
      element("header", { className: "v8-section-heading" }, [element("div", {}, [element("span", { className: "v8-eyebrow", text: "En direct" }), element("h2", { text: "Live now" })]), customizeToggle]),
      customizeHost,
      liveGrid
    ]),
    element("div", { className: "v8-activity-workspace" }, [
      element("section", { className: "v8-activity-stream" }, [
        element("header", { className: "v8-activity-stream__header" }, [element("div", {}, [element("span", { className: "v8-eyebrow", text: "Chronologie" }), element("h2", { text: "Votre journee" })]), countLabel]),
        element("div", { className: "v8-activity-tools-bar" }, [
          element("div", { className: "v8-input-wrap v8-activity-search" }, [icon("search"), search]),
          element("div", { className: "v8-collection-tools" }, [sortSelect, densityControl])
        ]),
        filterBar,
        timeline
      ]),
      element("aside", { className: "v8-activity-intelligence" }, [
        element("section", { className: "v8-activity-overview v8-surface" }, [
          element("span", { className: "v8-eyebrow", text: "Vue d'ensemble" }),
          element("h2", { text: state.flow || "Essentiel" }),
          element("div", { className: "v8-activity-kpis" }, [
            element("span", {}, [connectionMetric, element("small", { text: "Connectees" })]),
            element("span", {}, [signalMetric, element("small", { text: "Signaux" })])
          ]),
          actionButton({ actionId: "v8.connections.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Gerer les connexions" })])
        ]),
        element("section", { className: "v8-activity-brain v8-surface" }, [
          element("div", { className: "v8-activity-brain__title" }, [element("span", {}, [icon("brain")]), element("div", {}, [element("small", { text: "ETHONE pense que..." }), element("strong", { text: "Votre contexte est lisible" })])]),
          brainCopy,
          actionButton({ actionId: "v8.brain.open" }, [element("span", { text: "Ouvrir Brain" }), icon("arrow-up-right")])
        ]),
        element("section", { className: "v8-activity-privacy" }, [icon("shield-check"), element("div", {}, [element("strong", { text: "Donnees maitrisees" }), element("p", { text: "Aucun secret d'integration n'est conserve dans le navigateur." })])])
      ])
    ])
  ]);

  function renderCustomizePanel() {
    customizeHost.hidden = !customizeOpen;
    customizeToggle.setAttribute("aria-expanded", String(customizeOpen));
    if (!customizeOpen) return;
    customizeHost.replaceChildren(...liveLayout.order.map((id, index) => customizeRow(id, index, liveLayout.order.length, liveLayout.hidden.includes(id))));
    refreshIcons();
  }

  function render() {
    const snapshot = repository.snapshot();
    const events = journal.entries();
    const filtered = sortEvents(events.filter((event) => eventMatches(event, activeFilter) && eventMatchesQuery(event, query)), order);
    const connections = snapshot.connections || [];
    const connected = connections.filter((connection) => connection.status === "connected");

    const systemCard = element("article", { className: "v8-now-card v8-now-card--system v8-surface" }, [
      element("div", { className: "v8-now-card__top" }, [element("span", { className: "v8-now-card__icon" }, [icon("orbit")]), element("span", { className: "v8-live-pill" }, [element("i", { attributes: { "aria-hidden": "true" } }), "LOCAL"])]),
      element("div", { className: "v8-now-card__copy" }, [element("small", { text: "ETHONE" }), element("strong", { text: `${state.flow || "Essentiel"} dans ${state.space || "personal"}` }), element("p", { text: "Le journal local reagit aux actions utiles sans tracker global." })]),
      element("footer", {}, [element("span", { text: "Actif maintenant" }), icon("check")])
    ]);
    const spotifyPlayer = spotifyLiveCard(spotifyPlayback, { variant: "activity" });
    const discordCard = discordLiveCard(discordPresence, { variant: "activity" });
    const weatherCard = weatherLiveCard(weatherPresence, { variant: "activity", detailable: true });
    const minecraftCard = minecraftLiveCard(minecraftPresence, { variant: "activity" });
    const steamCard = steamLiveCard(steamPresence, { variant: "activity" });
    const githubCard = githubLiveCard(githubPresence, { variant: "activity" });
    const googleCalendarCard = googleCalendarLiveCard(googleCalendarPresence, { variant: "activity" });
    const notionCard = notionLiveCard(notionPresence, { variant: "activity" });
    const todoistCard = todoistLiveCard(todoistPresence, { variant: "activity" });
    const valorantCard = valorantLiveCard(valorantPresence, { variant: "activity" });
    const lolCard = lolLiveCard(lolPresence, { variant: "activity" });
    const twitchCard = twitchLiveCard(twitchPresence, { variant: "activity" });
    const lastfmCard = lastfmLiveCard(lastfmPresence, { variant: "activity" });
    const trackerCard = trackerLiveCard(trackerPresence, { variant: "activity" });
    const googleDriveCard = googleDriveLiveCard(googleDrivePresence, { variant: "activity" });
    const youtubeCard = youtubeLiveCard(youtubePresence, { variant: "activity" });
    const redditCard = redditLiveCard(redditPresence, { variant: "activity" });
    const knownCards = { system: systemCard, spotify: spotifyPlayer, discord: discordCard, weather: weatherCard, minecraft: minecraftCard, steam: steamCard, github: githubCard, "google-calendar": googleCalendarCard, notion: notionCard, todoist: todoistCard, valorant: valorantCard, lol: lolCard, twitch: twitchCard, lastfm: lastfmCard, "tracker-gg": trackerCard, "google-drive": googleDriveCard, youtube: youtubeCard, reddit: redditCard };
    liveGrid.replaceChildren();
    liveLayout.order.forEach((id) => {
      if (liveLayout.hidden.includes(id)) return;
      const card = knownCards[id];
      if (card) liveGrid.append(card);
    });
    connected.filter((connection) => !Object.hasOwn(knownCards, connection.id)).slice(0, 3).forEach((connection) => {
      const integration = integrationById(connection.id);
      if (!integration) return;
      liveGrid.append(liveCard(integration, connection, events.find((event) => event.source === integration.id)));
    });
    systemCard.classList.toggle("v8-now-card--solo", liveGrid.children.length === 1);
    renderCustomizePanel();
    if (!connected.length) liveGrid.append(statusState("integration", {
      title: "Aucune source distante active",
      description: "Configurez un service pour enrichir le Live Feed sans donnees fictives.",
      actions: [actionButton({ actionId: "v8.connections.open", variant: "secondary" }, [element("span", { text: "Configurer" }), icon("arrow-up-right")])],
      compact: true,
      className: "v8-empty-state--wide"
    }));

    timeline.replaceChildren(...(filtered.length ? filtered.map(timelineEntry) : [emptyFeed(activeFilter === "all" && !query ? null : () => {
      activeFilter = "all";
      query = "";
      search.value = "";
      render();
    })]));
    filterBar.querySelectorAll("[data-activity-filter]").forEach((button) => {
      const active = button.dataset.activityFilter === activeFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    countLabel.textContent = `${filtered.length} ${filtered.length > 1 ? "signaux" : "signal"}`;
    connectionMetric.textContent = String(connected.length);
    signalMetric.textContent = String(events.length);
    const openTasks = (snapshot.tasks || []).filter((task) => !task.done).length;
    brainCopy.textContent = connected.length
      ? `${connected.length} source${connected.length > 1 ? "s" : ""} alimente${connected.length > 1 ? "nt" : ""} le contexte. ${openTasks} tache${openTasks > 1 ? "s" : ""} reste${openTasks > 1 ? "nt" : ""} ouverte${openTasks > 1 ? "s" : ""}.`
      : `Le contexte local contient ${events.length} signaux et ${openTasks} tache${openTasks > 1 ? "s" : ""} ouverte${openTasks > 1 ? "s" : ""}.`;
    refreshIcons();
  }

  function scheduleRefresh() {
    if (refreshTimer) globalThis.clearTimeout(refreshTimer);
    if (document.hidden) return;
    refreshTimer = globalThis.setTimeout(() => {
      refreshTimer = 0;
      render();
      scheduleRefresh();
    }, 30000);
  }

  customizeToggle.addEventListener("click", () => {
    customizeOpen = !customizeOpen;
    renderCustomizePanel();
  }, { signal: controller.signal });
  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-activity-filter]");
    if (!button) return;
    activeFilter = button.dataset.activityFilter || "all";
    render();
  }, { signal: controller.signal });
  const renderSearchResults = debounce(render, 120);
  search.addEventListener("input", () => {
    query = search.value;
    renderSearchResults();
  }, { signal: controller.signal });
  sortSelect.addEventListener("change", () => {
    order = sortSelect.value;
    render();
  }, { signal: controller.signal });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && refreshTimer) {
      globalThis.clearTimeout(refreshTimer);
      refreshTimer = 0;
    } else scheduleRefresh();
  }, { signal: controller.signal });

  const releaseRefresh = actions.scope("v8.activity.refresh", () => {
    render();
    notify({ id: "activity-refreshed", title: "Activity Hub", message: "Le flux local est a jour.", type: "success" });
    return completed("Flux actualise");
  });
  const releaseJournal = journal.subscribe(render);
  const releaseSpotify = spotifyLive?.subscribe?.((playback) => {
    spotifyPlayback = playback;
    render();
    const player = liveGrid.querySelector(".v8-spotify-live");
    if (player) presence?.signalActivity?.(player, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseDiscord = discordLive?.subscribe?.((presenceState) => {
    discordPresence = presenceState;
    render();
    const card = liveGrid.querySelector(".v8-discord-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseWeather = weatherLive?.subscribe?.((weatherState) => {
    weatherPresence = weatherState;
    render();
    const card = liveGrid.querySelector(".v8-weather-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseMinecraft = minecraftLive?.subscribe?.((minecraftState) => {
    minecraftPresence = minecraftState;
    render();
    const card = liveGrid.querySelector(".v8-minecraft-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseSteam = steamLive?.subscribe?.((steamState) => {
    steamPresence = steamState;
    render();
    const card = liveGrid.querySelector(".v8-steam-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseGithub = githubLive?.subscribe?.((githubState) => {
    githubPresence = githubState;
    render();
    const card = liveGrid.querySelector(".v8-github-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseGoogleCalendar = googleCalendarLive?.subscribe?.((googleCalendarState) => {
    googleCalendarPresence = googleCalendarState;
    render();
    const card = liveGrid.querySelector(".v8-google-calendar-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseNotion = notionLive?.subscribe?.((notionState) => {
    notionPresence = notionState;
    render();
    const card = liveGrid.querySelector(".v8-notion-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseTodoist = todoistLive?.subscribe?.((todoistState) => {
    todoistPresence = todoistState;
    render();
    const card = liveGrid.querySelector(".v8-todoist-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseValorant = valorantLive?.subscribe?.((valorantState) => {
    valorantPresence = valorantState;
    render();
    const card = liveGrid.querySelector(".v8-valorant-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseLol = lolLive?.subscribe?.((lolState) => {
    lolPresence = lolState;
    render();
    const card = liveGrid.querySelector(".v8-lol-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseTwitch = twitchLive?.subscribe?.((twitchState) => {
    twitchPresence = twitchState;
    render();
    const card = liveGrid.querySelector(".v8-twitch-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseLastfm = lastfmLive?.subscribe?.((lastfmState) => {
    lastfmPresence = lastfmState;
    render();
    const card = liveGrid.querySelector(".v8-lastfm-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseTracker = trackerLive?.subscribe?.((trackerState) => {
    trackerPresence = trackerState;
    render();
    const card = liveGrid.querySelector(".v8-tracker-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseGoogleDrive = googleDriveLive?.subscribe?.((googleDriveState) => {
    googleDrivePresence = googleDriveState;
    render();
    const card = liveGrid.querySelector(".v8-google-drive-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseYoutube = youtubeLive?.subscribe?.((youtubeState) => {
    youtubePresence = youtubeState;
    render();
    const card = liveGrid.querySelector(".v8-youtube-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  const releaseReddit = redditLive?.subscribe?.((redditState) => {
    redditPresence = redditState;
    render();
    const card = liveGrid.querySelector(".v8-reddit-live");
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
  }, { immediate: false }) || (() => {});
  stage.replaceChildren(page);
  render();
  const releaseDensity = options.subscribeState?.((next) => updateCollectionDensityControl(densityControl, next)) || (() => {});
  const releaseLiveLayout = options.subscribeState?.((next) => {
    if (next.activityLiveLayout === liveLayout) return;
    liveLayout = next.activityLiveLayout || DEFAULT_LIVE_LAYOUT;
    render();
  }) || (() => {});
  scheduleRefresh();
  refreshIcons();

  return () => {
    controller.abort();
    if (refreshTimer) globalThis.clearTimeout(refreshTimer);
    refreshTimer = 0;
    releaseRefresh();
    releaseJournal();
    releaseSpotify();
    releaseDiscord();
    releaseWeather();
    releaseMinecraft();
    releaseSteam();
    releaseGithub();
    releaseGoogleCalendar();
    releaseNotion();
    releaseTodoist();
    releaseValorant();
    releaseLol();
    releaseTwitch();
    releaseLastfm();
    releaseTracker();
    releaseGoogleDrive();
    releaseYoutube();
    releaseReddit();
    releaseDensity();
    releaseLiveLayout();
    page.remove();
  };
}
