import { integrationById } from "../data/integrations.mjs";
import { translateSource } from "../i18n/catalog.mjs";
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
  system: Object.freeze({ label: "Système ETHONE", icon: "orbit" }),
  spotify: Object.freeze({ label: "Spotify", icon: "music-2" }),
  discord: Object.freeze({ label: "Discord", icon: "messages-square" }),
  weather: Object.freeze({ label: "Météo", icon: "cloud-sun" }),
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

const SOURCE_ROUTE = Object.freeze({
  notes: "v8.notes.open",
  tasks: "v8.tasks.open",
  calendar: "v8.calendar.open",
  files: "v8.files.open",
  brain: "v8.brain.open",
  connections: "v8.connections.open",
  settings: "v8.settings.open",
  home: "v8.home.open",
  activity: "v8.activity.open",
  spaces: "v8.spaces.open",
  flows: "v8.flows.open",
  widgets: "v8.widgets.open"
});

function entryActions(event, context) {
  if (!context) return null;
  const { actions, translateSource, onFilter, onOpen } = context;
  const buttons = [];

  const copy = element("button", {
    className: "v8-live-entry__action",
    attributes: { type: "button", "aria-label": `${translateSource("Copier")} ${event.title || ""}` },
    events: {
      click: (e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText?.(String(event.title || event.description || "")).catch(() => {});
      }
    }
  }, [icon("copy")]);
  buttons.push(copy);

  if (event.category && event.category !== "all") {
    const filter = element("button", {
      className: "v8-live-entry__action",
      attributes: { type: "button", "aria-label": `${translateSource("Filtrer")}` },
      events: {
        click: (e) => {
          e.stopPropagation();
          onFilter(event.category);
        }
      }
    }, [icon("filter")]);
    buttons.push(filter);
  }

  const route = event.source ? SOURCE_ROUTE[event.source] : null;
  const url = event.url || (route ? null : null);
  if (route || url) {
    const open = element("button", {
      className: "v8-live-entry__action",
      attributes: { type: "button", "aria-label": translateSource("Ouvrir") },
      events: {
        click: (e) => {
          e.stopPropagation();
          onOpen(route, url);
        }
      }
    }, [icon("arrow-up-right")]);
    buttons.push(open);
  }

  return buttons.length ? element("div", { className: "v8-live-entry__actions" }, buttons) : null;
}

function timelineEntry(event, context) {
  return element("article", { className: `v8-live-entry v8-live-entry--${event.tone || "default"}`, attributes: { tabindex: "0" } }, [
    element("time", { className: "v8-live-entry__time", text: timeLabel(event.timestamp), attributes: { datetime: event.timestamp || null } }),
    element("span", { className: "v8-live-entry__node", attributes: { "aria-hidden": "true" } }),
    element("div", { className: "v8-live-entry__card" }, [
      element("span", { className: "v8-live-entry__icon", dataset: { presenceIcon: event.source === "email" ? "mail" : null } }, [icon(event.icon || "activity")]),
      element("div", { className: "v8-live-entry__copy" }, [
        element("div", { className: "v8-live-entry__meta" }, [element("strong", { text: sourceName(event.source), attributes: { translate: "no" } }), element("span", { text: relativeLabel(event.timestamp) })]),
        element("h3", { text: event.title, attributes: { translate: "no" } }),
        element("p", { text: event.description }),
        entryActions(event, context)
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
      element("strong", { text: latest?.title || "Connecté et en attente" }),
      element("p", { text: latest?.description || "Le prochain événement apparaitra sans recharger la page." })
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
  const externalServices = options.externalServices || null;
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
  let cloudEvents = [];
  let cloudSummary = null;
  let visibleCount = 15;
  let lastFilterHash = "";
  const PAGE_SIZE = 15;
  const controller = new AbortController();

  const filterBar = element("div", { className: "v8-activity-filters", attributes: { role: "toolbar", "aria-label": "Filtrer l'activité" } });
  const categoryGrids = {
    gaming: element("div", { className: "v8-now-grid" }),
    social: element("div", { className: "v8-now-grid" }),
    productivity: element("div", { className: "v8-now-grid" })
  };

  const categorySections = {
    gaming: element("div", { className: "v8-live-category", style: "margin-bottom:2rem;" }, [
      element("h3", { className: "v8-live-category__title", text: "Gaming & Stats", style: "font-size:0.8rem;text-transform:uppercase;color:var(--v8-text-secondary);margin-bottom:1rem;" }),
      categoryGrids.gaming
    ]),
    social: element("div", { className: "v8-live-category", style: "margin-bottom:2rem;" }, [
      element("h3", { className: "v8-live-category__title", text: "Médias & Social", style: "font-size:0.8rem;text-transform:uppercase;color:var(--v8-text-secondary);margin-bottom:1rem;" }),
      categoryGrids.social
    ]),
    productivity: element("div", { className: "v8-live-category" }, [
      element("h3", { className: "v8-live-category__title", text: "Productivité & Quotidien", style: "font-size:0.8rem;text-transform:uppercase;color:var(--v8-text-secondary);margin-bottom:1rem;" }),
      categoryGrids.productivity
    ])
  };

  const liveGrid = element("div", { className: "v8-now-wrapper" }, [
    categorySections.gaming,
    categorySections.social,
    categorySections.productivity
  ]);

  function getCategory(id) {
    if (["valorant", "lol", "tracker-gg", "steam", "minecraft", "twitch"].includes(id)) return "gaming";
    if (["discord", "spotify", "lastfm", "youtube", "reddit"].includes(id)) return "social";
    return "productivity";
  }
  const weatherDetail = createWeatherDetail();
  liveGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-weather-detail-trigger]");
    if (!trigger) return;
    if (weatherDetail.isOpen()) { weatherDetail.close({ restoreFocus: true }); return; }
    weatherDetail.open(trigger, weatherLive?.state?.() || {});
  }, { signal: controller.signal });
  const customizeHost = element("div", { className: "v8-now-customize", attributes: { hidden: true } });
  const customizeToggle = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button", "aria-expanded": "false" } }, [icon("sliders-horizontal"), element("span", { text: "Personnaliser" })]);
  const timeline = element("div", { className: "v8-live-timeline", attributes: { role: "feed", "aria-label": "Flux d'activité" } });
  const loadMore = element("button", { className: "v8-button v8-button--secondary v8-activity-load-more", attributes: { type: "button" }, events: { click: () => { visibleCount += PAGE_SIZE; render(); } } });
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
  const cloudMetric = element("strong");
  const brainCopy = element("p");

  FILTERS.forEach((filter) => filterBar.append(element("button", {
    className: `v8-filter-chip${filter.id === activeFilter ? " is-active" : ""}`,
    text: filter.label,
    attributes: { type: "button", "aria-pressed": filter.id === activeFilter ? "true" : "false" },
    dataset: { activityFilter: filter.id }
  })));

  const page = element("section", { className: "v8-page v8-activity-page-v2", dataset: { page: "activity" } }, [
    element("header", { className: "v8-page-heading v8-activity-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: "Continuité numérique" }), element("h1", { text: "Activity Hub" }), element("p", { text: "Tout ce qui compte dans votre écosystème, regroupé sans bruit." })]),
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
        element("header", { className: "v8-activity-stream__header" }, [element("div", {}, [element("span", { className: "v8-eyebrow", text: "Chronologie" }), element("h2", { text: "Votre journée" })]), countLabel]),
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
            element("span", {}, [connectionMetric, element("small", { text: "Connectées" })]),
            element("span", {}, [signalMetric, element("small", { text: "Signaux" })]),
            element("span", {}, [cloudMetric, element("small", { text: "Cloud" })])
          ]),
          actionButton({ actionId: "v8.connections.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Gérer les connexions" })])
        ]),
        element("section", { className: "v8-activity-brain v8-surface" }, [
          element("div", { className: "v8-activity-brain__title" }, [element("span", {}, [icon("brain")]), element("div", {}, [element("small", { text: "ETHONE pense que..." }), element("strong", { text: "Votre contexte est lisible" })])]),
          brainCopy,
          actionButton({ actionId: "v8.brain.open" }, [element("span", { text: "Ouvrir Brain" }), icon("arrow-up-right")])
        ]),
        element("section", { className: "v8-activity-privacy" }, [icon("shield-check"), element("div", {}, [element("strong", { text: "Données maîtrisées" }), element("p", { text: "Aucun secret d'intégration n'est conservé dans le navigateur." })])])
      ])
    ])
  ]);

  function mapCloudEvent(event) {
    const labels = {
      share_created: { icon: "share-2", title: "Partage créé", description: `Le partage "${event.details?.fileName || ""}" est actif.` },
      share_downloaded: { icon: "download", title: "Téléchargement partagé", description: `Quelqu'un a téléchargé "${event.details?.fileName || ""}".` },
      share_revoked: { icon: "shield-off", title: "Partage révoqué", description: "Un lien de partage a été désactivé." },
      drop_received: { icon: "upload", title: "Fichier reçu via drop", description: `"${event.details?.name || ""}" a été déposé.` },
      file_brain: { icon: "sparkles", title: "Analyse Brain", description: `Brain a analysé "${event.details?.fileName || ""}".` },
      file_favorite: { icon: "star", title: "Favori ajouté", description: `"${event.details?.fileName || ""}" ajouté aux favoris.` },
      file_unfavorite: { icon: "star-off", title: "Favori retiré", description: `"${event.details?.fileName || ""}" retiré des favoris.` }
    };
    const meta = labels[event.eventType] || { icon: "activity", title: "Événement Cloud", description: String(event.eventType || "") };
    return {
      id: `cloud-activity-${event.id}`,
      source: "files",
      category: "productivity",
      icon: meta.icon,
      title: meta.title,
      description: meta.description,
      timestamp: event.createdAt || new Date().toISOString(),
      tone: "file",
      cloud: true
    };
  }

  async function fetchCloudActivity() {
    if (!externalServices?.cloudActivity?.list) return;
    try {
      const since = cloudSummary?.latest?.createdAt || "";
      const result = await externalServices.cloudActivity.list({ limit: 50, since });
      const events = Array.isArray(result?.data?.events) ? result.data.events : [];
      cloudEvents = events.map(mapCloudEvent);
      if (externalServices?.cloudActivity?.summary) {
        const summary = await externalServices.cloudActivity.summary();
        cloudSummary = summary?.data || { count: 0, latest: null };
      }
      render();
    } catch (err) {
      if (globalThis.console) globalThis.console.error("[activity] cloud activity fetch failed:", err);
    }
  }

  function renderCustomizePanel() {
    customizeHost.hidden = !customizeOpen;
    customizeToggle.setAttribute("aria-expanded", String(customizeOpen));
    if (!customizeOpen) return;
    customizeHost.replaceChildren(...liveLayout.order.map((id, index) => customizeRow(id, index, liveLayout.order.length, liveLayout.hidden.includes(id))));
    refreshIcons();
  }

  function render() {
    const snapshot = repository.snapshot();
    const events = [...journal.entries(), ...cloudEvents];
    const context = {
      actions,
      translateSource,
      onFilter: (category) => { activeFilter = category; query = ""; search.value = ""; render(); },
      onOpen: (route, url) => {
        if (url) window.open(String(url), "_blank", "noopener,noreferrer");
        else if (route) actions.dispatch?.(route);
      }
    };
    const filterHash = `${activeFilter}:${query}:${order}`;
    if (filterHash !== lastFilterHash) {
      visibleCount = PAGE_SIZE;
      lastFilterHash = filterHash;
    }
    const filtered = sortEvents(events.filter((event) => eventMatches(event, activeFilter) && eventMatchesQuery(event, query)), order);
    const paged = filtered.slice(0, visibleCount);
    const hasMore = visibleCount < filtered.length;
    const connections = snapshot.connections || [];
    const connected = connections.filter((connection) => connection.status === "connected");

    const systemCard = element("article", { className: "v8-now-card v8-now-card--system v8-surface" }, [
      element("div", { className: "v8-now-card__top" }, [element("span", { className: "v8-now-card__icon" }, [icon("orbit")]), element("span", { className: "v8-live-pill" }, [element("i", { attributes: { "aria-hidden": "true" } }), "LOCAL"])]),
      element("div", { className: "v8-now-card__copy" }, [element("small", { text: "ETHONE" }), element("strong", { text: `${state.flow || "Essentiel"} dans ${state.space || "personal"}` }), element("p", { text: "Le journal local reagit aux actions utiles sans tracker global." })]),
      element("footer", {}, [element("span", { text: "Actif maintenant" }), icon("check")])
    ]);
    const spotifyPlayer = spotifyLiveCard(spotifyPlayback, { variant: "activity", command: (action) => spotifyLive?.command?.(action, spotifyPlayback.trackId) });
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
    Object.values(categoryGrids).forEach(grid => grid.replaceChildren());
    liveLayout.order.forEach((id) => {
      if (liveLayout.hidden.includes(id)) return;
      const card = knownCards[id];
      if (card) categoryGrids[getCategory(id)].append(card);
    });
    
    // Hide empty categories
    Object.keys(categorySections).forEach(cat => {
      categorySections[cat].hidden = categoryGrids[cat].children.length === 0;
    });
    
    const representedByOtherCards = new Set(["riot"]);
    connected.filter((connection) => !Object.hasOwn(knownCards, connection.id) && !representedByOtherCards.has(connection.id)).slice(0, 3).forEach((connection) => {
      const integration = integrationById(connection.id);
      if (!integration) return;
      categoryGrids.productivity.append(liveCard(integration, connection, events.find((event) => event.source === integration.id)));
    });
    systemCard.classList.toggle("v8-now-card--solo", categoryGrids.productivity.children.length === 1 && categoryGrids.gaming.children.length === 0 && categoryGrids.social.children.length === 0);
    renderCustomizePanel();
    if (!connected.length) categoryGrids.productivity.append(statusState("integration", {
      title: "Aucune source distante active",
      description: "Configurez un service pour enrichir le Live Feed sans données fictives.",
      actions: [actionButton({ actionId: "v8.connections.open", variant: "secondary" }, [element("span", { text: "Configurer" }), icon("arrow-up-right")])],
      compact: true,
      className: "v8-empty-state--wide"
    }));

    const timelineChildren = paged.length ? paged.map((event) => timelineEntry(event, context)) : [emptyFeed(activeFilter === "all" && !query ? null : () => {
      activeFilter = "all";
      query = "";
      search.value = "";
      render();
    })];
    if (hasMore) {
      const remaining = filtered.length - visibleCount;
      loadMore.textContent = `${translateSource("Charger plus")}${remaining > 0 ? ` (+${remaining})` : ""}`;
      timelineChildren.push(loadMore);
    }
    timeline.replaceChildren(...timelineChildren);
    filterBar.querySelectorAll("[data-activity-filter]").forEach((button) => {
      const active = button.dataset.activityFilter === activeFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    countLabel.textContent = `${paged.length} / ${filtered.length} ${filtered.length > 1 ? "signaux" : "signal"}`;
    connectionMetric.textContent = String(connected.length);
    signalMetric.textContent = String(events.length);
    cloudMetric.textContent = String(cloudEvents.length + (cloudSummary?.count || 0));
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
      fetchCloudActivity().catch(() => {});
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
    notify({ id: "activity-refreshed", title: "Activity Hub", message: "Le flux local est à jour.", type: "success" });
    return completed("Flux actualisé");
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
  fetchCloudActivity().catch(() => {});
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
    weatherDetail.destroy();
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
