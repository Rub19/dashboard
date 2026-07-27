import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { spotifyLiveCard } from "../ui/spotify-live.mjs";
import { discordLiveCard } from "../ui/discord-live.mjs";
import { weatherLiveCard } from "../ui/weather-live.mjs";
import { minecraftLiveCard } from "../ui/minecraft-live.mjs";
import { steamLiveCard } from "../ui/steam-live.mjs";
import { githubLiveCard } from "../ui/github-live.mjs";
import { localeTag } from "../i18n/catalog.mjs";

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
  return element("li", { className: "v8-day-entry", dataset: { liveWidget: "planning", liveKind: "planning" } }, [
    element("span", { className: "v8-day-entry__icon" }, [icon(iconName)]),
    element("div", {}, [element("strong", { text: title, attributes: { translate: "no" } }), element("span", { text: meta })])
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
  const spotifyLive = options.spotifyLive || null;
  const discordLive = options.discordLive || null;
  const weatherLive = options.weatherLive || null;
  const minecraftLive = options.minecraftLive || null;
  const steamLive = options.steamLive || null;
  const githubLive = options.githubLive || null;
  const presence = options.presence || null;
  const briefingEnabled = options.brainPreferences?.enabled !== false && options.brainPreferences?.briefing?.enabled !== false;
  const continuation = model.nextTasks[0]
    ? { type: "Tâche prioritaire", title: model.nextTasks[0].title, action: "v8.tasks.open", button: "Continuer", icon: "circle-check-big" }
    : model.recentNotes[0]
      ? { type: "Dernière note", title: model.recentNotes[0].title, action: "v8.notes.open", button: "Reprendre", icon: "notebook-pen" }
      : { type: "Nouvel espace", title: "Votre journée peut commencer ici.", action: "v8.command.open", button: "Ouvrir le Command Center", icon: "sparkles", userContent: false };
  if (model.nextTasks[0] || model.recentNotes[0]) continuation.userContent = true;

  const heading = element("header", { className: "v8-page-heading v8-home-heading" }, [
    element("div", { className: "v8-page-heading__copy" }, [
      element("span", { className: "v8-eyebrow", text: formattedDate(model.generatedAt), attributes: { translate: "no" } }),
      element("h1", { text: `${model.context.greeting}, ${model.user.name}.` }),
      element("p", { text: model.context.tone })
    ]),
    element("div", { className: "v8-page-heading__actions" }, [
      actionButton({ actionId: "v8.notes.new", variant: "secondary" }, [icon("file-plus-2"), element("span", { text: "Nouvelle note" })]),
      actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("command"), element("span", { text: "Command Center" })])
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

  const brainSuggestion = model.briefing.suggestion;
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

  const spotifyHost = element("section", { className: "v8-home-spotify-host", attributes: { "aria-label": "Spotify Live", hidden: true } });
  const discordHost = element("section", { className: "v8-home-discord-host", attributes: { "aria-label": "Presence Discord", hidden: true } });
  const weatherHost = element("section", { className: "v8-home-weather-host", attributes: { "aria-label": "Meteo", hidden: true } });
  const minecraftHost = element("section", { className: "v8-home-minecraft-host", attributes: { "aria-label": "Profil Minecraft", hidden: true } });
  const steamHost = element("section", { className: "v8-home-steam-host", attributes: { "aria-label": "Presence Steam", hidden: true } });
  const githubHost = element("section", { className: "v8-home-github-host", attributes: { "aria-label": "Profil GitHub", hidden: true } });

  function renderSpotify(playback, animate = false) {
    const player = spotifyLiveCard(playback, { variant: "home" });
    spotifyHost.replaceChildren(...(player ? [player] : []));
    spotifyHost.hidden = !player;
    if (player && animate) presence?.signalActivity?.(player, "system", { phase: "update" });
    refreshIcons();
  }

  function renderDiscord(presenceState, animate = false) {
    const card = discordLiveCard(presenceState, { variant: "home" });
    discordHost.replaceChildren(...(card ? [card] : []));
    discordHost.hidden = !card;
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    refreshIcons();
  }

  function renderWeather(weatherState, animate = false) {
    const card = weatherLiveCard(weatherState, { variant: "home" });
    weatherHost.replaceChildren(...(card ? [card] : []));
    weatherHost.hidden = !card;
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    refreshIcons();
  }

  function renderMinecraft(minecraftState, animate = false) {
    const card = minecraftLiveCard(minecraftState, { variant: "home" });
    minecraftHost.replaceChildren(...(card ? [card] : []));
    minecraftHost.hidden = !card;
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    refreshIcons();
  }

  function renderSteam(steamState, animate = false) {
    const card = steamLiveCard(steamState, { variant: "home" });
    steamHost.replaceChildren(...(card ? [card] : []));
    steamHost.hidden = !card;
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    refreshIcons();
  }

  function renderGithub(githubState, animate = false) {
    const card = githubLiveCard(githubState, { variant: "home" });
    githubHost.replaceChildren(...(card ? [card] : []));
    githubHost.hidden = !card;
    if (card && animate) presence?.signalActivity?.(card, "system", { phase: "update" });
    refreshIcons();
  }

  function renderSystemStatus(status = options.sync?.status?.() || options) {
    const labels = { loading: "Connexion", saving: "Synchronisation", saved: "Synchronise", offline: "En attente", retrying: "Nouvelle tentative", error: "Erreur", expired: "Session expiree" };
    cloudDetail.textContent = status.syncStatus === "saved" ? "Source principale Supabase" : "Etat Supabase en temps reel";
    cloudValue.textContent = labels[status.syncStatus] || "Connexion";
    const offline = status.networkStatus === "offline" || globalThis.navigator?.onLine === false;
    networkDetail.textContent = offline ? "Changements mis en attente" : "Disponible";
    networkValue.textContent = offline ? "Hors ligne" : "En ligne";
  }

  const ambientField = element("div", { className: "v8-home-ambient", attributes: { "aria-hidden": "true" } }, [
    element("span", { className: "v8-home-ambient__wash" }),
    element("span", { className: "v8-home-ambient__light" })
  ]);

  const page = element("section", { className: `v8-page v8-home v8-home--${model.context.period}`, dataset: { page: "home" } }, [
    ambientField,
    heading,
    element("div", { className: "v8-home-primary" }, [continuity, daystream]),
    spotifyHost,
    discordHost,
    weatherHost,
    minecraftHost,
    steamHost,
    githubHost,
    briefingEnabled ? brainStrip : null,
    element("div", { className: "v8-home-secondary" }, [recent, signals])
  ]);
  stage.replaceChildren(page);
  renderSystemStatus();
  renderSpotify(spotifyLive?.state?.() || {});
  renderDiscord(discordLive?.state?.() || {});
  renderWeather(weatherLive?.state?.() || {});
  renderMinecraft(minecraftLive?.state?.() || {});
  renderSteam(steamLive?.state?.() || {});
  renderGithub(githubLive?.state?.() || {});
  const releaseSpotify = spotifyLive?.subscribe?.((playback) => renderSpotify(playback, true), { immediate: false }) || (() => {});
  const releaseDiscord = discordLive?.subscribe?.((presenceState) => renderDiscord(presenceState, true), { immediate: false }) || (() => {});
  const releaseWeather = weatherLive?.subscribe?.((weatherState) => renderWeather(weatherState, true), { immediate: false }) || (() => {});
  const releaseMinecraft = minecraftLive?.subscribe?.((minecraftState) => renderMinecraft(minecraftState, true), { immediate: false }) || (() => {});
  const releaseSteam = steamLive?.subscribe?.((steamState) => renderSteam(steamState, true), { immediate: false }) || (() => {});
  const releaseGithub = githubLive?.subscribe?.((githubState) => renderGithub(githubState, true), { immediate: false }) || (() => {});
  const releaseSync = options.sync?.subscribe?.(renderSystemStatus) || (() => {});
  refreshIcons();
  return () => {
    releaseSpotify();
    releaseDiscord();
    releaseWeather();
    releaseMinecraft();
    releaseSteam();
    releaseGithub();
    releaseSync();
    page.remove();
  };
}
