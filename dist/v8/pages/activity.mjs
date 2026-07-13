import { integrationById } from "../data/integrations.mjs";
import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
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

function timelineEntry(event) {
  return element("article", { className: `v8-live-entry v8-live-entry--${event.tone || "default"}` }, [
    element("time", { className: "v8-live-entry__time", text: timeLabel(event.timestamp), attributes: { datetime: event.timestamp || null } }),
    element("span", { className: "v8-live-entry__node", attributes: { "aria-hidden": "true" } }),
    element("div", { className: "v8-live-entry__card" }, [
      element("span", { className: "v8-live-entry__icon" }, [icon(event.icon || "activity")]),
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
      element("span", { className: "v8-now-card__icon" }, [icon(integration.icon)]),
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
  const state = options.state || {};
  let activeFilter = "all";
  let refreshTimer = 0;
  const controller = new AbortController();

  const filterBar = element("div", { className: "v8-activity-filters", attributes: { role: "toolbar", "aria-label": "Filtrer l'activite" } });
  const liveGrid = element("div", { className: "v8-now-grid" });
  const timeline = element("div", { className: "v8-live-timeline", attributes: { role: "feed", "aria-label": "Flux d'activite" } });
  const countLabel = element("span", { className: "v8-section-count" });
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
      element("header", { className: "v8-section-heading" }, [element("div", {}, [element("span", { className: "v8-eyebrow", text: "En direct" }), element("h2", { text: "Live now" })]), element("span", { className: "v8-section-note", text: "Uniquement les sources reellement connectees" })]),
      liveGrid
    ]),
    element("div", { className: "v8-activity-workspace" }, [
      element("section", { className: "v8-activity-stream" }, [
        element("header", { className: "v8-activity-stream__header" }, [element("div", {}, [element("span", { className: "v8-eyebrow", text: "Chronologie" }), element("h2", { text: "Votre journee" })]), countLabel]),
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

  function render() {
    const snapshot = repository.snapshot();
    const events = journal.entries();
    const filtered = events.filter((event) => eventMatches(event, activeFilter));
    const connections = snapshot.connections || [];
    const connected = connections.filter((connection) => connection.status === "connected");

    liveGrid.replaceChildren(element("article", { className: "v8-now-card v8-now-card--system v8-surface" }, [
      element("div", { className: "v8-now-card__top" }, [element("span", { className: "v8-now-card__icon" }, [icon("orbit")]), element("span", { className: "v8-live-pill" }, [element("i", { attributes: { "aria-hidden": "true" } }), "LOCAL"])]),
      element("div", { className: "v8-now-card__copy" }, [element("small", { text: "ETHONE" }), element("strong", { text: `${state.flow || "Essentiel"} dans ${state.space || "personal"}` }), element("p", { text: "Le journal local reagit aux actions utiles sans tracker global." })]),
      element("footer", {}, [element("span", { text: "Actif maintenant" }), icon("check")])
    ]));
    connected.slice(0, 3).forEach((connection) => {
      const integration = integrationById(connection.id);
      if (!integration) return;
      liveGrid.append(liveCard(integration, connection, events.find((event) => event.source === integration.id)));
    });
    if (!connected.length) liveGrid.append(element("article", { className: "v8-now-connect v8-surface" }, [element("span", {}, [icon("plug")]), element("div", {}, [element("strong", { text: "Aucune source distante active" }), element("p", { text: "Configurez un service pour enrichir le Live Feed sans donnees fictives." })]), actionButton({ actionId: "v8.connections.open", variant: "secondary" }, [element("span", { text: "Configurer" }), icon("arrow-up-right")])]));

    timeline.replaceChildren(...(filtered.length ? filtered.map(timelineEntry) : [emptyFeed(activeFilter === "all" ? null : () => {
      activeFilter = "all";
      render();
    })]));
    filterBar.querySelectorAll("[data-activity-filter]").forEach((button) => {
      const active = button.dataset.activityFilter === activeFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    countLabel.textContent = `${filtered.length} signal${filtered.length > 1 ? "s" : ""}`;
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

  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-activity-filter]");
    if (!button) return;
    activeFilter = button.dataset.activityFilter || "all";
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
  stage.replaceChildren(page);
  render();
  scheduleRefresh();
  refreshIcons();

  return () => {
    controller.abort();
    if (refreshTimer) globalThis.clearTimeout(refreshTimer);
    refreshTimer = 0;
    releaseRefresh();
    releaseJournal();
    page.remove();
  };
}
