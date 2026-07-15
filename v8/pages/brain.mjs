import { actionButton, element, icon } from "../ui/dom.mjs";
import { statusState } from "../ui/empty-state.mjs";
import { clearFieldState, formField, runFormSubmission, setFieldState } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { workspaceById } from "../data/workspaces.mjs";
import { brainPreferenceLabel } from "../brain/preferences.mjs";

const TABS = Object.freeze([
  Object.freeze({ id: "chat", label: "Chat", icon: "message-circle" }),
  Object.freeze({ id: "context", label: "Contexte", icon: "scan-search" }),
  Object.freeze({ id: "memory", label: "Memoire", icon: "database" }),
  Object.freeze({ id: "actions", label: "Actions", icon: "zap" }),
  Object.freeze({ id: "automations", label: "Automations", icon: "workflow" }),
  Object.freeze({ id: "providers", label: "Providers", icon: "cpu" }),
  Object.freeze({ id: "privacy", label: "Confidentialite", icon: "shield-check" }),
  Object.freeze({ id: "history", label: "Historique", icon: "history" }),
  Object.freeze({ id: "diagnostics", label: "Diagnostics", icon: "activity" })
]);

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

function downloadJson(payload, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function mountBrain(stage, options = {}) {
  const state = options.state || {};
  const brain = options.brain;
  if (!brain?.controller || !brain?.context) throw new TypeError("Brain page requires the Brain runtime");
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

  const tabList = element("div", { className: "v8-brain-tabs", attributes: { role: "tablist", "aria-label": "Sections Brain" } });
  const panels = element("div", { className: "v8-brain-panels" });
  const chatLog = element("div", { className: "v8-brain-chat-log", attributes: { role: "log", "aria-live": "polite", "aria-label": "Conversation Brain" } });
  const chatInput = element("textarea", { className: "v8-input v8-brain-composer__input", attributes: { rows: "2", maxlength: "500", required: true, placeholder: "Demandez une synthese, une priorite ou une action...", "aria-label": "Demander a Brain" } });
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
      sectionHeader("Assistant personnel", preferences.assistantName, "Des reponses fondees sur le contexte autorise."),
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
        element("span", { className: "v8-badge", text: entry.active ? String(entry.count) : entry.allowed ? "En veille" : "Bloque" })
      ]))),
      element("footer", { className: "v8-brain-privacy-note" }, [icon("shield-check"), element("p", { text: "Aucun mot de passe, token, secret ou contenu complet n'est inclus." })])
    ])
  ]);

  const memoryCategory = element("select", { className: "v8-input", attributes: { "aria-label": "Categorie de memoire" } }, ["interface", "habits", "widgets", "schedules", "task-types", "spaces", "flows", "response-style", "goals"].map((value) => element("option", { text: value, attributes: { value } })));
  const memoryKey = element("input", { className: "v8-input", attributes: { type: "text", maxlength: "80", required: true, placeholder: "Nom de la preference", "aria-label": "Nom de la memoire" } });
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
      sectionHeader("Memoire controlee", "Vos preferences, sous votre controle", "Stockage Supabase avec RLS et retention.", loadMemoryButton),
      memoryStatus,
      preferences.memory.enabled ? memoryForm : statusState("empty", {
        iconName: "database-zap",
        eyebrow: "Memoire controlee",
        title: "Memoire Brain desactivee",
        description: "Activez-la dans les reglages pour enregistrer uniquement les preferences que vous choisissez.",
        actions: [actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Ouvrir les reglages" })])],
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

  const automationsPanel = brainPanel("automations", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Review mode", "Suggestions avant automatisation", "Brain peut proposer un Flow, un widget ou une densite, mais ne modifie jamais un reglage important seul."), element("div", { className: "v8-brain-policy" }, [icon("workflow"), element("div", {}, [element("strong", { text: `Niveau actuel : ${preferences.automationLevel}` }), element("p", { text: "Chaque proposition reste visible et revisable avant execution." })])])])
  ]);

  const providerTestStatus = element("p", { className: "v8-brain-inline-status", text: "Tests reseau a la demande.", attributes: { "aria-live": "polite" } });
  const providerCards = brain.providers.providers().map((provider) => element("article", { className: `v8-brain-provider${provider.id === preferences.provider.active ? " is-active" : ""}` }, [
    element("header", {}, [element("span", {}, [icon(provider.kind === "cloud" ? "cloud" : "hard-drive")]), statusPill(provider.status === "ready" ? "Actif" : provider.status === "backend-ready" ? "Disponible" : "Backend requis", provider.status === "ready" ? "success" : "neutral")]),
    element("strong", { text: provider.label }),
    element("p", { text: provider.privacy }),
    element("small", { text: provider.kind === "cloud" ? "Cloud" : "Local" }),
    element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { brainProviderTest: provider.id } }, [icon("plug"), element("span", { text: "Tester" })])
  ]));
  const providersPanel = brainPanel("providers", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Provider Manager", "Modeles et confidentialite", "Les providers cloud passent par le backend securise ETHONE."), providerTestStatus, element("div", { className: "v8-brain-provider-grid" }, providerCards)])
  ]);

  const permissionRows = Object.entries(preferences.permissions).map(([key, allowed]) => element("div", { className: "v8-brain-permission" }, [element("span", {}, [icon(allowed ? "eye" : "eye-off")]), element("strong", { text: key }), statusPill(allowed ? "Autorise" : "Bloque", allowed ? "success" : "neutral")]))
  const privacyPanel = brainPanel("privacy", [
    element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Privacy Center", "Acces par categorie", "Vous voyez exactement les donnees consultables. Les secrets ne sont jamais une categorie autorisable.", actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Modifier" })])), element("div", { className: "v8-brain-permissions" }, permissionRows), element("footer", { className: "v8-brain-never-sent" }, [element("strong", { text: "Jamais transmis" }), element("p", { text: "Mots de passe, tokens, cles API, cookies, sessions et identifiants de connexion prives." })])])
  ]);

  const historySearch = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher dans l'historique", "aria-label": "Rechercher dans l'historique", autocomplete: "off" } });
  const historyCount = element("span", { className: "v8-section-count", attributes: { "aria-live": "polite" } });
  const historyHost = element("div", { className: "v8-brain-history", attributes: { role: "log", "aria-label": "Historique Brain" } });
  const historyPanel = brainPanel("history", [element("article", { className: "v8-brain-detail v8-surface" }, [
    sectionHeader("Session courante", "Historique prive", "Conserve uniquement en memoire pour cette session et limite a 60 messages.", element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, dataset: { brainHistoryClear: "" } }, [icon("eraser"), element("span", { text: "Effacer" })])),
    element("div", { className: "v8-brain-history-tools" }, [element("div", { className: "v8-input-wrap" }, [icon("search"), historySearch]), historyCount]),
    historyHost
  ])]);

  const diagnosticsPanel = brainPanel("diagnostics", [element("article", { className: "v8-brain-detail v8-surface" }, [sectionHeader("Execution a la demande", "Diagnostics Brain", "Aucun observer, timer ou traitement de Dashboard ne tourne lorsque Brain est ferme."), element("pre", { className: "v8-brain-diagnostics", text: JSON.stringify(brain.diagnostics(), null, 2) })])]);

  [chatPanel, contextPanel, memoryPanel, actionsPanel, automationsPanel, providersPanel, privacyPanel, historyPanel, diagnosticsPanel].forEach((panel) => panels.append(panel));
  TABS.forEach((tab, index) => tabList.append(element("button", { className: `v8-brain-tab${index === 0 ? " is-active" : ""}`, attributes: { type: "button", role: "tab", "aria-selected": index === 0 ? "true" : "false", "aria-controls": `v8-brain-panel-${tab.id}`, tabindex: index === 0 ? "0" : "-1" }, dataset: { brainTab: tab.id } }, [icon(tab.icon), element("span", { text: tab.label })])));

  const page = element("section", { className: "v8-page v8-brain-page", dataset: { page: "brain" } }, [
    element("header", { className: "v8-page-heading" }, [element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: "Intelligence personnelle" }), element("h1", { text: "Brain" }), element("p", { text: "Un contexte utile, protege et sous votre controle." })]), element("div", { className: "v8-page-heading__actions" }, [statusPill("Contexte actif", "success"), actionButton({ actionId: "v8.command.open", variant: "primary" }, [icon("sparkles"), element("span", { text: "Command HUD" })])])]),
    element("section", { className: "v8-brain-hero v8-surface" }, [element("div", { className: "v8-brain-hero__identity" }, [element("span", { className: "v8-brain-orbit", dataset: { liveWidget: "brain", liveKind: "brain" } }, [icon("brain")]), element("div", {}, [element("small", { text: "Contexte courant" }), element("h2", { text: `${state.flow || workspace.flow} dans ${workspace.label}` }), element("p", { text: `Profil ${brainPreferenceLabel("persona", preferences.persona)}, reponses ${brainPreferenceLabel("detail", preferences.detail)}, automatisation ${brainPreferenceLabel("automationLevel", preferences.automationLevel)}.` })])]), element("div", { className: "v8-brain-hero__metrics" }, [metric("circle-check-big", "Priorites", openTasks.length), metric("notebook-pen", "Notes", snapshot.notes?.length || 0), metric("plug", "Connectees", connected.length), metric("shield-check", "Sources", context.sources.filter((entry) => entry.active).length)])]),
    tabList,
    panels
  ]);

  function renderHistory() {
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
      description: entries.length ? "Modifiez votre recherche pour retrouver un échange." : "Commencez une conversation pour retrouver ici son historique prive.",
      compact: true,
      inline: true
    })]));
    chatLog.replaceChildren(...(entries.length ? entries.map(messageBubble) : [messageBubble({ role: "assistant", content: `Je suis pret dans ${workspace.label}. Je ne charge que le contexte necessaire a votre demande.` })]));
    chatLog.scrollTop = chatLog.scrollHeight;
    refreshIcons();
  }

  function renderSuggestions() {
    suggestions.replaceChildren(...brain.controller.suggestions().map((suggestion) => element("button", { className: "v8-brain-suggestion", attributes: { type: "button" }, dataset: { brainSuggestion: suggestion.id } }, [element("span", {}, [icon("sparkles")]), element("div", {}, [element("strong", { text: suggestion.title }), element("small", { text: suggestion.detail })]), icon("arrow-up-right")])));
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
    memoryStatus.textContent = "Chargement securise depuis Supabase...";
    memoryList.replaceChildren(statusState("loading", {
      title: "Chargement des memoires",
      description: "Lecture securisee depuis Supabase avec les permissions du compte actif.",
      compact: true,
      inline: true
    }));
    refreshIcons();
    const response = await brain.memory.list();
    if (controller.signal.aborted) return;
    memoryBusy = false;
    loadMemoryButton.disabled = false;
    memoryLoaded = response.ok;
    memoryStatus.textContent = response.ok ? `${response.data.length} memoire${response.data.length > 1 ? "s" : ""} active${response.data.length > 1 ? "s" : ""}.` : response.message;
    memoryList.replaceChildren(...(response.ok && response.data.length ? response.data.map((entry) => element("div", { className: "v8-brain-memory", dataset: { memoryId: entry.id } }, [element("span", {}, [icon("bookmark")]), element("div", {}, [element("small", { text: entry.category }), element("strong", { text: entry.key }), element("p", { text: entry.value })]), element("div", {}, [element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Modifier la memoire" }, dataset: { memoryEdit: entry.id, memoryValue: entry.value } }, [icon("pencil")]), element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Supprimer la memoire" }, dataset: { memoryDelete: entry.id } }, [icon("trash-2")])])])) : [statusState(response.ok ? "empty" : "error", {
      iconName: "database",
      eyebrow: "Memoire controlee",
      title: response.ok ? "Aucune memoire active" : "Memoires indisponibles",
      description: response.ok ? "Ajoutez une preference explicite lorsque Brain doit la retenir." : response.message,
      actions: response.ok ? [] : [element("button", { className: "v8-button v8-button--secondary", attributes: { type: "button" }, events: { click: () => void loadMemories() } }, [icon("refresh-cw"), element("span", { text: "Reessayer" })])],
      compact: true,
      inline: true
    })]));
    refreshIcons();
  }

  tabList.addEventListener("click", (event) => { const button = event.target.closest("[data-brain-tab]"); if (button) activateTab(button.dataset.brainTab); }, { signal: controller.signal });
  tabList.addEventListener("keydown", (event) => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return; event.preventDefault(); const index = TABS.findIndex((tab) => tab.id === activeTab); const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length; activateTab(TABS[next].id, true); }, { signal: controller.signal });
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = chatInput.value.trim();
    if (!query) return;
    chatStatus.textContent = "Brain analyse le contexte autorise...";
    const submission = await runFormSubmission({ form: chatForm, submit: sendButton, status: chatStatus, messages: { loading: "Brain analyse le contexte autorise..." }, task: () => brain.controller.ask(query) });
    if (controller.signal.aborted || !submission.accepted) return;
    const response = submission.value;
    if (submission.error || !response) {
      chatStatus.textContent = "Brain est momentanement indisponible.";
      setFieldState(chatInput, "invalid", "La demande n'a pas pu etre envoyee.");
      return;
    }
    chatStatus.textContent = response.ok ? "Reponse fondee sur le contexte minimal" : response.message;
    if (response.ok) { chatInput.value = ""; clearFieldState(chatInput); }
    else setFieldState(chatInput, "invalid", response.message);
    renderHistory();
  }, { signal: controller.signal });
  chatInput.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); chatForm.requestSubmit(); } }, { signal: controller.signal });
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
    const submission = await runFormSubmission({ form: memoryForm, submit: memorySubmit, status: memoryStatus, messages: { loading: "Enregistrement securise dans Supabase..." }, task: () => brain.memory.create({ category: memoryCategory.value, key: memoryKey.value, value: memoryValue.value, retentionDays: preferences.memory.retentionDays }) });
    memoryBusy = false;
    if (!submission.accepted) return;
    const response = submission.value;
    if (submission.error || !response) {
      memoryStatus.textContent = "La memoire n'a pas pu etre enregistree.";
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
  historySearch.addEventListener("input", () => { historyQuery = historySearch.value; renderHistory(); }, { signal: controller.signal });
  const unsubscribe = brain.controller.subscribe((event) => { if (event.type === "history") renderHistory(); });

  stage.replaceChildren(page);
  renderHistory();
  renderSuggestions();
  refreshIcons();
  return () => { unsubscribe(); controller.abort(); page.remove(); };
}
