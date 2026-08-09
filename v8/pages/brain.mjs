import { actionButton, debounce, element, icon } from "../ui/dom.mjs";
import { showBottomSheet } from "../ui/bottom-sheet.mjs";
import { buildEmptyState, statusState } from "../ui/empty-state.mjs";
import { buildErrorState } from "../ui/error-state.mjs";
import { buildSkeletonList } from "../ui/skeleton.mjs";
import { createHomeModel } from "../data/home-model.mjs";
import { clearFieldState, formField, runFormSubmission, setFieldState } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { WORKSPACES, workspaceById } from "../data/workspaces.mjs";
import { NAVIGATION_ITEMS } from "../data/navigation.mjs";
import { brainPreferenceLabel } from "../brain/preferences.mjs";
import { AUTOMATION_ACTIONS, sanitizeAutomationTrigger, triggerLabel as automationTriggerLabel } from "../core/automation-engine.mjs";
import { createSelect } from "../ui/select.mjs";
import { downloadJson } from "../utils/download.mjs";

const TABS = Object.freeze([
  Object.freeze({ id: "chat", label: "Chat", icon: "message-circle" }),
  Object.freeze({ id: "context", label: "Contexte", icon: "scan-search" }),
  Object.freeze({ id: "memory", label: "Memoire", icon: "database" }),
  Object.freeze({ id: "actions", label: "Actions", icon: "zap" }),
  Object.freeze({ id: "automations", label: "Automations", icon: "workflow" }),
  Object.freeze({ id: "providers", label: "Providers", icon: "cpu" }),
  Object.freeze({ id: "privacy", label: "Confidentialité", icon: "shield-check" }),
  Object.freeze({ id: "history", label: "Historique", icon: "history" }),
  Object.freeze({ id: "diagnostics", label: "Diagnostics", icon: "activity" }),
  Object.freeze({ id: "wrapup", label: "Wrap-up", icon: "sunset" })
]);

const BRIEFING_SECTIONS = Object.freeze([
  Object.freeze({ id: "weather", label: "Météo", icon: "cloud-sun" }),
  Object.freeze({ id: "calendar", label: "Agenda", icon: "calendar-days" }),
  Object.freeze({ id: "tasks", label: "Tâches", icon: "circle-check-big" }),
  Object.freeze({ id: "mail", label: "Mails non lus", icon: "mail" }),
  Object.freeze({ id: "notifications", label: "Notifications importantes", icon: "bell" }),
  Object.freeze({ id: "activity", label: "Activité récente", icon: "activity" }),
  Object.freeze({ id: "spotify", label: "Spotify", icon: "audio-lines" })
]);

const BRIEFING_SETTINGS_KEY = "ethone:briefing:sections";
const SUGGESTIONS_DISMISSED_KEY = "ethone:brain:suggestions:dismissed";
const SUGGESTION_TTL_MS = 24 * 60 * 60 * 1000;

function getBriefingSettings() {
  try {
    const raw = globalThis.localStorage?.getItem(BRIEFING_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveBriefingSetting(id, visible) {
  const settings = getBriefingSettings();
  settings[id] = visible;
  try { globalThis.localStorage?.setItem(BRIEFING_SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

function statusPill(label, tone = "neutral") {
  return element("span", { className: `v8-brain-status v8-brain-status--${tone}` }, [element("i", { attributes: { "aria-hidden": "true" } }), element("span", { text: label })]);
}

function metric(iconName, label, value) {
  return element("span", { className: "v8-brain-metric", dataset: { liveWidget: "metric", liveKind: "metric" } }, [icon(iconName), element("small", { text: label }), element("strong", { text: String(value) })]);
}

function messageBubble(entry) {
  const role = entry.role === "user" ? "user" : "assistant";
  return element("article", { className: `v8-brain-message v8-brain-message--${role}` }, [
    element("span", { className: "v8-brain-message__avatar" }, [icon(role === "user" ? "user-round" : "brain")]),
    element("div", {}, [element("p", { text: entry.content }), entry.sources?.length ? element("small", { text: `Sources : ${entry.sources.join(", ")}` }) : null])
  ]);
}

function thinkingStar() {
  const wrap = document.createElement("span");
  wrap.className = "v8-brain-thinking-star";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M12 2.5c.3 0 .7.4.9 1.3.5 1.7 1.6 2.7 3.3 3.1.9.2 1.3.5 1.3.9 0 .3-.4.7-1.3.9-1.7.5-2.7 1.6-3.1 3.3-.2.9-.5 1.3-.9 1.3-.3 0-.7-.4-.9-1.3-.5-1.7-1.6-2.7-3.3-3.1-.9-.2-1.3-.5-1.3-.9 0-.3.4-.7 1.3-.9 1.7-.5 2.7-1.6 3.1-3.3.2-.9.5-1.3.9-1.3z");
  path.setAttribute("fill", "currentColor");
  svg.appendChild(path);
  wrap.appendChild(svg);
  return wrap;
}

function thinkingBubble() {
  const spark = thinkingStar();
  const trail = element("span", { className: "v8-brain-thinking-trail" });
  const core = element("span", { className: "v8-brain-thinking-core" });

  return element("article", { className: "v8-brain-message v8-brain-message--assistant v8-brain-message--thinking" }, [
    element("span", { className: "v8-brain-message__avatar v8-brain-message__avatar--thinking" }, [
      icon("brain"),
      element("span", { className: "v8-brain-thinking-ring" }),
      element("span", { className: "v8-brain-thinking-ring v8-brain-thinking-ring--delay" })
    ]),
    element("div", { className: "v8-brain-thinking-body" }, [
      element("span", { className: "v8-brain-thinking-pill" }, [
        spark,
        trail,
        core,
        element("span", { className: "v8-brain-thinking-pulse" }),
        element("span", { className: "v8-brain-thinking-particles" }, [
          element("span", { className: "v8-brain-thinking-particle" }),
          element("span", { className: "v8-brain-thinking-particle" }),
          element("span", { className: "v8-brain-thinking-particle" }),
          element("span", { className: "v8-brain-thinking-particle" }),
          element("span", { className: "v8-brain-thinking-particle" })
        ]),
        element("span", { className: "v8-brain-thinking-text", text: "Thinking" })
      ])
    ])
  ]);
}

function sectionHeader(eyebrow, title, copy, action = null) {
  return element("header", { className: "v8-brain-panel__header" }, [
    element("div", {}, [element("span", { className: "v8-eyebrow", text: eyebrow }), element("h2", { text: title }), element("p", { text: copy })]),
    action
  ]);
}

function brainPanel(id, children, active = false) {
  const attributes = { role: "tabpanel", tabindex: "0" };
  if (!active) attributes.hidden = true;
  return element("section", { id: `v8-brain-panel-${id}`, className: "v8-brain-panel", attributes, dataset: { brainPanel: id } }, children);
}



export function mountBrain(stage, options = {}) {
  const state = options.state || {};
  const brain = options.brain;
  const actionFacade = options.actions;
  const externalServices = options.externalServices || null;
  if (!brain?.controller || !brain?.context) {
    stage.replaceChildren(buildErrorState({
      title: "Brain indisponible",
      reason: "Le runtime Brain n'a pas pu être initialisé. Veuillez recharger ETHONE.",
      actionText: "Recharger",
      action: () => globalThis.location?.reload()
    }));
    refreshIcons();
    return () => stage.replaceChildren();
  }
  const workspace = workspaceById(state.space);
  const snapshot = options.repository?.snapshot?.() || {};
  const context = brain.context.build({ route: state.route, intent: "brain-page" });
  const preferences = brain.preferences();
  const openTasks = snapshot.tasks?.filter?.((task) => !task.done) || [];
  const connected = snapshot.connections?.filter?.((connection) => connection.status === "connected") || [];
  const controller = new AbortController();
  let activeTab = "chat";
  let memoryLoaded = false;
  let memoryBusy = false;
  let historyQuery = "";
  let briefingSettingsOpen = false;
  let dailyBriefingData = null;

  function isConnected(id) { return snapshot.connections?.some?.((c) => c.id === id && c.status === "connected"); }
  function clientIdFor(id) { return snapshot.connections?.find?.((c) => c.id === id)?.reference || ""; }
  function localDayKey(date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); const d = String(date.getDate()).padStart(2, "0"); return `${y}-${m}-${d}`; }
  function greetingForHour(date) { const h = date.getHours(); if (h >= 5 && h < 12) return "Good morning"; if (h < 18) return "Good afternoon"; if (h < 23) return "Good evening"; return "Good night"; }

  function getDismissedSuggestions() { try { const raw = globalThis.localStorage?.getItem(SUGGESTIONS_DISMISSED_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; } }
  function isSuggestionDismissed(id) { const ts = getDismissedSuggestions()[id]; if (!ts) return false; return Date.now() - Number(ts) < SUGGESTION_TTL_MS; }
  function dismissSuggestion(id) { const map = getDismissedSuggestions(); map[id] = Date.now(); try { globalThis.localStorage?.setItem(SUGGESTIONS_DISMISSED_KEY, JSON.stringify(map)); } catch {} }

  async function collectBriefingData(now = new Date()) {
    const model = createHomeModel({ snapshot, date: now });
    const todayKey = localDayKey(now);
    const result = { greeting: greetingForHour(now) };

    const weatherItem = model.briefing.items.find((i) => i.id === "weather");
    result.weather = { available: isConnected("weather") || weatherItem?.state !== "unavailable", value: weatherItem?.value || "Non connectée", detail: weatherItem?.detail || "Météo" };
    if (isConnected("weather") && externalServices?.weather?.forecast) {
      try {
        const res = await externalServices.weather.forecast(clientIdFor("weather"));
        if (res?.data) {
          const data = res.data;
          result.weather.value = data.condition || data.summary || weatherItem?.value || "Météo";
          result.weather.detail = data.temperature ? `${data.temperature}°` : (data.city || "Actuelle");
          result.weather.available = true;
        }
      } catch {}
    }

    const events = Array.isArray(snapshot.events) ? snapshot.events : [];
    const upcoming = events
      .filter((e) => (e?.start || e?.date) >= todayKey)
      .sort((a, b) => String(a?.start || a?.date).localeCompare(String(b?.start || b?.date)))
      .slice(0, 3);
    result.calendar = { available: upcoming.length > 0 || isConnected("google-calendar"), value: upcoming[0]?.title || "Aucun événement", detail: `${upcoming.length} prochain${upcoming.length > 1 ? "s" : ""}`, items: upcoming };
    if (isConnected("google-calendar") && externalServices?.googleCalendarOAuth?.events) {
      try {
        const res = await externalServices.googleCalendarOAuth.events(clientIdFor("google-calendar"));
        const remote = Array.isArray(res?.data) ? res.data.slice(0, 3) : [];
        if (remote.length) {
          result.calendar.items = remote.map((e) => ({ title: e.title || e.summary, start: e.start || e.date }));
          result.calendar.value = result.calendar.items[0]?.title || "Agenda";
          result.calendar.detail = `${result.calendar.items.length} événement${result.calendar.items.length > 1 ? "s" : ""}`;
        }
      } catch {}
    }

    const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
    const open = tasks.filter((t) => !t.done && !t.completed);
    const overdue = open.filter((t) => t?.due && t.due < todayKey);
    const today = open.filter((t) => t?.due === todayKey);
    result.tasks = { available: true, value: `${overdue.length} en retard · ${today.length} aujourd'hui`, detail: `${open.length} ouverte${open.length > 1 ? "s" : ""}`, overdue, today };

    let unread = 0;
    let important = 0;
    if (isConnected("mail") && externalServices?.mail?.notifications) {
      try {
        const res = await externalServices.mail.notifications({ unread: true, limit: 20 });
        const data = Array.isArray(res?.data) ? res.data : (res?.data?.items || res?.data?.notifications || []);
        unread = Array.isArray(data) ? data.length : (Number(res?.data?.count) || 0);
        important = Array.isArray(data) ? data.filter((m) => m?.is_important || m?.important).length : 0;
      } catch {}
    }
    result.mail = { available: isConnected("mail"), value: String(unread), detail: `non lu${unread > 1 ? "s" : ""}` };
    result.notifications = { available: isConnected("mail"), value: String(important), detail: `important${important > 1 ? "s" : ""}` };

    const activities = Array.isArray(snapshot.activities) ? snapshot.activities : [];
    const recent = activities
      .slice()
      .sort((a, b) => new Date(b?.timestamp || 0).getTime() - new Date(a?.timestamp || 0).getTime())
      .slice(0, 3);
    result.activity = { available: recent.length > 0, value: `${recent.length} récent${recent.length > 1 ? "s" : ""}`, detail: "Dernières actions", items: recent };

    result.spotify = { available: isConnected("spotify"), value: "Non connecté", detail: "Spotify" };
    if (isConnected("spotify") && externalServices?.spotifyOAuth?.nowPlaying) {
      try {
        const res = await externalServices.spotifyOAuth.nowPlaying(clientIdFor("spotify"));
        if (res?.data && (res.data.is_playing || res.data.track || res.data.title)) {
          const data = res.data;
          result.spotify.value = data.track?.name || data.title || "En lecture";
          result.spotify.detail = data.track?.artists?.[0]?.name || data.artist || data.album || "Spotify";
          result.spotify.available = true;
        }
      } catch {}
    }

    return result;
  }

  function buildBriefingSection(section, data) {
    if (!data) return null;
    const isPlaceholder = !data.available || data.value === "Non connecté" || data.value === "";
    return element("div", { className: `v8-brain-briefing__section${isPlaceholder ? " is-placeholder" : ""}` }, [
      icon(section.icon),
      element("div", {}, [element("strong", { text: data.value || "—" }), element("small", { text: data.detail || section.label })]),
      isPlaceholder ? element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => options.notify?.({ id: "briefing-section", title: "Briefing", message: `${section.label} non connecté`, type: "info" }) } }, [element("span", { text: "Configurer" })]) : null
    ]);
  }

  function buildDailyBriefing(data) {
    dailyBriefingData = data;
    const settings = getBriefingSettings();
    const visibleSections = BRIEFING_SECTIONS.filter((s) => settings[s.id] !== false);
    const settingsButton = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Réglages du briefing" }, events: { click: () => { briefingSettingsOpen = !briefingSettingsOpen; void loadDailyBriefing(); } } }, [icon("settings-2")]);
    const settingsPanel = element("div", { className: "v8-brain-briefing__settings", attributes: { hidden: briefingSettingsOpen ? null : true } }, BRIEFING_SECTIONS.map((s) => {
      const input = element("input", { className: "v8-input", attributes: { type: "checkbox", checked: settings[s.id] !== false } });
      input.addEventListener("change", (event) => { saveBriefingSetting(s.id, event.target.checked); void loadDailyBriefing(); });
      return element("label", {}, [input, element("span", { text: s.label })]);
    }));
    return element("article", { className: "v8-brain-briefing v8-surface" }, [
      element("header", { className: "v8-brain-briefing__header" }, [
        element("div", {}, [element("span", { className: "v8-eyebrow", text: "Briefing du jour" }), element("h2", { text: data.greeting })]),
        settingsButton
      ]),
      element("div", { className: "v8-brain-briefing__body" }, visibleSections.map((s) => buildBriefingSection(s, data[s.id]))),
      settingsPanel
    ]);
  }

  async function loadDailyBriefing() {
    briefingHost.replaceChildren(buildSkeletonList(4));
    try {
      const data = await collectBriefingData(new Date());
      briefingHost.replaceChildren(buildDailyBriefing(data));
      renderWrapUp();
      refreshIcons();
    } catch (error) {
      options.notify?.({ id: "brain-briefing-error", title: "Briefing", message: "Impossible de charger le briefing.", type: "warning" });
      briefingHost.replaceChildren(buildErrorState({
        title: "Briefing indisponible",
        reason: "Impossible de charger le briefing.",
        actionText: "Réessayer",
        action: () => void loadDailyBriefing()
      }));
    }
  }

  function renderWrapUp() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = start + 86400000;
    const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
    const activities = Array.isArray(snapshot.activities) ? snapshot.activities : [];
    const events = Array.isArray(snapshot.events) ? snapshot.events : [];
    const completed = tasks.filter((t) => t?.done === true || t?.completed === true).length;
    const doneToday = tasks.filter((t) => { const at = t?.doneAt || t?.completedAt || t?.updatedAt; return at && (t?.done === true || t?.completed === true) && new Date(at).getTime() >= start && new Date(at).getTime() < end; }).length;
    const todayActivity = activities.filter((a) => { const ts = a?.timestamp; return ts && new Date(ts).getTime() >= start && new Date(ts).getTime() < end; }).length;
    const upcoming = events.filter((e) => new Date(e?.start || e?.date || 0) >= today).slice(0, 3);
    const unread = Number(dailyBriefingData?.mail?.value || 0);
    wrapupMetrics.replaceChildren(
      metric("activity", "Activités aujourd'hui", todayActivity),
      metric("circle-check-big", "Tâches terminées", completed),
      metric("mail", "Non lus", unread),
      metric("calendar-days", "Événements à venir", upcoming.length)
    );
    wrapupSummary.textContent = `${todayActivity} activités aujourd'hui, ${completed} tâches terminées, ${upcoming.length} événements à venir.`;
    refreshIcons();
  }

  function showPrepareTomorrowSheet() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const model = createHomeModel({ snapshot, date: tomorrow });
    const children = [];
    if (model.todayEvents.length) children.push(element("h3", { className: "v8-eyebrow", text: "Événements" }));
    model.todayEvents.forEach((e) => children.push(element("div", { className: "v8-brain-wrapup__row" }, [icon("calendar-days"), element("strong", { text: e.title }), e.start ? element("small", { text: e.start }) : null])));
    if (model.nextTasks.length) children.push(element("h3", { className: "v8-eyebrow", text: "Tâches" }));
    model.nextTasks.forEach((t) => children.push(element("div", { className: "v8-brain-wrapup__row" }, [icon("circle-check-big"), element("strong", { text: t.title }), t.due ? element("small", { text: `due ${t.due}` }) : null])));
    if (!children.length) children.push(element("p", { text: "Rien de prévu pour demain." }));
    showBottomSheet({ title: "Préparer demain", children });
  }

  function buildSuggestionCard(s) {
    const close = element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Ignorer" }, events: { click: (event) => { event.stopPropagation(); dismissSuggestion(s.id); void buildSuggestions(); } } }, [icon("x")]);
    return element("button", { className: "v8-brain-suggestion", attributes: { type: "button" }, events: { click: () => { if (s.action) actionFacade?.dispatch?.(s.action); } } }, [icon(s.icon), element("div", {}, [element("strong", { text: s.title }), element("small", { text: s.detail })]), close]);
  }

  async function buildSuggestions() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const list = [];
    if (isConnected("spotify") && !isSuggestionDismissed("spotify-now")) {
      try {
        const res = await externalServices?.spotifyOAuth?.nowPlaying?.(clientIdFor("spotify"));
        if (res?.data && (res.data.is_playing || res.data.track || res.data.title)) {
          const data = res.data;
          list.push({ id: "spotify-now", icon: "audio-lines", title: data.track?.name || data.title || "Spotify", detail: data.track?.artists?.[0]?.name || data.artist || "En lecture", action: null });
        }
      } catch {}
    }
    if (isConnected("github") && !isSuggestionDismissed("github-widget")) {
      list.push({ id: "github-widget", icon: "github", title: "GitHub actif", detail: "Ouvrir le widget GitHub", action: "v8.home.open" });
    }
    if (!isSuggestionDismissed("save-pdf") && externalServices?.mail?.inbox) {
      try {
        const res = await externalServices.mail.inbox({ limit: 20 });
        const messages = Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
        const hasPdf = messages.some((m) => (m?.attachments || []).some((a) => String(a?.name || "").toLowerCase().endsWith(".pdf")) || String(m?.subject || "").toLowerCase().includes(".pdf"));
        if (hasPdf) list.push({ id: "save-pdf", icon: "file", title: "PDF reçu", detail: "Sauvegarder dans Fichiers", action: "v8.files.open" });
      } catch {}
    }
    if (!isSuggestionDismissed("add-calendar")) {
      const newEvent = (snapshot.events || []).some((e) => { const t = new Date(e?.createdAt || e?.updatedAt || e?.date || 0).getTime(); return t >= todayStart; });
      if (newEvent) list.push({ id: "add-calendar", icon: "calendar-plus", title: "Événement reçu", detail: "Ajouter au calendrier", action: "v8.calendar.open" });
    }
    const items = list.slice(0, 3);
    contextualStrip.replaceChildren(...items.map((s) => buildSuggestionCard(s)));
    contextualStrip.hidden = items.length === 0;
    refreshIcons();
  }

  const tabList = element("div", { className: "v8-brain-tabs", attributes: { role: "tablist", "aria-label": "Sections Brain" } });
  const panels = element("div", { className: "v8-brain-panels" });
  const chatLog = element("div", { className: "v8-brain-chat-log", attributes: { role: "log", "aria-live": "polite", "aria-label": "Conversation Brain" } });
  const chatInput = element("textarea", { className: "v8-input v8-brain-composer__input", attributes: { rows: "2", maxlength: "500", required: true, placeholder: "Bonjour, ça va ? Posez une question ou demandez une action...", "aria-label": "Demander a Brain" } });
  const chatStatus = element("span", { className: "v8-brain-composer__status", text: "Contexte minimal actif", attributes: { "aria-live": "polite" } });
  const sendButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("send"), element("span", { text: "Envoyer" })]);
  const chatForm = element("form", { className: "v8-brain-composer" }, [
    formField({ label: "Message", control: chatInput, help: "500 caractères maximum", required: true }),
    element("footer", {}, [chatStatus, sendButton])
  ]);
  const suggestions = element("div", { className: "v8-brain-suggestions" });
  const memoryList = element("div", { className: "v8-brain-memory-list", attributes: { "aria-live": "polite" } });
  const memoryStatus = element("p", { className: "v8-brain-inline-status", text: "La memoire n'est chargee qu'a votre demande." });

  const chatPanel = brainPanel("chat", [
    element("div", { className: "v8-brain-chat v8-surface" }, [
      sectionHeader("Assistant personnel", preferences.assistantName, "Des réponses fondees sur le contexte autorise."),
      chatLog,
      suggestions,
      chatForm
    ])
  ], true);

  const contextPanel = brainPanel("context", [
    element("article", { className: "v8-brain-detail v8-surface" }, [
      sectionHeader("Context Engine", "Ce que Brain voit maintenant", "Sources limitees a la page et aux permissions."),
      element("div", { className: "v8-brain-source-list" }, context.sources.map((entry) => element("div", { className: "v8-brain-source" }, [
        element("span", { className: "v8-brain-source__icon" }, [icon(entry.active ? "circle-check" : entry.allowed ? "circle-minus" : "circle-slash-2")]),
        element("div", {}, [element("strong", { text: entry.id }), element("p", { text: entry.detail })]),
        element("span", { className: "v8-badge", text: entry.active ? String(entry.count) : entry.allowed ? "En veille" : "Bloqué" })
      ]))),
      element("footer", { className: "v8-brain-privacy-note" }, [icon("shield-check"), element("p", { text: "Aucun mot de passe, token, secret ou contenu complet n'est inclus." })])
    ])
  ]);

  const memoryCategory = createSelect({ className: "v8-input", attributes: { "aria-label": "Catégorie de memoire" } }, ["interface", "habits", "widgets", "schedules", "task-types", "spaces", "flows", "response-style", "goals"].map((value) => element("option", { text: value, attributes: { value } })));
  const memoryKey = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", required: true, placeholder: "Nom de la préférence", "aria-label": "Nom de la memoire" } });
  const memoryValue = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "400", required: true, placeholder: "Information utile, jamais un secret", "aria-label": "Valeur de la memoire" } });
  const memorySubmit = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("plus"), element("span", { text: "Ajouter" })]);
  const memoryForm = element("form", { className: "v8-brain-memory-form" }, [
    formField({ label: "Catégorie", control: memoryCategory }),
    formField({ label: "Préférence", control: memoryKey, help: "80 caractères maximum" }),
    formField({ label: "Information", control: memoryValue, help: "Aucun secret" }),
    memorySubmit
  ]);
  const loadMemoryButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { brainMemoryLoad: "" } }, [icon("database"), element("span", { text: "Charger" })]);
  const memoryPanel = brainPanel("memory", [
    element("article", { className: "v8-brain-detail v8-surface" }, [
      sectionHeader("Memoire controlee", "Vos préférences, sous votre contrôle", "Stockage Supabase avec RLS et retention.", loadMemoryButton),
      memoryStatus,
      preferences.memory.enabled ? memoryForm : statusState("empty", {
        iconName: "database-zap",
        eyebrow: "Memoire controlee",
        title: "Memoire Brain desactivee",
        description: "Activez-la dans les réglages pour enregistrer uniquement les préférences que vous choisissez.",
        actions: [actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Ouvrir les réglages" })])],
        compact: true,
        inline: true
      }),
      memoryList,
      element("footer", { className: "v8-brain-memory-tools" }, [
        element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { brainMemoryExport: "" } }, [icon("download"), element("span", { text: "Exporter" })]),
        element("button", { className: "v8-button v8-button--danger", attributes: { type: "button" }, dataset: { brainMemoryClear: "" } }, [icon("trash-2"), element("span", { text: "Tout effacer" })])
      ])
    ])
  ]);

  const actionDefinitions = brain.actions.definitions();
  const actionsPanel = brainPanel("actions", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Action Registry", "Actions autorisees", "Aucune fonction arbitraire. Les actions sensibles exigent confirmation."), element("div", { className: "v8-brain-action-list" }, actionDefinitions.map((entry) => element("div", { className: "v8-brain-action-row" }, [element("span", {}, [icon(entry.confirmation ? "shield-alert" : "circle-check")]), element("div", {}, [element("strong", { text: entry.title }), element("p", { text: entry.description })]), element("span", { className: "v8-badge", text: entry.confirmation ? "Confirmation" : "Directe" })])))])
  ]);

  const automationTypeSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Type de declencheur" } }, [
    element("option", { text: "A l'ouverture d'une page", attributes: { value: "route" } }),
    element("option", { text: "Au passage vers un Space", attributes: { value: "space" } }),
    element("option", { text: "A une heure précise", attributes: { value: "time" } })
  ]);
  const automationRouteSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Page" } }, NAVIGATION_ITEMS.map((item) => element("option", { text: item.label, attributes: { value: item.id } })));
  const automationSpaceSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Space" } }, WORKSPACES.map((workspace) => element("option", { text: workspace.label, attributes: { value: workspace.id } })));
  const automationTimeInput = element("input", { className: "v8-input", attributes: { type: "time", value: "09:00", "aria-label": "Heure", required: true } });
  const automationActionSelect = createSelect({ className: "v8-input", attributes: { "aria-label": "Action a executer" } }, AUTOMATION_ACTIONS.map((entry) => element("option", { text: entry.label, attributes: { value: entry.id } })));
  const automationSubmit = element("button", { className: "v8-button v8-button--primary", attributes: { type: "submit" } }, [icon("plus"), element("span", { text: "Créer" })]);
  const automationRouteField = formField({ label: "Page", control: automationRouteSelect });
  const automationSpaceField = formField({ label: "Space", control: automationSpaceSelect });
  const automationTimeField = formField({ label: "Heure", control: automationTimeInput });
  automationSpaceField.hidden = true;
  automationTimeField.hidden = true;
  const automationForm = element("form", { className: "v8-brain-automation-form" }, [
    formField({ label: "Declencheur", control: automationTypeSelect }),
    automationRouteField,
    automationSpaceField,
    automationTimeField,
    formField({ label: "Action", control: automationActionSelect }),
    automationSubmit
  ]);
  const automationStatus = element("p", { className: "v8-brain-inline-status", text: "Les automatisations s'executent selon votre niveau d'automatisation.", attributes: { "aria-live": "polite" } });
  const automationListHost = element("div", { className: "v8-brain-automation-list" });
  const automationsPanel = brainPanel("automations", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Review mode", "Suggestions avant automatisation", "Brain peut proposer un Flow, un widget ou une densité, mais ne modifié jamais un réglage important seul."), element("div", { className: "v8-brain-policy" }, [icon("workflow"), element("div", {}, [element("strong", { text: `Niveau actuel : ${brainPreferenceLabel("automationLevel", preferences.automationLevel)}` }), element("p", { text: preferences.automationLevel === "trusted" ? "Les automatisations s'executent automatiquement." : "Chaque automatisation demande une confirmation avant de s'executer." })])])]),
    element("article", { className: "v8-brain-detail v8-surface" }, [
      sectionHeader("Règles", "Vos automatisations", "Declenchez un changement de Space, de densité ou de thème automatiquement."),
      automationForm,
      automationStatus,
      automationListHost
    ])
  ]);

  const providerTestStatus = element("p", { className: "v8-brain-inline-status", text: "Tests réseau a la demande.", attributes: { "aria-live": "polite" } });
  const providerCards = brain.providers.providers().map((provider) => element("article", { className: `v8-brain-provider${provider.id === preferences.provider.active ? " is-active" : ""}` }, [
    element("header", {}, [element("span", {}, [icon(provider.kind === "cloud" ? "cloud" : "hard-drive")]), statusPill(provider.status === "ready" ? "Actif" : provider.status === "backend-ready" ? "Disponible" : "Backend requis", provider.status === "ready" ? "success" : "neutral")]),
    element("strong", { text: provider.label }),
    element("p", { text: provider.privacy }),
    element("small", { text: provider.kind === "cloud" ? "Cloud" : "Local" }),
    element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { brainProviderTest: provider.id } }, [icon("plug"), element("span", { text: "Tester" })])
  ]));
  const providersPanel = brainPanel("providers", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Provider Manager", "Modeles et confidentialité", "Les providers cloud passent par le backend sécurisé ETHONE."), providerTestStatus, element("div", { className: "v8-brain-provider-grid" }, providerCards)])
  ]);

  const permissionRows = Object.entries(preferences.permissions).map(([key, allowed]) => element("div", { className: "v8-brain-permission" }, [element("span", {}, [icon(allowed ? "eye" : "eye-off")]), element("strong", { text: key }), statusPill(allowed ? "Autorisé" : "Bloqué", allowed ? "success" : "neutral")]))
  const privacyPanel = brainPanel("privacy", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Privacy Center", "Accès par catégorie", "Vous voyez exactement les données consultables. Les secrets ne sont jamais une catégorie autorisable.", actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Modifier" })])), element("div", { className: "v8-brain-permissions" }, permissionRows), element("footer", { className: "v8-brain-never-sent" }, [element("strong", { text: "Jamais transmis" }), element("p", { text: "Mots de passe, tokens, clés API, cookies, sessions et identifiants de connexion privés." })])])
  ]);

  const historySearch = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher dans l'historique", "aria-label": "Rechercher dans l'historique", autocomplete: "off" } });
  const historyCount = element("span", { className: "v8-section-count", attributes: { "aria-live": "polite" } });
  const historyHost = element("div", { className: "v8-brain-history", attributes: { role: "log", "aria-label": "Historique Brain" } });
  const historyPanel = brainPanel("history", [element("article", { className: "v8-brain-detail v8-surface" }, [
    sectionHeader("Session courante", "Historique privé", "Conserve uniquement en memoire pour cette session et limite a 60 messages.", element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { brainHistoryClear: "" } }, [icon("eraser"), element("span", { text: "Effacer" })])),
    element("div", { className: "v8-brain-history-tools" }, [element("div", { className: "v8-input-wrap" }, [icon("search"), historySearch]), historyCount]),
    historyHost
  ])]);

  const diagnosticsPre = element("pre", { className: "v8-brain-diagnostics", text: JSON.stringify(brain.diagnostics(), null, 2) });
  const diagnosticsPanel = brainPanel("diagnostics", [element("article", { className: "v8-brain-detail v8-surface" }, [
    sectionHeader("Exécution à la demande", "Diagnostics Brain", "Aucun observer, timer ou traitement de Dashboard ne tourne lorsque Brain est ferme.", element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => { diagnosticsPre.textContent = JSON.stringify(brain.diagnostics(), null, 2); } } }, [icon("refresh-cw"), element("span", { text: "Rafraîchir" })])),
    diagnosticsPre
  ])]);

  const contextualStrip = element("div", { className: "v8-brain-suggestions-strip", attributes: { "aria-label": "Suggestions contextuelles" } });
  const briefingHost = element("div", { className: "v8-brain-briefing-host" });
  const wrapupMetrics = element("div", { className: "v8-brain-wrapup__metrics" });
  const wrapupSummary = element("p", { className: "v8-brain-wrapup__summary" });
  const prepareTomorrowButton = element("button", { className: "v8-button v8-button--primary", attributes: { type: "button" }, events: { click: () => showPrepareTomorrowSheet() } }, [icon("sunrise"), element("span", { text: "Préparer demain" })]);
  const wrapupPanel = brainPanel("wrapup", [
    element("article", { className: "v8-brain-detail v8-surface" }, [
      sectionHeader("Wrap-up", "Bilan de la journée", "Rétrospective et préparation de demain."),
      wrapupMetrics,
      wrapupSummary,
      prepareTomorrowButton
    ])
  ]);

  [chatPanel, contextPanel, memoryPanel, actionsPanel, automationsPanel, providersPanel, privacyPanel, historyPanel, diagnosticsPanel, wrapupPanel].forEach((panel) => panels.append(panel));
  TABS.forEach((tab, index) => tabList.append(element("button", { className: `v8-brain-tab${index === 0 ? " is-active" : ""}`, attributes: { type: "button", role: "tab", "aria-selected": index === 0 ? "true" : "false", "aria-controls": `v8-brain-panel-${tab.id}`, tabindex: index === 0 ? "0" : "-1" }, dataset: { brainTab: tab.id } }, [icon(tab.icon), element("span", { text: tab.label })])));

  const focusButton = element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => void brain.controller.execute("brain.focus") } }, [icon("focus"), element("span", { text: "Mode Focus" })]);
  const page = element("section", { className: "v8-page v8-brain-page", dataset: { page: "brain" } }, [
    element("header", { className: "v8-page-heading" }, [element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: "Intelligence personnelle" }), element("h1", { text: "Brain" }), element("p", { text: "Un contexte utile, protege et sous votre contrôle." })]), element("div", { className: "v8-page-heading__actions" }, [statusPill("Contexte actif", "success"), focusButton, actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("sparkles"), element("span", { text: "Command HUD" })])])]),
    element("section", { className: "v8-brain-hero v8-surface" }, [element("div", { className: "v8-brain-hero__identity" }, [element("span", { className: "v8-brain-orbit", dataset: { liveWidget: "brain", liveKind: "brain" } }, [icon("brain")]), element("div", {}, [element("small", { text: "Contexte courant" }), element("h2", { text: `${state.flow || workspace.flow} dans ${workspace.label}` }), element("p", { text: `Profil ${brainPreferenceLabel("persona", preferences.persona)}, reponses ${brainPreferenceLabel("détail", preferences.detail)}, automatisation ${brainPreferenceLabel("automationLevel", preferences.automationLevel)}.` })])]), element("div", { className: "v8-brain-hero__metrics" }, [metric("circle-check-big", "Priorités", openTasks.length), metric("notebook-pen", "Notes", snapshot.notes?.length || 0), metric("plug", "Connectées", connected.length), metric("shield-check", "Sources", context.sources.filter((entry) => entry.active).length)])]),
    contextualStrip,
    briefingHost,
    tabList,
    panels
  ]);

  function renderHistoryList() {
    const entries = brain.controller.history();
    const normalizedQuery = historyQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const visible = normalizedQuery
      ? entries.filter((entry) => `${entry.role || ""} ${entry.content || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedQuery))
      : entries;
    historyCount.textContent = `${visible.length} / ${entries.length}`;
    historyHost.replaceChildren(...(visible.length ? visible.map(messageBubble) : [statusState(entries.length ? "no-results" : "empty", {
      iconName: entries.length ? "search-x" : "history",
      eyebrow: "Session courante",
      title: entries.length ? "Aucun résultat" : "Aucun message pour le moment",
      description: entries.length ? "Modifiez votre recherche pour retrouver un échange." : "Commencez une conversation pour retrouver ici son historique privé.",
      compact: true,
      inline: true
    })]));
    refreshIcons();
  }

  function renderHistory() {
    const entries = brain.controller.history();
    renderHistoryList();
    chatLog.replaceChildren(...(entries.length ? entries.map(messageBubble) : [messageBubble({ role: "assistant", content: `Je suis pret dans ${workspace.label}. Je ne charge que le contexte necessaire a votre demande.` })]));
    chatLog.scrollTop = chatLog.scrollHeight;
    refreshIcons();
  }

  function automationRow(rule) {
    const action = AUTOMATION_ACTIONS.find((entry) => entry.id === rule.actionId);
    const groupIcon = action?.group === "space" ? "layout-grid" : action?.group === "theme" ? "sun-moon" : "grid-2x2";
    return element("div", { className: `v8-brain-automation-row${rule.enabled ? "" : " is-disabled"}`, dataset: { automationId: rule.id } }, [
      element("span", {}, [icon(groupIcon)]),
      element("div", {}, [element("strong", { text: automationTriggerLabel(rule.trigger) }), element("p", { text: `-> ${action?.label || rule.actionId}` })]),
      element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": rule.enabled ? "Desactiver l'automatisation" : "Activer l'automatisation", "aria-pressed": String(rule.enabled) }, dataset: { automationToggle: rule.id } }, [icon(rule.enabled ? "toggle-right" : "toggle-left")]),
      element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer l'automatisation" }, dataset: { automationDelete: rule.id } }, [icon("trash-2")])
    ]);
  }

  function renderAutomations() {
    const rules = brain.preferences().automations || [];
    automationListHost.replaceChildren(...(rules.length ? rules.map(automationRow) : [statusState("empty", {
      iconName: "workflow",
      eyebrow: "Automatisations",
      title: "Aucune automatisation",
      description: "Créez une règle pour declencher un changement de Space, de densité ou de thème.",
      compact: true,
      inline: true
    })]));
    refreshIcons();
  }

  function renderSuggestions() {
    const items = brain.controller.suggestions();
    if (items.length) {
      suggestions.replaceChildren(...items.map((suggestion) => element("button", { className: "v8-brain-suggestion", attributes: { type: "button" }, dataset: { brainSuggestion: suggestion.id } }, [element("span", {}, [icon("sparkles")]), element("div", {}, [element("strong", { text: suggestion.title }), element("small", { text: suggestion.detail })]), icon("arrow-up-right")])));
    } else {
      suggestions.replaceChildren(buildEmptyState({
        icon: "lightbulb",
        title: "Aucune suggestion",
        message: "Brain n'a pas de recommandation pour le moment. Revenez plus tard ou posez-lui une question."
      }));
    }
  }

  function activateTab(id, focus = false) {
    if (!TABS.some((tab) => tab.id === id)) return;
    activeTab = id;
    page.querySelectorAll("[data-brain-tab]").forEach((button) => { const active = button.dataset.brainTab === id; button.classList.toggle("is-active", active); button.setAttribute("aria-selected", String(active)); button.tabIndex = active ? 0 : -1; if (active && focus) button.focus(); });
    page.querySelectorAll("[data-brain-panel]").forEach((panel) => { panel.hidden = panel.dataset.brainPanel !== id; });
    if (id === "memory" && !memoryLoaded) void loadMemories();
  }

  async function loadMemories() {
    if (memoryBusy) return;
    memoryBusy = true;
    loadMemoryButton.disabled = true;
    memoryStatus.textContent = "Chargement sécurisé depuis Supabase...";
    memoryList.replaceChildren(buildSkeletonList(4));
    refreshIcons();
    const response = await brain.memory.list();
    if (controller.signal.aborted) return;
    memoryBusy = false;
    loadMemoryButton.disabled = false;
    memoryLoaded = response.ok;
    memoryStatus.textContent = response.ok ? `${response.data.length} memoire${response.data.length > 1 ? "s" : ""} active${response.data.length > 1 ? "s" : ""}.` : response.message;
    memoryList.replaceChildren(...(response.ok && response.data.length ? response.data.map((entry) => element("div", { className: "v8-brain-memory", dataset: { memoryId: entry.id } }, [element("span", {}, [icon("bookmark")]), element("div", {}, [element("small", { text: entry.category }), element("strong", { text: entry.key }), element("p", { text: entry.value })]), element("div", {}, [element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Modifier la memoire" }, dataset: { memoryEdit: entry.id, memoryValue: entry.value } }, [icon("pencil")]), element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer la memoire" }, dataset: { memoryDelete: entry.id } }, [icon("trash-2")])])])) : [response.ok
      ? buildEmptyState({
          icon: "database",
          title: "Aucune memoire active",
          message: "Ajoutez une préférence explicite lorsque Brain doit la retenir."
        })
      : buildErrorState({
          title: "Memoires indisponibles",
          reason: response.message,
          actionText: "Réessayer",
          action: () => void loadMemories()
        })]));
    refreshIcons();
  }

  tabList.addEventListener("click", (event) => { const button = event.target.closest("[data-brain-tab]"); if (button) activateTab(button.dataset.brainTab); }, { signal: controller.signal });
  tabList.addEventListener("keydown", (event) => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const index = TABS.findIndex((tab) => tab.id === activeTab); const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length; activateTab(TABS[next].id, true); }, { signal: controller.signal });
  let submitting = false;
  async function submitBrainQuery(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
      event.stopPropagation();
    }
    const query = chatInput.value.trim();
    if (!query || submitting) return;
    submitting = true;
    let thinking = null;
    try {
      chatLog.append(messageBubble({ role: "user", content: query }));
      thinking = thinkingBubble();
      chatLog.append(thinking);
      chatLog.scrollTop = chatLog.scrollHeight;
      chatStatus.textContent = "Brain réfléchit...";
      const submission = await runFormSubmission({ form: chatForm, submit: sendButton, status: chatStatus, messages: { loading: "Brain réfléchit..." }, task: () => brain.controller.ask(query) });
      if (controller.signal.aborted || !submission.accepted) return;
      const response = submission.value;
      if (submission.error || !response) {
        chatStatus.textContent = "Brain est momentanement indisponible.";
        setFieldState(chatInput, "invalid", "La demande n'a pas pu être envoyee.");
        return;
      }
      chatStatus.textContent = response.ok ? "Réponse fondee sur le contexte minimal" : response.message;
      if (response.ok) {
        chatInput.value = "";
        clearFieldState(chatInput);
        chatInput.focus();
      } else {
        setFieldState(chatInput, "invalid", response.message);
      }
    } finally {
      thinking?.remove?.();
      renderHistory();
      submitting = false;
    }
  }

  chatForm.addEventListener("submit", submitBrainQuery, { signal: controller.signal });
  sendButton.addEventListener("click", submitBrainQuery, { signal: controller.signal });
  chatInput.addEventListener("keydown", (event) => {
    const isEnterKey = event.key === "Enter" || event.key === "OK" || event.key === "Go" || event.key === "Done" || event.keyCode === 13;
    if (isEnterKey && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void submitBrainQuery(event);
    }
  }, { signal: controller.signal });
  suggestions.addEventListener("click", async (event) => { const button = event.target.closest("[data-brain-suggestion]"); if (!button) return; const suggestion = brain.controller.suggestions().find((entry) => entry.id === button.dataset.brainSuggestion); if (!suggestion) return; let response = await brain.controller.execute(suggestion.action, suggestion.parameters); if (response.status === "confirmation-required" && confirm(`${response.message}\n\nAutoriser cette action ?`)) response = await brain.controller.execute(suggestion.action, suggestion.parameters, { confirmed: true }); options.notify?.({ id: `brain-${suggestion.id}`, title: "Brain", message: response.message, type: response.ok ? "success" : "warning" }); }, { signal: controller.signal });
  providersPanel.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-brain-provider-test]");
    if (!button || button.disabled) return;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    providerTestStatus.textContent = `Test de ${button.dataset.brainProviderTest}...`;
    const response = await brain.providers.testConnection(button.dataset.brainProviderTest);
    if (controller.signal.aborted) return;
    button.disabled = false;
    button.removeAttribute("aria-busy");
    providerTestStatus.textContent = response.message;
  }, { signal: controller.signal });
  loadMemoryButton.addEventListener("click", () => void loadMemories(), { signal: controller.signal });
  memoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (memoryBusy) return;
    memoryBusy = true;
    const submission = await runFormSubmission({ form: memoryForm, submit: memorySubmit, status: memoryStatus, messages: { loading: "Enregistrement sécurisé dans Supabase..." }, task: () => brain.memory.create({ category: memoryCategory.value, key: memoryKey.value, value: memoryValue.value, retentionDays: preferences.memory.retentionDays }) });
    memoryBusy = false;
    if (!submission.accepted) return;
    const response = submission.value;
    if (submission.error || !response) {
      memoryStatus.textContent = "La memoire n'a pas pu être enregistree.";
      return;
    }
    memoryStatus.textContent = response.message;
    if (response.ok) { memoryKey.value = ""; memoryValue.value = ""; clearFieldState(memoryKey); clearFieldState(memoryValue); await loadMemories(); }
    else setFieldState(memoryValue, "invalid", response.message);
  }, { signal: controller.signal });
  memoryList.addEventListener("click", async (event) => { const removeButton = event.target.closest("[data-memory-delete]"); const editButton = event.target.closest("[data-memory-edit]"); if (removeButton) { if (!confirm("Supprimer cette memoire Brain ?")) return; const response = await brain.memory.remove(removeButton.dataset.memoryDelete); memoryStatus.textContent = response.message; if (response.ok) await loadMemories(); } else if (editButton) { const value = prompt("Modifier la memoire", editButton.dataset.memoryValue || ""); if (value == null) return; const response = await brain.memory.update(editButton.dataset.memoryEdit, { value }); memoryStatus.textContent = response.message; if (response.ok) await loadMemories(); } }, { signal: controller.signal });
  page.querySelector("[data-brain-memory-clear]")?.addEventListener("click", async () => { if (!confirm("Supprimer definitivement toutes les memoires Brain ?")) return; const response = await brain.memory.clear({ confirmed: true }); memoryStatus.textContent = response.message; if (response.ok) await loadMemories(); }, { signal: controller.signal });
  page.querySelector("[data-brain-memory-export]")?.addEventListener("click", async () => { const response = await brain.memory.exportAll(); if (response.ok) downloadJson(response.data, "ethone-brain-memory.json"); else memoryStatus.textContent = response.message; }, { signal: controller.signal });
  page.querySelector("[data-brain-history-clear]")?.addEventListener("click", () => { brain.controller.clearHistory(); renderHistory(); }, { signal: controller.signal });
  const debouncedRenderHistoryList = debounce(renderHistoryList, 120);
  historySearch.addEventListener("input", () => { historyQuery = historySearch.value; debouncedRenderHistoryList(); }, { signal: controller.signal });
  const unsubscribe = brain.controller.subscribe((event) => { if (event.type === "history") renderHistory(); });

  automationTypeSelect.addEventListener("change", () => {
    const type = automationTypeSelect.value;
    automationRouteField.hidden = type !== "route";
    automationSpaceField.hidden = type !== "space";
    automationTimeField.hidden = type !== "time";
  }, { signal: controller.signal });
  automationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!actionFacade?.dispatch) return;
    const type = automationTypeSelect.value;
    const value = type === "route" ? automationRouteSelect.value : type === "space" ? automationSpaceSelect.value : automationTimeInput.value;
    const trigger = sanitizeAutomationTrigger({ type, value });
    const submission = await runFormSubmission({ form: automationForm, submit: automationSubmit, status: automationStatus, messages: { loading: "Creation de l'automatisation..." }, task: () => actionFacade.dispatch("v8.automation.create", { trigger, targetActionId: automationActionSelect.value }) });
    if (controller.signal.aborted || !submission.accepted) return;
    const response = submission.value;
    automationStatus.textContent = response?.message || "Automatisation créée.";
    if (response?.ok) renderAutomations();
  }, { signal: controller.signal });
  automationListHost.addEventListener("click", async (event) => {
    if (!actionFacade?.dispatch) return;
    const toggleButton = event.target.closest("[data-automation-toggle]");
    const deleteButton = event.target.closest("[data-automation-delete]");
    if (toggleButton) {
      await actionFacade.dispatch("v8.automation.toggle", { id: toggleButton.dataset.automationToggle });
      renderAutomations();
    } else if (deleteButton) {
      if (!confirm("Supprimer cette automatisation ?")) return;
      await actionFacade.dispatch("v8.automation.remove", { id: deleteButton.dataset.automationDelete });
      renderAutomations();
    }
  }, { signal: controller.signal });

  stage.replaceChildren(page);
  renderHistory();
  renderSuggestions();
  renderAutomations();
  refreshIcons();
  void loadDailyBriefing();
  renderWrapUp();
  void buildSuggestions();
  return () => { unsubscribe(); controller.abort(); page.remove(); };
}
