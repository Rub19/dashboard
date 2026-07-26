import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  connectionMethod,
  connectionMethods,
  integrationById,
  integrationCategory,
  officialResources,
  setupGuide
} from "../data/integrations.mjs";
import { brandIconMarkup } from "../data/brand-icons.mjs";
import { listConfiguredProviders, removeProviderCredential, saveProviderCredential } from "../services/provider-credentials.mjs";
import { actionButton, debounce, element, icon } from "../ui/dom.mjs";
import { collectionDensityControl, updateCollectionDensityControl } from "../ui/dense-content.mjs";
import { emptyState, statusState } from "../ui/empty-state.mjs";
import { formField, setFieldState } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { createSelect } from "../ui/select.mjs";
import {
  connectionMetrics,
  connectionState,
  connectionSummary,
  detectConnectionOpportunities,
  filterConnectionCatalog,
  mergeWorkerDiagnostic,
  methodAvailability,
  runConnectionDiagnostics,
  sortConnectionCatalog,
  workerServiceForConnection
} from "./connections-model.mjs";
import { prepareActivityUI } from "./activity-style.mjs";

export { prepareActivityUI as prepare };

const CONNECTION_PAGE_SIZE = 18;

const STATE_META = Object.freeze({
  connected: { label: "Connecte", icon: "circle-check-big", tone: "success" },
  prepared: { label: "Prepare", icon: "shield-check", tone: "warning" },
  available: { label: "Disponible", icon: "plus-circle", tone: "muted" },
  limited: { label: "Acces limite", icon: "lock-keyhole", tone: "muted" },
  attention: { label: "A verifier", icon: "triangle-alert", tone: "danger" },
  syncing: { label: "Synchronisation", icon: "refresh-cw", tone: "info" }
});

const DIAGNOSTIC_META = Object.freeze({
  pass: { icon: "circle-check", label: "OK", tone: "success" },
  warn: { icon: "triangle-alert", label: "Attention", tone: "warning" },
  fail: { icon: "circle-x", label: "Bloque", tone: "danger" },
  idle: { icon: "circle-dashed", label: "Non teste", tone: "muted" }
});

const INSPECTOR_TABS = Object.freeze([
  { id: "overview", label: "Apercu", icon: "layout-dashboard" },
  { id: "methods", label: "Methodes", icon: "waypoints" },
  { id: "setup", label: "Assistant", icon: "list-checks" },
  { id: "diagnostics", label: "Diagnostic", icon: "stethoscope" }
]);

function completed(message, data = null) {
  return Object.freeze({ ok: true, status: "completed", message, data });
}

function unavailable(message, data = null) {
  return Object.freeze({ ok: false, status: "unavailable", message, data });
}

function connectionAction(actionId, integrationId, variant, children, options = {}) {
  const button = actionButton({ actionId, variant, className: options.className || "", ariaLabel: options.ariaLabel || null, disabled: options.disabled === true }, children);
  if (integrationId) button.dataset.integration = integrationId;
  if (options.method) button.dataset.method = options.method;
  if (options.tab) button.dataset.tab = options.tab;
  if (options.value) button.dataset.value = options.value;
  if (options.tooltip) button.dataset.tooltip = options.tooltip;
  return button;
}

function stateBadge(integration, connection) {
  const state = connectionState(integration, connection);
  const meta = STATE_META[state] || STATE_META.available;
  return element("span", { className: `v8-connection-status v8-connection-status--${meta.tone}` }, [icon(meta.icon), element("span", { text: meta.label })]);
}

function integrationIcon(integration) {
  const markup = brandIconMarkup(integration.id);
  if (!markup) return icon(integration.icon);
  const wrapper = document.createElement("span");
  wrapper.innerHTML = markup;
  return wrapper.firstElementChild;
}

function badge(label, tone = "default") {
  return element("span", { className: `v8-connection-badge v8-connection-badge--${tone}`, text: label });
}

function officialLink(resource, compact = false) {
  return element("a", {
    className: compact ? "v8-resource-link v8-resource-link--compact" : "v8-resource-link",
    attributes: { href: resource.url, target: "_blank", rel: "noopener noreferrer", "aria-label": `${resource.label} (nouvel onglet)` }
  }, [icon(resource.kind === "Console" ? "square-terminal" : "book-open-text"), element("span", {}, [element("strong", { text: resource.label }), compact ? null : element("small", { text: resource.kind })]), icon("arrow-up-right")]);
}

function metric(label, value, iconName, tone) {
  return element("div", { className: `v8-connections-metric v8-connections-metric--${tone}` }, [
    element("span", {}, [icon(iconName)]),
    element("div", {}, [element("strong", { text: String(value) }), element("small", { text: label })])
  ]);
}

function metaCell(label, value) {
  return element("div", {}, [element("dt", { text: label }), element("dd", { text: value })]);
}

function connectionCard(integration, connection, selectedId) {
  const category = integrationCategory(integration.category);
  const summary = connectionSummary(integration, connection);
  const current = summary.method;
  const isSelected = selectedId === integration.id;
  const canDisconnect = connection?.setupComplete === true || connection?.status === "connected";
  const badges = current?.badges?.slice(0, 3) || [];
  return element("article", {
    className: `v8-connection-card v8-surface${isSelected ? " is-selected" : ""}`,
    dataset: { integrationCard: integration.id },
    attributes: { "aria-label": `${integration.name}, ${STATE_META[summary.state]?.label || summary.state}` }
  }, [
    element("header", { className: "v8-connection-card__header" }, [
      element("span", { className: `v8-connection-card__icon v8-connection-card__icon--${integration.category}`, dataset: { presenceIcon: integration.id === "email" ? "mail" : null } }, [integrationIcon(integration)]),
      element("div", { className: "v8-connection-card__identity" }, [element("h3", { text: integration.name, attributes: { translate: "no" } }), element("span", { text: category.label })]),
      stateBadge(integration, connection)
    ]),
    element("div", { className: "v8-connection-card__badges" }, badges.map((label, index) => badge(label, index === 0 && current?.recommended ? "accent" : "default"))),
    element("p", { className: "v8-connection-card__description", text: integration.description }),
    element("dl", { className: "v8-connection-card__meta" }, [
      metaCell("Methode", current?.label || "Non disponible"),
      metaCell("Qualite", summary.quality),
      metaCell("Derniere sync", summary.lastSync),
      metaCell("Reponse", summary.response)
    ]),
    element("div", { className: "v8-connection-card__signal" }, [icon("activity"), element("span", { text: integration.liveSignal }), element("small", { text: summary.apiVersion })]),
    element("footer", { className: "v8-connection-card__actions" }, [
      connectionAction("v8.connections.configure", integration.id, connection?.status === "connected" ? "secondary" : "primary", [icon(connection?.setupComplete ? "settings-2" : "plug-zap"), element("span", { text: connection?.status === "connected" ? "Gerer" : connection?.setupComplete ? "Revoir" : "Configurer" })]),
      connectionAction("v8.connections.method.open", integration.id, "secondary", [icon("waypoints")], { className: "v8-icon-button", ariaLabel: `Changer la methode ${integration.name}`, tooltip: "Changer de methode" }),
      connectionAction("v8.connections.test", integration.id, "secondary", [icon("stethoscope")], { className: "v8-icon-button", ariaLabel: `Tester ${integration.name}`, tooltip: "Diagnostic securise" }),
      canDisconnect ? connectionAction("v8.connections.disconnect", integration.id, "danger", [icon("unplug")], { className: "v8-icon-button", ariaLabel: `Deconnecter ${integration.name}`, tooltip: "Deconnecter" }) : null
    ])
  ]);
}

function validateReference(method, rawValue) {
  const value = String(rawValue || "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 512);
  if (!method?.field) return Object.freeze({ ok: true, value: "" });
  if (!value) return Object.freeze({ ok: false, message: `${method.field.label} est requis.` });
  if (method.field.type !== "url") {
    if (/[<>]/.test(value) || value.length < 2) return Object.freeze({ ok: false, message: "La reference publique n'est pas valide." });
    return Object.freeze({ ok: true, value });
  }
  try {
    const parsed = new URL(value);
    if (!new Set(["http:", "https:"]).has(parsed.protocol) || parsed.username || parsed.password) throw new Error("protocol");
    const sensitiveParameter = [...parsed.searchParams.keys()].some((key) => /token|secret|key|auth|signature/i.test(key));
    if (sensitiveParameter) return Object.freeze({ ok: false, message: "Cette adresse semble contenir une donnee sensible. Utilisez une adresse publique." });
    if (method.availability === "local") {
      const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
      if (!localHosts.has(parsed.hostname)) return Object.freeze({ ok: false, message: "Le bridge local doit utiliser localhost ou la boucle locale." });
    } else if (parsed.protocol !== "https:") {
      return Object.freeze({ ok: false, message: "Une adresse publique HTTPS est requise." });
    }
    return Object.freeze({ ok: true, value: parsed.href });
  } catch {
    return Object.freeze({ ok: false, message: "L'adresse indiquee n'est pas valide." });
  }
}

async function copyText(value) {
  const content = String(value || "");
  if (!content) return false;
  try {
    if (globalThis.navigator?.clipboard?.writeText) {
      await globalThis.navigator.clipboard.writeText(content);
      return true;
    }
    const input = document.createElement("textarea");
    input.value = content;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const copied = document.execCommand?.("copy") === true;
    input.remove();
    return copied;
  } catch {
    return false;
  }
}

export function mountConnections(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const journal = options.journal;
  const notify = options.notify || (() => {});
  const spotifyLive = options.spotifyLive || null;
  const discordLive = options.discordLive || null;
  const weatherLive = options.weatherLive || null;
  function refreshLiveBridges(id) {
    if (id === "spotify") spotifyLive?.refresh?.();
    if (id === "discord") discordLive?.refresh?.();
    if (id === "weather") weatherLive?.refresh?.();
  }
  const externalServices = options.externalServices || null;
  const clientProvider = typeof options.clientProvider === "function" ? options.clientProvider : null;
  const ownerId = options.ownerId || "";
  const controller = new AbortController();
  const releases = [];
  const selectedMethods = new Map();
  const draftReferences = new Map();
  const credentialDrafts = new Map();
  const credentialStatus = new Map();
  const credentialPending = new Set();
  const diagnostics = new Map();
  const pendingDiagnostics = new Set();
  let category = "all";
  let status = "all";
  let query = "";
  let order = "recommended";
  let visibleLimit = CONNECTION_PAGE_SIZE;
  let inspectorTab = "overview";
  let globalDiagnostic = null;
  let globalDiagnosticPending = false;

  const initialConnections = repository.snapshot().connections || [];
  initialConnections.forEach((connection) => {
    if (connection.methodId) selectedMethods.set(connection.id, connection.methodId);
    if (connection.reference) draftReferences.set(connection.id, connection.reference);
  });
  let selectedId = initialConnections.find((connection) => connection.status === "connected")?.id || "spotify";

  const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Spotify, GitHub, Calendar...", "aria-label": "Rechercher une integration", autocomplete: "off" } });
  const statusFilter = createSelect({ className: "v8-input v8-connections-status-filter", attributes: { "aria-label": "Filtrer par statut" } }, [
    element("option", { text: "Tous les statuts", attributes: { value: "all" } }),
    element("option", { text: "Connectes", attributes: { value: "connected" } }),
    element("option", { text: "Prepares", attributes: { value: "prepared" } }),
    element("option", { text: "Disponibles", attributes: { value: "available" } }),
    element("option", { text: "A verifier", attributes: { value: "attention" } }),
    element("option", { text: "Acces limite", attributes: { value: "limited" } })
  ]);
  const sortSelect = createSelect({ className: "v8-input v8-connections-sort", attributes: { "aria-label": "Trier les intégrations" } }, [
    element("option", { text: "Recommandées", attributes: { value: "recommended" } }),
    element("option", { text: "Nom", attributes: { value: "name" } }),
    element("option", { text: "Catégorie", attributes: { value: "category" } })
  ]);
  const densityControl = collectionDensityControl(options.state?.density || document.documentElement.dataset.density || "automatic");
  const categoryBar = element("div", { className: "v8-connection-categories", attributes: { role: "toolbar", "aria-label": "Categories d'integrations" } });
  const grid = element("div", { className: "v8-connections-grid" });
  const loadMoreHost = element("div", { className: "v8-connections-more" });
  const resultCount = element("span", { className: "v8-section-count" });
  const metricsHost = element("section", { className: "v8-connections-metrics", attributes: { "aria-label": "Etat des connexions" } });
  const diagnosticState = element("div", { className: "v8-connections-health", attributes: { "aria-live": "polite" } });
  const opportunityHost = element("section", { className: "v8-connection-opportunities", attributes: { hidden: true, "aria-label": "Connexions detectees" } });
  const inspectorHost = element("aside", { className: "v8-connections-inspector v8-surface", attributes: { "aria-label": "Inspecteur de connexion" } });

  INTEGRATION_CATEGORIES.forEach((entry) => categoryBar.append(element("button", {
    className: `v8-filter-chip${entry.id === category ? " is-active" : ""}`,
    attributes: { type: "button", "aria-pressed": entry.id === category ? "true" : "false" },
    dataset: { connectionCategory: entry.id }
  }, [icon(entry.icon), element("span", { text: entry.label })])));

  const page = element("section", { className: "v8-page v8-connections-page", dataset: { page: "connections" } }, [
    element("header", { className: "v8-page-heading v8-connections-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [
        element("span", { className: "v8-eyebrow", text: "Integration workspace" }),
        element("h1", { text: "Connections Hub" }),
        element("p", { text: "Un catalogue guide, des permissions lisibles et aucun faux etat de connexion." })
      ]),
      element("div", { className: "v8-page-heading__actions" }, [
        actionButton({ actionId: "v8.activity.open", variant: "secondary" }, [icon("activity"), element("span", { text: "Activity Hub" })]),
        actionButton({ actionId: "v8.connections.diagnose-all", variant: "primary" }, [icon("scan-search"), element("span", { text: "Diagnostic securise" })])
      ])
    ]),
    element("div", { className: "v8-connections-overview" }, [metricsHost, diagnosticState]),
    opportunityHost,
    element("div", { className: "v8-connections-workspace" }, [
      element("section", { className: "v8-connections-catalog", attributes: { "aria-label": "Catalogue des integrations" } }, [
        element("header", { className: "v8-connections-toolbar" }, [
          element("div", { className: "v8-input-wrap v8-connections-search" }, [icon("search"), search]),
          statusFilter,
          sortSelect,
          densityControl,
          resultCount
        ]),
        categoryBar,
        grid,
        loadMoreHost
      ]),
      inspectorHost
    ]),
    element("footer", { className: "v8-connections-security" }, [
      icon("shield-check"),
      element("div", {}, [element("strong", { text: "Architecture zero secret dans l'interface" }), element("p", { text: "Les routes migrees passent par ETHONE Worker avec votre session Supabase. Les secrets fournisseur restent exclusivement cote serveur." })])
    ])
  ]);

  function connectionList() {
    return repository.snapshot().connections || [];
  }

  function connectionMap() {
    return new Map(connectionList().map((connection) => [connection.id, connection]));
  }

  function selectedMethod(integration, connection) {
    return connectionMethod(integration, selectedMethods.get(integration.id) || connection?.methodId);
  }

  function renderMetrics() {
    const values = connectionMetrics(INTEGRATIONS, connectionList());
    metricsHost.replaceChildren(
      metric("Connectees", values.connected, "circle-check-big", "success"),
      metric("Preparees", values.prepared, "shield-check", "warning"),
      metric("Disponibles", values.available, "blocks", "info"),
      metric("A verifier", values.attention, "triangle-alert", "danger")
    );
    diagnosticState.replaceChildren(
      element("span", { className: `v8-connections-health__icon${globalDiagnostic?.failed ? " is-critical" : ""}` }, [icon(globalDiagnostic?.failed ? "shield-alert" : globalDiagnostic ? "shield-check" : "scan-search")]),
      element("div", {}, [
        element("strong", { text: globalDiagnostic ? `${globalDiagnostic.tested} connexion${globalDiagnostic.tested > 1 ? "s" : ""} verifiee${globalDiagnostic.tested > 1 ? "s" : ""}` : "Diagnostic pret" }),
        element("small", { text: globalDiagnostic ? `${globalDiagnostic.failed} blocage, ${globalDiagnostic.warnings} avertissement` : "Aucune requete distante n'est lancee sans votre action." })
      ])
    );
  }

  function renderOpportunities() {
    const opportunities = detectConnectionOpportunities(connectionList());
    opportunityHost.hidden = opportunities.length === 0;
    opportunityHost.replaceChildren(...opportunities.slice(0, 2).map((entry) => element("article", { className: "v8-connection-opportunity v8-surface" }, [
      element("span", { className: "v8-connection-opportunity__icon" }, [icon("sparkles")]),
      element("div", {}, [element("small", { text: `Detecte via ${entry.source?.name || "connexion"}` }), element("strong", { text: entry.title }), element("p", { text: entry.description })]),
      connectionAction("v8.connections.opportunity.apply", entry.targetId, "secondary", [icon("arrow-right"), element("span", { text: "Configurer" })], { method: entry.methodId })
    ])));
  }

  function renderCatalog() {
    const connections = connectionList();
    const map = new Map(connections.map((connection) => [connection.id, connection]));
    const visible = sortConnectionCatalog(filterConnectionCatalog(INTEGRATIONS, { category, status, query, connections }), order, connections);
    const displayed = visible.slice(0, visibleLimit);
    grid.replaceChildren(...displayed.map((integration) => connectionCard(integration, map.get(integration.id), selectedId)));
    loadMoreHost.replaceChildren();
    if (displayed.length < visible.length) {
      loadMoreHost.append(element("button", {
        className: "v8-button v8-button--secondary",
        attributes: { type: "button", "aria-label": "Afficher plus" },
        events: { click: () => {
          visibleLimit += CONNECTION_PAGE_SIZE;
          renderCatalog();
          refreshIcons();
        } }
      }, [icon("chevrons-down"), element("span", { text: "Afficher plus" })]));
    }
    if (!visible.length) {
      const reset = element("button", {
        className: "v8-button v8-button--primary",
        text: "Reinitialiser les filtres",
        attributes: { type: "button" },
        events: { click: () => {
          query = "";
          category = "all";
          status = "all";
          visibleLimit = CONNECTION_PAGE_SIZE;
          search.value = "";
          statusFilter.value = "all";
          renderCatalog();
          refreshIcons();
          search.focus({ preventScroll: true });
        } }
      });
      grid.append(emptyState({ kind: "no-results", iconName: "search-x", eyebrow: "Catalogue", title: "Aucune integration trouvee", description: "Essayez un autre service, statut ou categorie.", actions: [reset], className: "v8-empty-state--wide" }));
    }
    resultCount.textContent = `${displayed.length} / ${visible.length}`;
    categoryBar.querySelectorAll("[data-connection-category]").forEach((button) => {
      const active = button.dataset.connectionCategory === category;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function tabButton(entry) {
    const button = connectionAction("v8.connections.tab", selectedId, null, [icon(entry.icon), element("span", { text: entry.label })], { tab: entry.id, className: `v8-connection-tab${inspectorTab === entry.id ? " is-active" : ""}` });
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", inspectorTab === entry.id ? "true" : "false");
    return button;
  }

  function overviewPanel(integration, connection, method) {
    const summary = connectionSummary(integration, connection);
    const resources = officialResources(integration);
    const report = diagnostics.get(integration.id);
    return element("div", { className: "v8-connection-inspector-panel", attributes: { role: "tabpanel" } }, [
      element("section", { className: "v8-connection-method-hero" }, [
        element("div", { className: "v8-connection-method-hero__top" }, [
          badge(method?.recommended ? "Methode recommandee" : "Methode selectionnee", "accent"),
          report?.workerVerified ? badge("Securise par ETHONE Worker", "accent") : null,
          element("span", { text: summary.quality })
        ]),
        element("h3", { text: method?.label || "Methode indisponible" }),
        element("p", { text: method?.summary || "Aucune methode compatible n'est proposee." }),
        element("div", { className: "v8-connection-badge-row" }, (method?.badges || []).map((label) => badge(label)))
      ]),
      element("section", { className: "v8-connection-detail-grid" }, [
        element("div", {}, [icon("activity"), element("span", {}, [element("small", { text: "Activity Hub" }), element("strong", { text: integration.liveSignal })])]),
        element("div", {}, [icon("clock-3"), element("span", {}, [element("small", { text: "Derniere sync" }), element("strong", { text: summary.lastSync })])]),
        element("div", {}, [icon("gauge"), element("span", {}, [element("small", { text: "Reponse" }), element("strong", { text: summary.response })])]),
        element("div", {}, [icon("braces"), element("span", {}, [element("small", { text: "Version" }), element("strong", { text: summary.apiVersion })])])
      ]),
      element("section", { className: "v8-connection-list-section" }, [
        element("header", {}, [element("h3", { text: "Ce que la methode apporte" }), element("span", { text: `${method?.capabilities?.length || 0} capacites` })]),
        element("ul", {}, (method?.capabilities || []).map((entry) => element("li", {}, [icon("check"), element("span", { text: entry })])))
      ]),
      element("section", { className: "v8-connection-list-section" }, [
        element("header", {}, [element("h3", { text: "Permissions lisibles" }), icon("shield-check")]),
        element("ul", {}, (method?.permissions || []).map((entry) => element("li", {}, [icon("dot"), element("span", { text: entry })])))
      ]),
      resources.length ? element("section", { className: "v8-connection-resources" }, [element("h3", { text: "Ressources officielles" }), ...resources.map((resource) => officialLink(resource))]) : null,
      element("footer", { className: "v8-connection-inspector-actions" }, [
        connectionAction("v8.connections.configure", integration.id, "primary", [icon("list-checks"), element("span", { text: connection?.setupComplete ? "Revoir la configuration" : "Commencer" })]),
        connectionAction("v8.connections.method.open", integration.id, "secondary", [icon("waypoints"), element("span", { text: "Changer de methode" })])
      ])
    ]);
  }

  function methodsPanel(integration, connection, method) {
    const methods = connectionMethods(integration);
    const connections = connectionList();
    return element("div", { className: "v8-connection-inspector-panel", attributes: { role: "tabpanel" } }, [
      element("div", { className: "v8-connection-panel-intro" }, [element("h3", { text: "Choisissez le niveau d'integration" }), element("p", { text: "La methode recommandee privilegie la fiabilite, les permissions minimales et la reversibilite." })]),
      element("div", { className: "v8-connection-methods", attributes: { role: "radiogroup", "aria-label": `Methodes ${integration.name}` } }, methods.map((entry) => {
        const availability = methodAvailability(entry, connections);
        const active = entry.id === method?.id;
        return element("button", {
          className: `v8-connection-method${active ? " is-selected" : ""}`,
          attributes: { type: "button", role: "radio", "aria-checked": active ? "true" : "false" },
          dataset: { action: "v8.connections.method.select", integration: integration.id, method: entry.id }
        }, [
          element("span", { className: "v8-connection-method__select" }, [icon(active ? "circle-check-big" : "circle")]),
          element("div", { className: "v8-connection-method__copy" }, [
            element("div", { className: "v8-connection-method__heading" }, [element("strong", { text: entry.label })]),
            element("p", { text: entry.summary }),
            element("div", { className: "v8-connection-badge-row" }, [
              entry.recommended ? badge("Recommande", "accent") : null,
              badge(availability.label, availability.usable ? "default" : "warning"),
              ...entry.badges.slice(0, 3).map((label) => badge(label))
            ].filter(Boolean)),
            !availability.usable ? element("small", { className: "v8-connection-method__reason", text: availability.reason }) : null
          ]),
          icon("chevron-right")
        ]);
      })),
      element("footer", { className: "v8-connection-inspector-actions" }, [
        connectionAction("v8.connections.tab", integration.id, "primary", [element("span", { text: "Continuer" }), icon("arrow-right")], { tab: "setup" })
      ])
    ]);
  }

  async function loadCredentialStatus() {
    if (!clientProvider || !ownerId) return;
    const client = await clientProvider().catch(() => null);
    if (!client) return;
    const map = await listConfiguredProviders({ client, ownerId });
    credentialStatus.clear();
    Object.entries(map).forEach(([provider, meta]) => credentialStatus.set(provider, meta));
    renderInspector();
  }

  function credentialSection(integration, method) {
    if (!method?.credential) return null;
    const { provider, fields } = method.credential;
    const configured = credentialStatus.has(provider);
    const pending = credentialPending.has(provider);
    const draft = credentialDrafts.get(integration.id) || {};
    const inputs = fields.map((field) => {
      const input = element("input", {
        className: "v8-input",
        attributes: {
          type: /secret|key/i.test(field.key) ? "password" : "text",
          placeholder: field.placeholder || "",
          value: draft[field.key] || "",
          autocomplete: "off",
          spellcheck: "false",
          "aria-label": field.label
        }
      });
      input.addEventListener("input", () => {
        credentialDrafts.set(integration.id, { ...(credentialDrafts.get(integration.id) || {}), [field.key]: input.value });
      }, { signal: controller.signal });
      return formField({ label: field.label, control: input, input, className: "v8-connection-credential__field" });
    });
    const saveButton = element("button", {
      className: "v8-button v8-button--primary",
      attributes: { type: "button", disabled: pending || null }
    }, [icon(pending ? "loader-circle" : "key-round"), element("span", { text: configured ? "Mettre a jour" : "Enregistrer ma cle" })]);
    saveButton.addEventListener("click", async () => {
      if (!clientProvider || !ownerId) {
        notify({ id: `credential-${provider}`, title: "Non disponible", message: "Connectez-vous pour enregistrer votre propre cle.", type: "error" });
        return;
      }
      credentialPending.add(provider);
      renderInspector();
      const client = await clientProvider().catch(() => null);
      const outcome = client
        ? await saveProviderCredential({ client, ownerId, provider, fields, values: credentialDrafts.get(integration.id) || {} })
        : { ok: false, message: "Le service Supabase n'est pas disponible." };
      credentialPending.delete(provider);
      if (outcome.ok) {
        credentialDrafts.delete(integration.id);
        credentialStatus.set(provider, { updatedAt: new Date().toISOString() });
      }
      notify({ id: `credential-${provider}`, title: outcome.ok ? "Cle personnelle enregistree" : "Enregistrement impossible", message: outcome.message, type: outcome.ok ? "success" : "error" });
      renderInspector();
    }, { signal: controller.signal });
    const removeButton = configured ? element("button", {
      className: "v8-button v8-button--secondary",
      attributes: { type: "button", disabled: pending || null }
    }, [icon("trash-2"), element("span", { text: "Retirer" })]) : null;
    removeButton?.addEventListener("click", async () => {
      if (!clientProvider || !ownerId) return;
      credentialPending.add(provider);
      renderInspector();
      const client = await clientProvider().catch(() => null);
      const outcome = client
        ? await removeProviderCredential({ client, ownerId, provider })
        : { ok: false, message: "Le service Supabase n'est pas disponible." };
      credentialPending.delete(provider);
      if (outcome.ok) credentialStatus.delete(provider);
      notify({ id: `credential-${provider}`, title: outcome.ok ? "Cle personnelle retiree" : "Suppression impossible", message: outcome.message, type: outcome.ok ? "success" : "error" });
      renderInspector();
    }, { signal: controller.signal });
    return element("section", { className: "v8-connection-credential" }, [
      element("header", {}, [
        element("div", {}, [
          element("h3", { text: "Votre propre cle" }),
          element("p", { text: configured ? "Cle personnelle active : ETHONE l'utilise a votre place de la cle partagee." : "Optionnel : utilisez votre propre quota au lieu de la cle partagee d'ETHONE." })
        ]),
        configured ? badge("Cle personnelle active", "accent") : badge("Cle partagee utilisee", "default")
      ]),
      ...inputs,
      element("div", { className: "v8-connection-credential__actions" }, [saveButton, removeButton].filter(Boolean))
    ]);
  }

  function setupPanel(integration, connection, method) {
    const steps = setupGuide(integration, method?.id);
    const availability = methodAvailability(method, connectionList());
    const configuredMethod = connection?.setupComplete && connection.methodId === method?.id;
    const report = diagnostics.get(integration.id);
    const referenceValue = draftReferences.has(integration.id) ? draftReferences.get(integration.id) : connection?.reference || method?.endpoint || "";
    let referenceField = null;
    if (method?.field) {
      const input = element("input", {
        className: "v8-input",
        attributes: { type: method.field.type === "url" ? "url" : "text", value: referenceValue, placeholder: method.field.placeholder, autocomplete: "off", spellcheck: "false", required: method.field.required || null, "aria-label": method.field.label },
        dataset: { connectionReference: integration.id }
      });
      input.addEventListener("input", () => { input.setCustomValidity(""); draftReferences.set(integration.id, input.value); }, { signal: controller.signal });
      referenceField = formField({
        label: method.field.label,
        control: element("div", { className: "v8-connection-reference__control" }, [input, referenceValue ? connectionAction("v8.connections.copy", integration.id, "secondary", [icon("copy")], { className: "v8-icon-button", ariaLabel: "Copier la valeur", value: referenceValue, tooltip: "Copier" }) : null]),
        input,
        required: method.field.required,
        help: method.availability === "local" ? "Boucle locale uniquement" : "Ne collez jamais une adresse privee ou signee",
        className: "v8-connection-reference"
      });
    }
    return element("div", { className: "v8-connection-inspector-panel", attributes: { role: "tabpanel" } }, [
      element("div", { className: "v8-connection-panel-intro" }, [element("h3", { text: `Configurer ${method?.label || integration.name}` }), element("p", { text: availability.usable ? "Suivez les etapes dans l'ordre. ETHONE ne validera que ce qu'il peut reellement verifier." : availability.reason })]),
      referenceField,
      element("ol", { className: "v8-connection-steps" }, steps.map((step, index) => {
        const done = configuredMethod && step.status !== "blocked";
        return element("li", { className: `${done ? "is-done" : ""}${step.status === "blocked" ? " is-blocked" : ""}` }, [
          element("span", { className: "v8-connection-step-index" }, [icon(done ? "check" : step.status === "blocked" ? "lock-keyhole" : "circle"), element("small", { text: String(index + 1) })]),
          element("div", { className: "v8-connection-step-copy" }, [element("strong", { text: step.title }), element("p", { text: step.description }), step.copyValue ? element("code", { text: step.copyValue }) : null]),
          element("div", { className: "v8-connection-step-actions" }, [
            step.resource ? officialLink(step.resource, true) : null,
            step.copyValue ? connectionAction("v8.connections.copy", integration.id, "secondary", [icon("copy"), element("span", { text: "Copier" })], { value: step.copyValue }) : null
          ])
        ]);
      })),
      credentialSection(integration, method),
      element("div", { className: "v8-connection-setup__notice" }, [icon("shield-check"), element("div", {}, [
        element("strong", { text: report?.workerVerified ? "Securise par ETHONE Worker" : "Frontend sans donnee sensible" }),
        element("p", { text: report?.workerVerified ? "Le Worker authentifie a confirme cette route. Aucun secret fournisseur n'est transmis au navigateur." : "Les permissions sont expliquees ici. Les echanges privilegies restent obligatoirement cote serveur." })
      ])]),
      element("footer", { className: "v8-connection-inspector-actions" }, [
        connectionAction("v8.connections.setup.complete", integration.id, "primary", [icon(configuredMethod ? "rotate-cw" : "shield-check"), element("span", { text: configuredMethod ? "Revalider" : "Verifier" })], { method: method?.id, disabled: !availability.usable }),
        connectionAction("v8.connections.test", integration.id, "secondary", [icon("stethoscope"), element("span", { text: "Diagnostic" })])
      ])
    ]);
  }

  function diagnosticsPanel(integration, connection, method) {
    const report = diagnostics.get(integration.id);
    const loading = pendingDiagnostics.has(integration.id);
    return element("div", { className: "v8-connection-inspector-panel", attributes: { role: "tabpanel" } }, [
      element("div", { className: "v8-connection-panel-intro v8-connection-panel-intro--action" }, [
        element("div", {}, [element("h3", { text: "Diagnostic transparent" }), element("p", { text: "Le test combine les controles locaux avec une route Worker authentifiee lorsqu'elle existe." })]),
        connectionAction("v8.connections.test", integration.id, "primary", [icon(loading ? "loader-circle" : "scan-search"), element("span", { text: loading ? "Verification" : report ? "Relancer" : "Lancer" })], { disabled: loading })
      ]),
      report ? element("div", { className: "v8-connection-diagnostic-summary" }, [
        element("span", { className: `v8-connection-diagnostic-summary__icon is-${report.status}` }, [icon(report.failed ? "shield-alert" : report.warnings ? "shield" : "shield-check")]),
        element("div", {}, [
          element("strong", { text: report.failed ? "Configuration bloquee" : report.warnings ? "Preparation incomplete" : report.status === "healthy" ? "Connexion saine" : "Preparation correcte" }),
          element("small", { text: `${report.failed} blocage, ${report.warnings} avertissement` }),
          report.workerVerified ? badge("Securise par ETHONE Worker", "accent") : null
        ]),
        connectionAction("v8.connections.diagnostic.copy", integration.id, "secondary", [icon("copy")], { className: "v8-icon-button", ariaLabel: "Copier le rapport", tooltip: "Copier le rapport" })
      ]) : statusState(loading ? "loading" : "empty", {
        iconName: loading ? "loader-circle" : "stethoscope",
        eyebrow: "Diagnostic transparent",
        title: loading ? "Diagnostic en cours" : "Aucun diagnostic execute",
        description: loading ? "Verification de la route Worker sans appel fournisseur inutile." : "Le test ne lance aucun flux OAuth et ne revele aucune donnee sensible.",
        compact: true,
        className: "v8-connection-diagnostic-state"
      }),
      report ? element("ul", { className: "v8-connection-diagnostic-list" }, report.checks.map((check) => {
        const meta = DIAGNOSTIC_META[check.status] || DIAGNOSTIC_META.idle;
        return element("li", { className: `is-${meta.tone}` }, [element("span", {}, [icon(meta.icon)]), element("div", {}, [element("strong", { text: check.label }), element("p", { text: check.detail })]), element("small", { text: meta.label })]);
      })) : null,
      element("section", { className: "v8-connection-help" }, [
        element("h3", { text: "Problemes frequents" }),
        element("details", {}, [element("summary", { text: "Pourquoi la connexion reste preparee ?" }), element("p", { text: "Une route Worker disponible confirme le backend, pas une autorisation fournisseur ni une session distante." })]),
        element("details", {}, [element("summary", { text: "Que faire apres une expiration ?" }), element("p", { text: "Relancez le consentement depuis votre backend puis verifiez les permissions minimales." })]),
        element("details", {}, [element("summary", { text: "Ou sont stockees les donnees sensibles ?" }), element("p", { text: "Dans les secrets Cloudflare uniquement. Le navigateur ne recoit ni cle fournisseur, ni secret Supabase serveur." })])
      ]),
      officialResources(integration).length ? element("div", { className: "v8-connection-resources v8-connection-resources--compact" }, officialResources(integration).map((resource) => officialLink(resource))) : null
    ]);
  }

  function renderInspector() {
    const integration = integrationById(selectedId) || INTEGRATIONS[0];
    if (!integration) return;
    selectedId = integration.id;
    const connection = connectionMap().get(integration.id);
    const method = selectedMethod(integration, connection);
    const tabContent = inspectorTab === "methods"
      ? methodsPanel(integration, connection, method)
      : inspectorTab === "setup"
        ? setupPanel(integration, connection, method)
        : inspectorTab === "diagnostics"
          ? diagnosticsPanel(integration, connection, method)
          : overviewPanel(integration, connection, method);
    inspectorHost.replaceChildren(
      element("header", { className: "v8-connection-inspector__header" }, [
        element("span", { className: `v8-connection-card__icon v8-connection-card__icon--${integration.category}` }, [integrationIcon(integration)]),
        element("div", {}, [element("small", { text: integrationCategory(integration.category).label }), element("h2", { text: integration.name, attributes: { translate: "no", tabindex: "-1" } })]),
        stateBadge(integration, connection)
      ]),
      element("div", { className: "v8-connection-tabs", attributes: { role: "tablist", "aria-label": `Details ${integration.name}` } }, INSPECTOR_TABS.map(tabButton)),
      tabContent
    );
  }

  function renderAll() {
    renderMetrics();
    renderOpportunities();
    renderCatalog();
    renderInspector();
    refreshIcons();
  }

  function selectAndRender(id, tab = "overview", scroll = false) {
    if (!integrationById(id)) return false;
    selectedId = id;
    inspectorTab = tab;
    renderCatalog();
    renderInspector();
    refreshIcons();
    if (scroll && globalThis.matchMedia?.("(max-width: 980px)")?.matches) inspectorHost.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function localDiagnostic(id) {
    const integration = integrationById(id);
    if (!integration) return null;
    const connection = connectionMap().get(id);
    const method = selectedMethod(integration, connection);
    return Object.freeze({
      integration,
      method,
      report: runConnectionDiagnostics(integration, connection, method, { online: globalThis.navigator?.onLine !== false }),
      service: workerServiceForConnection(id, method?.id)
    });
  }

  async function runDiagnostic(id) {
    const local = localDiagnostic(id);
    if (!local) return null;
    let response = null;
    let error = null;
    if (local.service && externalServices?.diagnostic) {
      try {
        response = await externalServices.diagnostic(local.service);
      } catch (failure) {
        error = failure;
      }
    }
    const report = mergeWorkerDiagnostic(local.report, { service: local.service, response, error });
    diagnostics.set(id, report);
    return report;
  }

  releases.push(actions.scope("v8.connections.configure", (context) => {
    const id = context.element?.dataset.integration;
    selectAndRender(id, "setup", true);
    return completed("Assistant ouvert", { integration: id });
  }));
  releases.push(actions.scope("v8.connections.method.open", (context) => {
    const id = context.element?.dataset.integration;
    selectAndRender(id, "methods", true);
    return completed("Methodes ouvertes", { integration: id });
  }));
  releases.push(actions.scope("v8.connections.tab", (context) => {
    const id = context.element?.dataset.integration || selectedId;
    const tab = INSPECTOR_TABS.some((entry) => entry.id === context.element?.dataset.tab) ? context.element.dataset.tab : "overview";
    selectAndRender(id, tab);
    return completed("Vue mise a jour", { integration: id, tab });
  }));
  releases.push(actions.scope("v8.connections.method.select", (context) => {
    const id = context.element?.dataset.integration;
    const methodId = context.element?.dataset.method;
    const integration = integrationById(id);
    if (!connectionMethods(integration).some((entry) => entry.id === methodId)) return unavailable("Cette methode n'est pas disponible.");
    selectedMethods.set(id, methodId);
    const method = connectionMethod(integration, methodId);
    const connection = connectionMap().get(id);
    if (!draftReferences.has(id)) draftReferences.set(id, connection?.reference || method?.endpoint || "");
    renderCatalog();
    renderInspector();
    refreshIcons();
    return completed("Methode selectionnee", { integration: id, method: methodId });
  }));
  releases.push(actions.scope("v8.connections.setup.complete", (context) => {
    const id = context.element?.dataset.integration || selectedId;
    const integration = integrationById(id);
    const connection = connectionMap().get(id);
    const method = selectedMethod(integration, connection);
    const availability = methodAvailability(method, connectionList());
    if (!availability.usable) {
      notify({ id: `connection-blocked-${id}`, title: integration?.name || "Connection", message: availability.reason, type: "warning" });
      return unavailable(availability.reason);
    }
    const reference = validateReference(method, draftReferences.get(id) ?? connection?.reference ?? method?.endpoint ?? "");
    if (!reference.ok) {
      const referenceInput = inspectorHost.querySelector("[data-connection-reference]");
      referenceInput?.setCustomValidity?.(reference.message);
      setFieldState(referenceInput, "invalid", reference.message);
      notify({ id: `connection-reference-${id}`, title: "Configuration incomplete", message: reference.message, type: "warning" });
      referenceInput?.focus();
      return unavailable(reference.message);
    }
    const backendRequired = method?.availability === "backend";
    const result = repository.connections.configure(id, {
      methodId: method?.id,
      reference: reference.value,
      apiVersion: method?.apiVersion || "En attente",
      detail: backendRequired ? "Preparation locale terminee. Backend securise requis." : "Source preparee. Connecteur runtime requis."
    });
    refreshLiveBridges(id);
    if (result.ok) {
      selectedMethods.set(id, method?.id || "");
      journal?.record?.({ source: id, category: integration?.category || "system", icon: integration?.icon || "plug", title: `${integration?.name || "Integration"} preparee`, description: backendRequired ? "Le backend securise reste requis avant toute synchronisation." : `Methode ${method?.label || "locale"} preparee.`, timestamp: new Date().toISOString(), tone: "success" });
      notify({ id: `connection-ready-${id}`, title: integration?.name || "Connection", message: backendRequired ? "Preparation validee. Backend securise requis pour connecter le compte." : "Preparation locale validee.", type: "success" });
      inspectorTab = "overview";
      renderAll();
    }
    return result;
  }));
  releases.push(actions.scope("v8.connections.test", async (context) => {
    const id = context.element?.dataset.integration || selectedId;
    const integration = integrationById(id);
    if (!integration) return unavailable("Cette integration n'existe pas.");
    if (pendingDiagnostics.has(id)) return unavailable("Un diagnostic est deja en cours.");
    pendingDiagnostics.add(id);
    selectAndRender(id, "diagnostics", true);
    let report;
    try {
      report = await runDiagnostic(id);
    } finally {
      pendingDiagnostics.delete(id);
    }
    if (controller.signal.aborted) return unavailable("Le diagnostic a ete interrompu.");
    if (report?.workerAvailable) {
      const nowIso = new Date().toISOString();
      repository.connections.updateStatus(id, "connected", {
        responseMs: report.workerLatencyMs,
        apiVersion: connectionMethod(integration, connectionMap().get(id)?.methodId)?.apiVersion,
        lastSyncAt: nowIso,
        lastTestedAt: nowIso,
        detail: "Connexion confirmee par le diagnostic ETHONE."
      });
      refreshLiveBridges(id);
      renderMetrics();
      renderOpportunities();
    }
    selectAndRender(id, "diagnostics", false);
    notify({ id: `connection-test-${id}`, title: `Diagnostic ${integration.name}`, message: report?.failed ? "Un blocage a ete detecte." : report?.workerAvailable ? "Connexion confirmee et activee." : report?.warnings ? "La configuration demande votre attention." : "Les controles disponibles sont valides.", type: report?.failed ? "error" : report?.warnings ? "warning" : "success" });
    return completed("Diagnostic termine", report);
  }));
  releases.push(actions.scope("v8.connections.diagnose-all", async () => {
    if (globalDiagnosticPending) return unavailable("Le diagnostic global est deja en cours.");
    globalDiagnosticPending = true;
    try {
      const map = connectionMap();
      const configured = INTEGRATIONS.filter((integration) => map.has(integration.id));
      const targets = configured.length ? configured : [integrationById(selectedId)].filter(Boolean);
      let response = null;
      let error = null;
      try {
        if (externalServices?.diagnostic) response = await externalServices.diagnostic();
      } catch (failure) {
        error = failure;
      }
      const entries = targets.map((integration) => {
        const local = localDiagnostic(integration.id);
        if (!local) return null;
        const report = mergeWorkerDiagnostic(local.report, { service: local.service, response, error: local.service ? error : null });
        diagnostics.set(integration.id, report);
        return { integration, report };
      }).filter(Boolean);
      const reports = entries.map((entry) => entry.report);
      if (controller.signal.aborted) return unavailable("Le diagnostic a ete interrompu.");
      const nowIso = new Date().toISOString();
      entries.forEach(({ integration, report }) => {
        if (!report.workerAvailable) return;
        repository.connections.updateStatus(integration.id, "connected", {
          responseMs: report.workerLatencyMs,
          apiVersion: connectionMethod(integration, map.get(integration.id)?.methodId)?.apiVersion,
          lastSyncAt: nowIso,
          lastTestedAt: nowIso,
          detail: "Connexion confirmee par le diagnostic ETHONE."
        });
        refreshLiveBridges(integration.id);
      });
      globalDiagnostic = Object.freeze({
        tested: reports.length,
        failed: reports.reduce((sum, report) => sum + report.failed, 0),
        warnings: reports.reduce((sum, report) => sum + report.warnings, 0),
        workerVerified: reports.filter((report) => report.workerVerified).length,
        ranAt: new Date().toISOString()
      });
      renderMetrics();
      renderCatalog();
      renderOpportunities();
      renderInspector();
      refreshIcons();
      notify({ id: "connections-diagnostic-all", title: "Connections Hub", message: `${globalDiagnostic.tested} connexion${globalDiagnostic.tested > 1 ? "s" : ""} verifiee${globalDiagnostic.tested > 1 ? "s" : ""}, ${globalDiagnostic.workerVerified} via Worker.`, type: globalDiagnostic.failed ? "error" : globalDiagnostic.warnings ? "warning" : "success" });
      return completed("Diagnostic global termine", globalDiagnostic);
    } finally {
      globalDiagnosticPending = false;
    }
  }));
  releases.push(actions.scope("v8.connections.disconnect", (context) => {
    const id = context.element?.dataset.integration;
    const integration = integrationById(id);
    const result = repository.connections.disconnect(id);
    refreshLiveBridges(id);
    if (result.ok) {
      selectedMethods.delete(id);
      draftReferences.delete(id);
      diagnostics.delete(id);
      journal?.record?.({ source: id, category: integration?.category || "system", icon: "unplug", title: `${integration?.name || "Integration"} retiree`, description: "L'association a ete supprimee. L'acces fournisseur peut etre revoque separement.", timestamp: new Date().toISOString(), tone: "warning" });
      notify({ id: `connection-off-${id}`, title: integration?.name || "Connection", message: "Association supprimee. Verifiez aussi les acces chez le fournisseur.", type: "info" });
      renderAll();
    }
    return result;
  }));
  releases.push(actions.scope("v8.connections.opportunity.apply", (context) => {
    const id = context.element?.dataset.integration;
    const methodId = context.element?.dataset.method;
    selectedMethods.set(id, methodId);
    selectAndRender(id, "setup", true);
    return completed("Methode detectee selectionnee", { integration: id, method: methodId });
  }));
  releases.push(actions.scope("v8.connections.copy", async (context) => {
    const copied = await copyText(context.element?.dataset.value);
    notify({ id: `connection-copy-${context.element?.dataset.integration || "value"}`, title: copied ? "Copie" : "Copie impossible", message: copied ? "La valeur publique a ete copiee." : "Le presse-papiers n'est pas accessible.", type: copied ? "success" : "warning" });
    return copied ? completed("Valeur copiee") : unavailable("Le presse-papiers n'est pas accessible.");
  }));
  releases.push(actions.scope("v8.connections.diagnostic.copy", async (context) => {
    const id = context.element?.dataset.integration || selectedId;
    const integration = integrationById(id);
    const report = diagnostics.get(id);
    if (!report) return unavailable("Lancez d'abord le diagnostic.");
    const payload = JSON.stringify({ product: "ETHONE", integration: integration?.name || id, method: selectedMethods.get(id) || connectionMap().get(id)?.methodId || "recommended", report }, null, 2);
    const copied = await copyText(payload);
    notify({ id: `connection-report-${id}`, title: copied ? "Rapport copie" : "Copie impossible", message: copied ? "Le rapport ne contient aucune donnee sensible." : "Le presse-papiers n'est pas accessible.", type: copied ? "success" : "warning" });
    return copied ? completed("Rapport copie") : unavailable("Le presse-papiers n'est pas accessible.");
  }));

  const renderSearchResults = debounce(() => {
    renderCatalog();
    refreshIcons();
  }, 120);
  search.addEventListener("input", () => {
    query = search.value;
    visibleLimit = CONNECTION_PAGE_SIZE;
    renderSearchResults();
  }, { signal: controller.signal });
  statusFilter.addEventListener("change", () => {
    status = statusFilter.value || "all";
    visibleLimit = CONNECTION_PAGE_SIZE;
    renderCatalog();
    refreshIcons();
  }, { signal: controller.signal });
  sortSelect.addEventListener("change", () => {
    order = sortSelect.value;
    visibleLimit = CONNECTION_PAGE_SIZE;
    renderCatalog();
    refreshIcons();
  }, { signal: controller.signal });
  categoryBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-connection-category]");
    if (!button) return;
    category = button.dataset.connectionCategory || "all";
    visibleLimit = CONNECTION_PAGE_SIZE;
    renderCatalog();
    refreshIcons();
  }, { signal: controller.signal });

  stage.replaceChildren(page);
  renderAll();
  loadCredentialStatus();
  const releaseDensity = options.subscribeState?.((next) => updateCollectionDensityControl(densityControl, next)) || (() => {});
  return () => {
    controller.abort();
    releases.reverse().forEach((release) => release());
    releaseDensity();
    diagnostics.clear();
    pendingDiagnostics.clear();
    selectedMethods.clear();
    draftReferences.clear();
    credentialDrafts.clear();
    credentialStatus.clear();
    credentialPending.clear();
    page.remove();
  };
}
