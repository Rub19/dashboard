import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState, buildEmptyState } from "../ui/empty-state.mjs";
import { refreshIcons, scheduleIconRefresh } from "../ui/icons.mjs";
import { spotifyLiveCard } from "../ui/spotify-live.mjs";
import { discordLiveCard } from "../ui/discord-live.mjs";
import { weatherLiveCard } from "../ui/weather-live.mjs";
import { createWeatherDetail } from "../ui/weather-detail.mjs";
import { createBillsManager } from "../services/bills-manager.mjs";
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
import { billsLiveCard } from "../ui/bills-widget.mjs";
import { localeTag } from "../i18n/catalog.mjs";
import { LIVE_CARD_IDS } from "../core/store.mjs";

const HOME_SECTIONS = Object.freeze([
  { id: "continuity", label: "Continuité" },
  { id: "daystream", label: "Fil de la journée" },
  { id: "recent", label: "Travail récent" },
  { id: "productivity", label: "Productivité" },
  { id: "signals", label: "Signal système" },
  { id: "recommendation", label: "Recommandation" },
  { id: "brain", label: "Brain" },
  { id: "live", label: "Widgets en direct" }
]);

const HOME_LIVE_CARD_META = Object.freeze({
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
  reddit: Object.freeze({ label: "Reddit", icon: "message-circle" }),
  bills: Object.freeze({ label: "Factures", icon: "receipt" })
});
const HOME_LIVE_CARD_IDS = Object.freeze(LIVE_CARD_IDS.filter((id) => id !== "system"));

function homeMoveButton(id, direction, disabled, label) {
  const button = actionButton({ actionId: "v8.home.live.move", className: "v8-icon-button", ariaLabel: label, disabled }, [icon(direction === "up" ? "chevron-up" : "chevron-down")]);
  button.dataset.liveCard = id;
  button.dataset.direction = direction;
  return button;
}

function homeVisibilityButton(id, hidden) {
  const meta = HOME_LIVE_CARD_META[id];
  const button = actionButton({ actionId: "v8.home.live.toggle", className: "v8-icon-button", ariaLabel: hidden ? `Afficher ${meta.label}` : `Masquer ${meta.label}` }, [icon(hidden ? "eye-off" : "eye")]);
  button.dataset.liveCard = id;
  return button;
}

function homeCustomizeRow(id, index, total, hidden) {
  const meta = HOME_LIVE_CARD_META[id];
  return element("div", { className: `v8-home-live-customize-row${hidden ? " is-hidden" : ""}` }, [
    element("span", { className: "v8-home-live-customize-row__label" }, [icon(meta.icon), element("span", { text: meta.label })]),
    element("div", { className: "v8-home-live-customize-row__actions" }, [
      homeMoveButton(id, "up", index === 0, `Monter ${meta.label}`),
      homeMoveButton(id, "down", index === total - 1, `Descendre ${meta.label}`),
      homeVisibilityButton(id, hidden)
    ])
  ]);
}

function formattedDate(isoDate) {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(localeTag(), {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
}

function summaryMetric(iconName, value, label) {
  const numericValue = Number.parseInt(value, 10);
  return element("div", { className: "v8-summary-metric", dataset: { liveWidget: "metric", liveKind: "metric" } }, [
    icon(iconName),
    element("strong", { text: value, dataset: { liveNumber: Number.isFinite(numericValue) ? numericValue : null } }),
    element("span", { text: label })
  ]);
}

function timelineEntry(iconName, title, meta) {
  return element("button", { className: "v8-day-entry", dataset: { action: "v8.tasks.open", liveWidget: "timeline" } }, [
    element("div", { className: "v8-day-entry__icon" }, [icon(iconName)]),
    element("div", { className: "v8-day-entry__content" }, [
      element("strong", { text: title }),
      element("span", { text: meta })
    ]),
    element("div", { className: "v8-day-entry__arrow" }, [icon("chevron-right")])
  ]);
}

const AURA_THEMES = Object.freeze([
  { id: "default", label: "Aura ETHONE", icon: "sparkles", desc: "Équilibre naturel argenté" },
  { id: "boreale", label: "Boréale", icon: "zap", desc: "Cyan vif & Violet profond" },
  { id: "cyberpunk", label: "Cyberpunk", icon: "flame", desc: "Magenta néon & Émeraude" },
  { id: "eclipse", label: "Éclipse", icon: "moon-star", desc: "Or chaud & Noir stellaire" },
  { id: "emeraude", label: "Émeraude", icon: "gem", desc: "Vert émeraude & Saphir" },
  { id: "minerale", label: "Minérale", icon: "layers-3", desc: "Ardoise brute & Platine" }
]);

function getActiveAura() {
  try { return globalThis.localStorage?.getItem("v8_home_aura") || "default"; } catch { return "default"; }
}

function getHomeSectionLayout() {
  try {
    const raw = globalThis.localStorage?.getItem("v8_home_sections");
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.hidden)) return parsed;
  } catch { /* silent */ }
  return { hidden: [] };
}

function setHomeSectionLayout(layout) {
  try { globalThis.localStorage?.setItem("v8_home_sections", JSON.stringify(layout)); } catch { /* silent */ }
}

function setActiveAura(id) {
  try { globalThis.localStorage?.setItem("v8_home_aura", id); } catch { /* silent */ }
  if (id === "default") {
    delete document.documentElement.dataset.aura;
  } else {
    document.documentElement.dataset.aura = id;
  }
}

function homeAuraSelectorRow(currentAura, onSelect) {
  const buttons = AURA_THEMES.map((theme) => {
    const active = currentAura === theme.id;
    const btn = element("button", {
      className: `v8-aura-option${active ? " is-active" : ""}`,
      attributes: { type: "button", title: theme.desc }
    }, [
      icon(theme.icon),
      element("span", { text: theme.label })
    ]);
    btn.addEventListener("click", () => onSelect(theme.id));
    return btn;
  });
  return element("div", { className: "v8-home-aura-selector" }, [
    element("header", { className: "v8-home-aura-selector__header" }, [
      icon("palette"),
      element("strong", { text: "Ambiance visuelle (Aura)" }),
      element("span", { className: "v8-eyebrow", text: "Glassmorphism" })
    ]),
    element("div", { className: "v8-home-aura-selector__grid" }, buttons)
  ]);
}

function createHomeProductivitySection(model, onCustomize) {
  const openCount = model.summary.openTasks || 0;
  const totalTasks = openCount + 3;
  const completed = Math.max(0, totalTasks - openCount);
  const percentage = Math.round((completed / Math.max(1, totalTasks)) * 100);

  const taskMetric = element("div", { className: "v8-productivity-metric" }, [
    element("span", { className: "v8-productivity-metric__title" }, [icon("circle-check-big"), element("span", { text: "Tâches accomplies" })]),
    element("span", { className: "v8-productivity-metric__value", text: `${percentage}%` }),
    element("div", { className: "v8-productivity-bar" }, [
      element("div", { className: "v8-productivity-bar__fill", attributes: { style: `width: ${percentage}%` } })
    ])
  ]);

  const memoryMetric = element("div", { className: "v8-productivity-metric" }, [
    element("span", { className: "v8-productivity-metric__title" }, [icon("notebook-pen"), element("span", { text: "Notes actives" })]),
    element("span", { className: "v8-productivity-metric__value", text: `${model.summary.notes || 0}` }),
    element("small", { text: "Synchronisé au cloud" })
  ]);

  const customizeBtn = actionButton({ actionId: "v8.home.customize", variant: "secondary" }, [
    icon("palette"),
    element("span", { text: "Thèmes & Aura" })
  ]);
  customizeBtn.addEventListener("click", onCustomize);

  return element("section", { className: "v8-home-section v8-productivity-card" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "Performances" }), element("h2", { text: "Productivité & Rythme" })]),
      element("span", { className: "v8-badge v8-badge--accent" }, [icon("zap"), "En direct"])
    ]),
    element("div", { className: "v8-productivity-card__metrics" }, [taskMetric, memoryMetric]),
    element("div", { className: "v8-productivity-actions" }, [
      customizeBtn,
      actionButton({ actionId: "v8.tasks.open", className: "v8-toolbar-button", ariaLabel: "Ouvrir les tâches" }, [icon("arrow-right")])
    ])
  ]);
}

function briefingSignal(item) {
  const meta = item.metaValue
    ? [element("b", { text: item.metaValue, attributes: { translate: "no" } }), ` ${item.detail}`]
    : item.detail;
  const button = actionButton({
    actionId: item.actionId,
    className: `v8-briefing-signal is-${item.state}`,
    ariaLabel: `${item.label}: ${item.value}`
  }, [
    element("span", { className: "v8-briefing-signal__icon" }, [icon(item.icon)]),
    element("span", { className: "v8-briefing-signal__copy" }, [
      element("span", { text: item.label }),
      element("strong", { text: item.value, attributes: item.userContent ? { translate: "no" } : {} }),
      element("small", {}, meta)
    ])
  ]);
  button.dataset.liveWidget = "signal";
  button.dataset.liveKind = item.id;
  return button;
}

export function mountHome(stage, model, options = {}) {
  setActiveAura(getActiveAura());
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
  const billsManager = createBillsManager({ runtime: globalThis, storage: globalThis.localStorage });
  const presence = options.presence || null;
  const scopedActions = [];
  let personalizeOpen = false;
  let liveLayout = options.homeLiveLayout || Object.freeze({ order: HOME_LIVE_CARD_IDS, hidden: Object.freeze([]) });
  let customizeOpen = false;
  const cardAvailability = new Map();
  const briefingEnabled = options.brainPreferences?.enabled !== false && options.brainPreferences?.briefing?.enabled !== false;
  const continuation = model.nextTasks[0]
    ? { type: "Tâche prioritaire", title: model.nextTasks[0].title, action: "v8.tasks.open", button: "Continuer", icon: "circle-check-big" }
    : model.recentNotes[0]
      ? { type: "Dernière note", title: model.recentNotes[0].title, action: "v8.notes.open", button: "Reprendre", icon: "notebook-pen" }
      : { type: "Nouvel espace", title: "Votre journée peut commencer ici.", action: "v8.command.open", button: "Ouvrir le Command Center", icon: "sparkles", userContent: false };
  if (model.nextTasks[0] || model.recentNotes[0]) continuation.userContent = true;

  const SESSION_MODES = [
    { id: "focus", label: "🚀 Session Focus", copy: "Optimisé pour votre concentration." },
    { id: "intense", label: "⚡ Haute Productivité", copy: "Rythme soutenu et suivi en temps réel." },
    { id: "zen", label: "☕ Pause & Réflexion", copy: "Ambiance apaisée pour vos notes et idées." },
    { id: "night", label: "🌙 Veille Tranquille", copy: "Confort visuel pour sessions tardives." }
  ];
  let currentSessionMode = globalThis.localStorage?.getItem("v8_home_session_mode") || "focus";
  const activeSessionMeta = SESSION_MODES.find((m) => m.id === currentSessionMode) || SESSION_MODES[0];
  const sessionModeButton = element("button", {
    className: "v8-session-badge",
    attributes: { type: "button", title: "Cliquer pour changer le rythme de session", "aria-label": "Changer le mode de session" }
  }, [
    element("span", { className: "v8-session-badge__icon", text: activeSessionMeta.label.split(" ")[0] }),
    element("span", { className: "v8-session-badge__label", text: activeSessionMeta.label.split(" ").slice(1).join(" ") }),
    icon("chevron-right")
  ]);
  const heroSubtitle = element("p", { text: `${model.context.tone} — ${activeSessionMeta.copy}` });
  sessionModeButton.addEventListener("click", () => {
    const currentIndex = SESSION_MODES.findIndex((m) => m.id === currentSessionMode);
    const nextIndex = (currentIndex + 1) % SESSION_MODES.length;
    const nextMode = SESSION_MODES[nextIndex];
    currentSessionMode = nextMode.id;
    globalThis.localStorage?.setItem("v8_home_session_mode", nextMode.id);
    document.documentElement.dataset.sessionMode = nextMode.id;
    const iconSpan = sessionModeButton.querySelector(".v8-session-badge__icon");
    const labelSpan = sessionModeButton.querySelector(".v8-session-badge__label");
    if (iconSpan) iconSpan.textContent = nextMode.label.split(" ")[0];
    if (labelSpan) labelSpan.textContent = nextMode.label.split(" ").slice(1).join(" ");
    heroSubtitle.textContent = `${model.context.tone} — ${nextMode.copy}`;
    options.actions?.notify?.({ id: "session-mode-switch", title: "Rythme de session", message: `Mode « ${nextMode.label} » activé.`, type: "success" });
  });

  const heading = element("header", { className: "v8-page-heading v8-home-heading" }, [
    element("div", { className: "v8-page-heading__copy" }, [
      element("div", { className: "v8-page-heading__meta" }, [
        element("span", { className: "v8-eyebrow", text: formattedDate(model.generatedAt), attributes: { translate: "no" } }),
        sessionModeButton
      ]),
      element("h1", { text: `${model.context.greeting}, ${model.user.name}.` }),
      heroSubtitle
    ]),
    element("div", { className: "v8-page-heading__actions" }, [
      actionButton({ actionId: "v8.notes.new", variant: "secondary" }, [icon("file-plus-2"), element("span", { text: "Nouvelle note" })]),
      actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("command"), element("span", { text: "Command Center" })]),
      actionButton({ actionId: "v8.home.personalize", className: "v8-icon-button", ariaLabel: "Personnaliser le tableau de bord" }, [icon("sliders-horizontal")])
    ])
  ]);

  const quickActions = element("section", { className: "v8-quick-actions", "aria-label": "Actions rapides" }, [
    element("span", { className: "v8-quick-actions__label", text: "Actions rapides" }),
    element("div", { className: "v8-quick-actions__bar" }, [
      actionButton({ actionId: "v8.notes.new", variant: "ghost", className: "v8-quick-action", ariaLabel: "Nouvelle note" }, [icon("file-plus-2"), element("span", { text: "Note" })]),
      actionButton({ actionId: "v8.tasks.new", variant: "ghost", className: "v8-quick-action", ariaLabel: "Nouvelle tâche" }, [icon("list-plus"), element("span", { text: "Tâche" })]),
      actionButton({ actionId: "v8.calendar.new", variant: "ghost", className: "v8-quick-action", ariaLabel: "Nouvel événement" }, [icon("calendar-plus"), element("span", { text: "Événement" })]),
      actionButton({ actionId: "v8.brain.open", variant: "ghost", className: "v8-quick-action", ariaLabel: "Ouvrir Brain" }, [icon("brain"), element("span", { text: "Brain" })]),
      actionButton({ actionId: "v8.focus.start.pomodoro", variant: "ghost", className: "v8-quick-action", ariaLabel: "Démarrer un Pomodoro" }, [icon("timer"), element("span", { text: "Pomodoro" })])
    ])
  ]);

  const continuity = element("section", { className: "v8-continuity v8-surface v8-home-float v8-home-float--hero" }, [
    element("div", { className: "v8-continuity__signal", attributes: { "aria-hidden": "true" } }),
      element("span", { className: "v8-continuity__monogram", text: "8", attributes: { "aria-hidden": "true" } }),
    element("div", { className: "v8-continuity__top" }, [
      element("span", { className: "v8-eyebrow", text: "Continuité" }),
      element("span", { className: "v8-badge v8-badge--accent" }, [icon("activity"), "Prêt"])
    ]),
    element("div", { className: "v8-continuity__body" }, [
      element("span", { className: "v8-continuity__icon" }, [icon(continuation.icon)]),
      element("span", { className: "v8-continuity__type", text: continuation.type }),
      element("h2", { text: continuation.title, attributes: continuation.userContent ? { translate: "no" } : {} }),
      element("p", { text: "ETHONE garde le contexte à portée de main, sans charger le reste du système." }),
      actionButton({ actionId: continuation.action, variant: "primary" }, [element("span", { text: continuation.button }), icon("arrow-up-right")])
    ]),
    element("div", { className: "v8-continuity__metrics" }, [
      summaryMetric("circle-check-big", model.summary.openTasks, "à faire"),
      summaryMetric("calendar-days", model.summary.todayEvents, "aujourd'hui"),
      summaryMetric("notebook-pen", model.summary.notes, "notes")
    ])
  ]);

  const dayList = element("ul", { className: "v8-daystream__list" });
  model.todayEvents.forEach((event) => dayList.append(timelineEntry("calendar-days", event.title, "Événement aujourd'hui")));
  model.nextTasks.slice(0, 3).forEach((task) => dayList.append(timelineEntry("circle", task.title, task.due || "À planifier")));
  if (!dayList.children.length) {
    dayList.append(emptyState({
      tagName: "li",
      role: "listitem",
      iconName: "coffee",
      eyebrow: "Temps disponible",
      title: "Aucun impératif",
      description: "Votre journée est libre pour avancer à votre rythme.",
      actions: [actionButton({ actionId: "v8.tasks.new", variant: "secondary" }, [icon("plus"), element("span", { text: "Ajouter une tâche" })])],
      compact: true
    }));
  }

  const daystream = element("aside", { className: "v8-daystream v8-home-float v8-home-float--timeline" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "Maintenant" }), element("h2", { text: "Fil de la journée" })]),
      actionButton({ actionId: "v8.calendar.open", className: "v8-icon-button", ariaLabel: "Ouvrir le calendrier" }, [icon("arrow-up-right")])
    ]),
    dayList
  ]);

  const recent = element("section", { className: "v8-home-section" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "Mémoire synchronisée" }), element("h2", { text: "Travail récent" })]),
      actionButton({ actionId: "v8.notes.open", className: "v8-toolbar-button", ariaLabel: "Voir toutes les notes" }, [icon("arrow-right")])
    ])
  ]);
  const recentList = element("div", { className: "v8-recent-list" });
  if (model.recentNotes.length) {
    model.recentNotes.forEach((note) => {
      recentList.append(actionButton({ actionId: "v8.notes.open", className: "v8-recent-row" }, [
        element("span", { className: "v8-recent-row__icon" }, [icon("file-text")]),
        element("span", { className: "v8-recent-row__copy" }, [element("strong", { text: note.title, attributes: { translate: "no" } }), element("small", { text: note.updatedAt ? "Modifiée récemment" : "Note récente" })]),
        icon("chevron-right")
      ]));
    });
  } else {
    recentList.append(emptyState({
      iconName: "notebook-tabs",
      eyebrow: "Mémoire synchronisée",
      title: "Aucune note récente",
      description: "Capturez une idée pour la retrouver ici au prochain passage.",
      actions: [actionButton({ actionId: "v8.notes.new", variant: "primary" }, [icon("plus"), element("span", { text: "Créer une note" })])],
      inline: true
    }));
  }
  recent.append(recentList);

  const cloudDetail = element("small", { text: "Connexion Supabase" });
  const cloudValue = element("b", { text: "Connexion" });
  const networkDetail = element("small", { text: "Disponible" });
  const networkValue = element("b", { text: "En ligne" });
  const signals = element("section", { className: "v8-home-section v8-system-signals" }, [
    element("header", { className: "v8-section-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "État" }), element("h2", { text: "Signal système" })]),
      element("span", { className: "v8-badge" }, [element("span", { className: "v8-live-dot", attributes: { "aria-hidden": "true" } }), "Stable"])
    ]),
    element("div", { className: "v8-signal-list" }, [
      element("div", { className: "v8-signal-row" }, [icon("layers-3"), element("span", {}, [element("strong", { text: "Interface" }), element("small", { text: "Runtime unifié" })]), element("b", { text: "Actif" })]),
      element("div", { className: "v8-signal-row" }, [icon("database"), element("span", {}, [element("strong", { text: "Données" }), cloudDetail]), cloudValue]),
      element("div", { className: "v8-signal-row" }, [icon("wifi"), element("span", {}, [element("strong", { text: "Réseau" }), networkDetail]), networkValue])
    ])
  ]);

  function deriveBrainSuggestion() {
    const highTask = model.nextTasks.find((task) => task.priority === "high");
    const nextTask = highTask || model.nextTasks[0];
    if (nextTask) {
      return { title: `Focus recommandé : ${nextTask.title}`, detail: "Votre prochaine action prioritaire. Un focus de 25 min ferait avancer la journée.", actionId: "v8.focus.start.pomodoro", icon: "timer", label: "Focus 25m", userContent: true };
    }
    if (model.todayEvents.length) {
      const event = model.todayEvents[0];
      return { title: "Prochain événement", detail: event.title, actionId: "v8.calendar.open", icon: "calendar-days", label: "Calendrier" };
    }
    if (model.recentNotes.length) {
      const note = model.recentNotes[0];
      return { title: `Continuer ${note.title}`, detail: "Reprendre votre dernière note là où vous l'avez laissée.", actionId: "v8.notes.open", icon: "notebook-pen", label: "Reprendre", userContent: true };
    }
    return { title: "Brain est disponible", detail: "Dites un objectif, une idée ou une question. Brain vous guide vers la prochaine action.", actionId: "v8.brain.open", icon: "brain", label: "Ouvrir Brain" };
  }

  const brainSuggestion = briefingEnabled ? deriveBrainSuggestion() : model.briefing.suggestion;
  const brainStrip = element("section", { className: "v8-home-brain v8-surface", dataset: { liveWidget: "brain", liveKind: "brain" } }, [
    element("span", { className: "v8-home-brain__icon" }, [icon("brain")]),
    element("div", { className: "v8-home-brain__copy" }, [
      element("span", { className: "v8-eyebrow", text: model.briefing.title }),
      element("strong", { text: brainSuggestion.title }),
      element("p", { text: brainSuggestion.detail, attributes: brainSuggestion.userContent ? { translate: "no" } : {} })
    ]),
    actionButton({ actionId: brainSuggestion.actionId, variant: "secondary" }, [icon(brainSuggestion.icon), element("span", { text: brainSuggestion.label })]),
    actionButton({ actionId: "v8.brain.open", className: "v8-icon-button", ariaLabel: "Ouvrir Brain" }, [icon("arrow-up-right")]),
    element("div", { className: "v8-home-brain__signals", attributes: { "aria-label": model.briefing.summary } }, model.briefing.items.map(briefingSignal))
  ]);

  function recommendationReason(text) {
    return element("span", { className: "v8-home-recommendation__reason", text });
  }

  const recommendation = model.recommendation;
  const recommendationStrip = element("section", { className: "v8-home-recommendation v8-surface", dataset: { liveWidget: "recommendation", liveKind: "recommendation" } }, [
    element("span", { className: "v8-home-recommendation__icon" }, [icon(recommendation.icon || "sparkles")]),
    element("div", { className: "v8-home-recommendation__copy" }, [
      element("span", { className: "v8-eyebrow", text: "Recommandation" }),
      element("strong", { text: recommendation.title }),
      element("p", { text: recommendation.detail })
    ]),
    actionButton({ actionId: recommendation.actionId, variant: "primary" }, [icon("arrow-up-right"), element("span", { text: recommendation.label })]),
    recommendation.reasons.length ? element("div", { className: "v8-home-recommendation__reasons" }, recommendation.reasons.map(recommendationReason)) : null
  ]);

  const spotifyHost = element("section", { className: "v8-home-spotify-host", attributes: { "aria-label": "Spotify Live", hidden: true } });
  const discordHost = element("section", { className: "v8-home-discord-host", attributes: { "aria-label": "Presence Discord", hidden: true } });
  const weatherHost = element("section", { className: "v8-home-weather-host", attributes: { "aria-label": "Météo", hidden: true } });
  const minecraftHost = element("section", { className: "v8-home-minecraft-host", attributes: { "aria-label": "Profil Minecraft", hidden: true } });
  const steamHost = element("section", { className: "v8-home-steam-host", attributes: { "aria-label": "Presence Steam", hidden: true } });
  const githubHost = element("section", { className: "v8-home-github-host", attributes: { "aria-label": "Profil GitHub", hidden: true } });
  const googleCalendarHost = element("section", { className: "v8-home-google-calendar-host", attributes: { "aria-label": "Google Calendar", hidden: true } });
  const notionHost = element("section", { className: "v8-home-notion-host", attributes: { "aria-label": "Notion", hidden: true } });
  const todoistHost = element("section", { className: "v8-home-todoist-host", attributes: { "aria-label": "Todoist", hidden: true } });
  const valorantHost = element("section", { className: "v8-home-valorant-host", attributes: { "aria-label": "Valorant", hidden: true }, dataset: { priority: "low" } });
  const lolHost = element("section", { className: "v8-home-lol-host", attributes: { "aria-label": "League of Legends", hidden: true }, dataset: { priority: "low" } });
  const twitchHost = element("section", { className: "v8-home-twitch-host", attributes: { "aria-label": "Twitch", hidden: true }, dataset: { priority: "low" } });
  const lastfmHost = element("section", { className: "v8-home-lastfm-host", attributes: { "aria-label": "Last.fm", hidden: true }, dataset: { priority: "low" } });
  const trackerHost = element("section", { className: "v8-home-tracker-host", attributes: { "aria-label": "Tracker.gg", hidden: true }, dataset: { priority: "low" } });
  const googleDriveHost = element("section", { className: "v8-home-google-drive-host", attributes: { "aria-label": "Google Drive", hidden: true } });
  const youtubeHost = element("section", { className: "v8-home-youtube-host", attributes: { "aria-label": "YouTube", hidden: true }, dataset: { priority: "low" } });
  const redditHost = element("section", { className: "v8-home-reddit-host", attributes: { "aria-label": "Reddit", hidden: true }, dataset: { priority: "low" } });
  const billsHost = element("section", { className: "v8-home-bills-host", attributes: { "aria-label": "Factures", hidden: true } });

  const HOST_BY_ID = Object.freeze({
    spotify: spotifyHost, discord: discordHost, weather: weatherHost, minecraft: minecraftHost, steam: steamHost,
    github: githubHost, "google-calendar": googleCalendarHost, notion: notionHost, todoist: todoistHost,
    valorant: valorantHost, lol: lolHost, twitch: twitchHost, lastfm: lastfmHost, "tracker-gg": trackerHost,
    "google-drive": googleDriveHost, youtube: youtubeHost, reddit: redditHost, bills: billsHost
  });

  function applyHostVisibility(id, host, hasContent) {
    cardAvailability.set(id, hasContent);
    host.hidden = !hasContent || liveLayout.hidden.includes(id);
  }

  function applyLiveOrder() {
    liveLayout.order.forEach((id) => {
      const host = HOST_BY_ID[id];
      if (host) {
        const cat = getCategoryForId(id);
        if (cat && categoryGrids[cat]) {
          categoryGrids[cat].append(host);
        }
      }
    });
  }

  function reapplyHiddenPreference() {
    Object.entries(HOST_BY_ID).forEach(([id, host]) => {
      host.hidden = !cardAvailability.get(id) || liveLayout.hidden.includes(id);
    });
    syncLiveGridVisibility();
  }

  function renderCustomizePanel() {
    customizeHost.hidden = !customizeOpen;
    customizeToggle.setAttribute("aria-expanded", String(customizeOpen));
    if (!customizeOpen) return;
    const currentAura = getActiveAura();
    const auraRow = homeAuraSelectorRow(currentAura, (newAura) => {
      setActiveAura(newAura);
      renderCustomizePanel();
    });
    const orderedIds = liveLayout.order.filter((id) => HOST_BY_ID[id]);
    const widgetRows = orderedIds.map((id, index) => homeCustomizeRow(id, index, orderedIds.length, liveLayout.hidden.includes(id)));
    customizeHost.replaceChildren(auraRow, element("div", { className: "v8-home-live-customize__list" }, widgetRows));
    refreshIcons();
  }

  function renderSpotify(playback, animate = false) {
    const command = (action) => spotifyLive?.command?.(action, playback.trackId);
    const player = spotifyLiveCard(playback, { variant: "home", command });
    spotifyHost.replaceChildren(...(player ? [player] : []));
    applyHostVisibility("spotify", spotifyHost, Boolean(player));
    if (player && animate) presence?.signalActivity?.(player, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderDiscord(presenceState, animate = false) {
    const card = discordLiveCard(presenceState, { variant: "home" });
    discordHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("discord", discordHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  const weatherDetail = createWeatherDetail();
  weatherHost.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-weather-detail-trigger]");
    if (!trigger) return;
    if (weatherDetail.isOpen()) { weatherDetail.close({ restoreFocus: true }); return; }
    weatherDetail.open(trigger, weatherLive?.state?.() || {});
  });

  function renderWeather(weatherState, animate = false) {
    const card = weatherLiveCard(weatherState, { variant: "home", detailable: true });
    weatherHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("weather", weatherHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderMinecraft(minecraftState, animate = false) {
    const card = minecraftLiveCard(minecraftState, { variant: "home" });
    minecraftHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("minecraft", minecraftHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderSteam(steamState, animate = false) {
    const card = steamLiveCard(steamState, { variant: "home" });
    steamHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("steam", steamHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderGithub(githubState, animate = false) {
    const card = githubLiveCard(githubState, { variant: "home" });
    githubHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("github", githubHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderGoogleCalendar(googleCalendarState, animate = false) {
    const card = googleCalendarLiveCard(googleCalendarState, { variant: "home" });
    googleCalendarHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("google-calendar", googleCalendarHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderNotion(notionState, animate = false) {
    const card = notionLiveCard(notionState, { variant: "home" });
    notionHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("notion", notionHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderTodoist(todoistState, animate = false) {
    const card = todoistLiveCard(todoistState, { variant: "home" });
    todoistHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("todoist", todoistHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderValorant(valorantState, animate = false) {
    const card = valorantLiveCard(valorantState, { variant: "home", onClick: () => { window.location.hash = "#/matches?game=valorant&mode=all"; } });
    valorantHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("valorant", valorantHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderLol(lolState, animate = false) {
    const card = lolLiveCard(lolState, { variant: "home", onClick: () => { window.location.hash = "#/matches?game=lol&mode=all"; } });
    lolHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("lol", lolHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderTwitch(twitchState, animate = false) {
    const card = twitchLiveCard(twitchState, { variant: "home" });
    twitchHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("twitch", twitchHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderLastfm(lastfmState, animate = false) {
    const card = lastfmLiveCard(lastfmState, { variant: "home" });
    lastfmHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("lastfm", lastfmHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderTracker(trackerState, animate = false) {
    const card = trackerLiveCard(trackerState, { variant: "home", onClick: () => { window.location.hash = "#/matches?game=apex&mode=all"; } });
    trackerHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("tracker-gg", trackerHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderGoogleDrive(googleDriveState, animate = false) {
    const card = googleDriveLiveCard(googleDriveState, { variant: "home" });
    googleDriveHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("google-drive", googleDriveHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderYoutube(youtubeState, animate = false) {
    const card = youtubeLiveCard(youtubeState, { variant: "home" });
    youtubeHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("youtube", youtubeHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderReddit(redditState, animate = false) {
    const card = redditLiveCard(redditState, { variant: "home" });
    redditHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("reddit", redditHost, Boolean(card));
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderBills() {
    const card = billsLiveCard(billsManager, {
      onAdd: (date) => {
        const today = new Date();
        const selected = date || today;
        const title = prompt("Nom de la facture", "Nouvelle facture");
        if (!title) return;
        const amount = Number.parseFloat(prompt("Montant", "9.99"));
        if (!Number.isFinite(amount) || amount <= 0) return;
        const categories = Object.keys(billsManager.categories);
        const category = prompt(`Catégorie (${categories.join(", ")})`, "other") || "other";
        const recurrences = Object.keys(billsManager.recurrences);
        const recurrence = prompt(`Récurrence (${recurrences.join(", ")})`, "oneoff") || "oneoff";
        billsManager.add({ title, amount, currency: "$", dueDate: selected, category, recurrence });
      },
      onScan: () => {
        const text = prompt("Colle ici un e-mail ou une fiche de facture");
        if (!text) return;
        billsManager.scan(text, options.externalServices).catch(() => null);
      }
    });
    billsHost.replaceChildren(...(card ? [card] : []));
    applyHostVisibility("bills", billsHost, Boolean(card));
    if (card) presence?.signalActivity?.(card, "system", { phase: "update" });
    scheduleIconRefresh();
    syncLiveGridVisibility();
  }

  function renderSystemStatus(status = options.sync?.status?.() || options) {
    const labels = { loading: "Connexion", saving: "Synchronisation", saved: "Synchronise", offline: "En attente", retrying: "Nouvelle tentative", error: "Erreur", expired: "Session expiree" };
    cloudDetail.textContent = status.syncStatus === "saved" ? "Source principale Supabase" : "État Supabase en temps reel";
    cloudValue.textContent = labels[status.syncStatus] || "Connexion";
    const offline = status.networkStatus === "offline" || globalThis.navigator?.onLine === false;
    networkDetail.textContent = offline ? "Changements mis en attente" : "Disponible";
    networkValue.textContent = offline ? "Hors ligne" : "En ligne";
  }

  const ambientField = element("div", { className: "v8-home-ambient", attributes: { "aria-hidden": "true" } }, [
    element("span", { className: "v8-home-ambient__wash" }),
    element("span", { className: "v8-home-ambient__light" })
  ]);

  const categoryGrids = {
    gaming: element("div", { className: "v8-home-live-grid" }),
    social: element("div", { className: "v8-home-live-grid" }),
    productivity: element("div", { className: "v8-home-live-grid" })
  };

  const categorySections = {
    gaming: element("div", { className: "v8-live-category" }, [
      element("h3", { className: "v8-live-category__title", text: "Gaming & Stats" }),
      categoryGrids.gaming
    ]),
    social: element("div", { className: "v8-live-category" }, [
      element("h3", { className: "v8-live-category__title", text: "Médias & Social" }),
      categoryGrids.social
    ]),
    productivity: element("div", { className: "v8-live-category" }, [
      element("h3", { className: "v8-live-category__title", text: "Productivité & Quotidien" }),
      categoryGrids.productivity
    ])
  };

  const getCategoryForId = (id) => {
    if (["valorant", "lol", "tracker-gg", "steam", "minecraft", "twitch"].includes(id)) return "gaming";
    if (["discord", "spotify", "lastfm", "youtube", "reddit"].includes(id)) return "social";
    return "productivity";
  };

  const customizeHost = element("div", { className: "v8-home-live-customize", attributes: { hidden: true } });
  const customizeToggle = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button", "aria-expanded": "false" } }, [icon("sliders-horizontal"), element("span", { text: "Personnaliser" })]);
  const liveEmptyHost = element("div", { className: "v8-home-live-empty", attributes: { hidden: true } });
  const liveSection = element("section", { className: "v8-home-live-section" }, [
    element("header", { className: "v8-home-live-heading" }, [
      element("div", {}, [element("span", { className: "v8-eyebrow", text: "En direct" }), element("h2", { text: "Vos widgets" })]),
      customizeToggle
    ]),
    customizeHost,
    liveEmptyHost,
    element("div", { className: "v8-home-live-categories" }, [
      categorySections.gaming,
      categorySections.social,
      categorySections.productivity
    ])
  ]);

  const productivitySection = createHomeProductivitySection(model, () => {
    customizeOpen = true;
    renderCustomizePanel();
    customizeHost.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const sectionNodes = {
    continuity,
    daystream,
    recent,
    productivity: productivitySection,
    signals,
    recommendation: recommendationStrip,
    brain: brainStrip,
    live: liveSection
  };
  const sectionLayout = getHomeSectionLayout();

  function applySectionLayout() {
    for (const [id, node] of Object.entries(sectionNodes)) {
      if (!node) continue;
      node.hidden = sectionLayout.hidden.includes(id);
    }
    syncLiveGridVisibility();
  }

  function sectionToggleRow(section) {
    const isHidden = sectionLayout.hidden.includes(section.id);
    const button = element("button", {
      className: `v8-home-section-toggle${isHidden ? " is-hidden" : ""}`,
      attributes: { type: "button" }
    }, [
      icon(isHidden ? "eye-off" : "eye"),
      element("span", { text: section.label })
    ]);
    button.addEventListener("click", () => {
      const index = sectionLayout.hidden.indexOf(section.id);
      if (index >= 0) sectionLayout.hidden.splice(index, 1);
      else sectionLayout.hidden.push(section.id);
      setHomeSectionLayout(sectionLayout);
      applySectionLayout();
      renderPersonalizePanel();
    });
    return button;
  }

  function renderPersonalizePanel() {
    if (!personalizeOpen) return;
    const list = element("div", { className: "v8-home-personalize__list" }, HOME_SECTIONS.map(sectionToggleRow));
    const header = element("header", { className: "v8-home-personalize__header" }, [
      element("strong", { text: "Personnaliser le tableau de bord" }),
      actionButton({ actionId: "v8.home.personalize.close", className: "v8-icon-button", ariaLabel: "Fermer" }, [icon("x")])
    ]);
    personalizePanel.replaceChildren(header, list);
    refreshIcons();
  }

  function togglePersonalize() {
    personalizeOpen = !personalizeOpen;
    personalizePanel.hidden = !personalizeOpen;
    if (personalizeOpen) renderPersonalizePanel();
  }

  scopedActions.push(options.actions?.scope?.("v8.home.personalize", togglePersonalize) || (() => {}));
  scopedActions.push(options.actions?.scope?.("v8.home.personalize.close", togglePersonalize) || (() => {}));

  const personalizePanel = element("section", { className: "v8-home-personalize", attributes: { hidden: "true", "aria-label": "Personnalisation du tableau de bord" } });

  const page = element("section", { className: `v8-page v8-home v8-home--${model.context.period}`, dataset: { page: "home" } }, [
    ambientField,
    heading,
    quickActions,
    personalizePanel,
    element("div", { className: "v8-home-primary" }, [continuity, daystream]),
    liveSection,
    recommendationStrip,
    briefingEnabled ? brainStrip : null,
    element("div", { className: "v8-home-secondary" }, [recent, productivitySection, signals])
  ]);
  stage.replaceChildren(page);
  applySectionLayout();
  renderSystemStatus();
  renderSpotify(spotifyLive?.state?.() || {});
  renderDiscord(discordLive?.state?.() || {});
  renderWeather(weatherLive?.state?.() || {});
  renderMinecraft(minecraftLive?.state?.() || {});
  renderSteam(steamLive?.state?.() || {});
  renderGithub(githubLive?.state?.() || {});
  renderGoogleCalendar(googleCalendarLive?.state?.() || {});
  renderNotion(notionLive?.state?.() || {});
  renderTodoist(todoistLive?.state?.() || {});
  renderValorant(valorantLive?.state?.() || {});
  renderLol(lolLive?.state?.() || {});
  renderTwitch(twitchLive?.state?.() || {});
  renderLastfm(lastfmLive?.state?.() || {});
  renderTracker(trackerLive?.state?.() || {});
  renderGoogleDrive(googleDriveLive?.state?.() || {});
  renderYoutube(youtubeLive?.state?.() || {});
  renderReddit(redditLive?.state?.() || {});
  renderBills();
  function syncLiveGridVisibility() {
    if (sectionLayout.hidden.includes("live")) {
      liveSection.hidden = true;
      return;
    }
    let allHidden = true;
    Object.keys(categorySections).forEach(cat => {
      const grid = categoryGrids[cat];
      const isHidden = [...grid.children].every((host) => host.hidden);
      categorySections[cat].hidden = isHidden;
      if (!isHidden) allHidden = false;
    });
    liveSection.hidden = false;
    liveEmptyHost.hidden = !allHidden;
    if (allHidden) {
      liveEmptyHost.replaceChildren(buildEmptyState({
        icon: "panels-top-left",
        title: "Aucun widget en direct",
        message: "Activez un service connecté pour voir vos widgets ici."
      }));
    }
  }
  applyLiveOrder();
  syncLiveGridVisibility();

  function updateCardSpotlight(event) {
    const card = event.target?.closest?.(".v8-home-live-grid > section > article");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--v8-spotlight-x", `${x}%`);
    card.style.setProperty("--v8-spotlight-y", `${y}%`);
  }
  liveSection.addEventListener("mousemove", updateCardSpotlight);

  customizeToggle.addEventListener("click", () => {
    customizeOpen = !customizeOpen;
    renderCustomizePanel();
  });
  const releaseSpotify = spotifyLive?.subscribe?.((playback) => renderSpotify(playback, true), { immediate: false }) || (() => {});
  const releaseDiscord = discordLive?.subscribe?.((presenceState) => renderDiscord(presenceState, true), { immediate: false }) || (() => {});
  const releaseWeather = weatherLive?.subscribe?.((weatherState) => renderWeather(weatherState, true), { immediate: false }) || (() => {});
  const releaseMinecraft = minecraftLive?.subscribe?.((minecraftState) => renderMinecraft(minecraftState, true), { immediate: false }) || (() => {});
  const releaseSteam = steamLive?.subscribe?.((steamState) => renderSteam(steamState, true), { immediate: false }) || (() => {});
  const releaseGithub = githubLive?.subscribe?.((githubState) => renderGithub(githubState, true), { immediate: false }) || (() => {});
  const releaseGoogleCalendar = googleCalendarLive?.subscribe?.((googleCalendarState) => renderGoogleCalendar(googleCalendarState, true), { immediate: false }) || (() => {});
  const releaseNotion = notionLive?.subscribe?.((notionState) => renderNotion(notionState, true), { immediate: false }) || (() => {});
  const releaseTodoist = todoistLive?.subscribe?.((todoistState) => renderTodoist(todoistState, true), { immediate: false }) || (() => {});
  const releaseValorant = valorantLive?.subscribe?.((valorantState) => renderValorant(valorantState, true), { immediate: false }) || (() => {});
  const releaseLol = lolLive?.subscribe?.((lolState) => renderLol(lolState, true), { immediate: false }) || (() => {});
  const releaseTwitch = twitchLive?.subscribe?.((twitchState) => renderTwitch(twitchState, true), { immediate: false }) || (() => {});
  const releaseLastfm = lastfmLive?.subscribe?.((lastfmState) => renderLastfm(lastfmState, true), { immediate: false }) || (() => {});
  const releaseTracker = trackerLive?.subscribe?.((trackerState) => renderTracker(trackerState, true), { immediate: false }) || (() => {});
  const releaseGoogleDrive = googleDriveLive?.subscribe?.((googleDriveState) => renderGoogleDrive(googleDriveState, true), { immediate: false }) || (() => {});
  const releaseYoutube = youtubeLive?.subscribe?.((youtubeState) => renderYoutube(youtubeState, true), { immediate: false }) || (() => {});
  const releaseReddit = redditLive?.subscribe?.((redditState) => renderReddit(redditState, true), { immediate: false }) || (() => {});
  const releaseSync = options.sync?.subscribe?.(renderSystemStatus) || (() => {});
  scopedActions.reverse().forEach((restore) => restore());
  const releaseLiveLayout = options.subscribeState?.((next) => {
    if (next.homeLiveLayout === liveLayout) return;
    liveLayout = next.homeLiveLayout || liveLayout;
    applyLiveOrder();
    reapplyHiddenPreference();
    if (customizeOpen) renderCustomizePanel();
  }) || (() => {});
  refreshIcons();
  return () => {
    scopedActions.reverse().forEach((restore) => restore());
    liveSection.removeEventListener("mousemove", updateCardSpotlight);
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
    const releaseBills = () => { };
    releaseBills();
    releaseSync();
    releaseLiveLayout();
    weatherDetail.destroy();
    page.remove();
  };
}
