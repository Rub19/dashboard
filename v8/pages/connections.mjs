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
import { actionButton, element, icon } from "../ui/dom.mjs";
import { collectionDensityControl, updateCollectionDensityControl } from "../ui/dense-content.mjs";
import { emptyState, statusState } from "../ui/empty-state.mjs";
import { formField, setFieldState } from "../ui/form-system.mjs";
import { refreshIcons } from "../ui/icons.mjs";
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
      element("span", { className: `v8-connection-card__icon v8-connection-card__icon--${integration.category}`, dataset: { presenceIcon: integration.id === "email" ? "mail" : null } }, [icon(integration.icon)]),
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
  const externalServices = options.externalServices || null;
  const controller = new AbortController();
  const releases = [];
  const selectedMethods = new Map();
  const draftReferences = new Map();
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
  const statusFilter = element("select", { className: "v8-input v8-connections-status-filter", attributes: { "aria-label": "Filtrer par statut" } }, [
    element("option", { text: "Tous les statuts", attributes: { value: "all" } }),
    element("option", { text: "Connectes", attributes: { value: "connected" } }),
    element("option", { text: "Prepares", attributes: { value: "prepared" } }),
    element("option", { text: "Disponibles", attributes: { value: "available" } }),
    element("option", { text: "A verifier", attributes: { value: "attention" } }),
    element("option", { text: "Acces limite", attributes: { value: "limited" } })
  ]);
  const sortSelect = element("select", { className: "v8-input v8-connections-sort", attributes: { "aria-label": "Trier les intÃ©grations" } }, [
    element("option", { text: "RecommandÃ©es", attributes: { value: "recommended" } }),
    element("option", { text: "Nom", attributes: { value: "name" } }),
    element("option", { text: "CatÃ©gorie", attributes: { value: "category" } })
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
      ])çÝ4¶‰žËkºwµçAìÑ•áÐè€‰A½ÕÉÅÕ½¤±„½¹¹•á¥½¸É•ÍÑ”ÁÉ•Á…É•”€üˆô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè€‰U¹”É½ÕÑ”]½É­•È‘¥ÍÁ½¹¥‰±”½¹™¥Éµ”±”‰…­•¹°Á…ÌÕ¹”…ÕÑ½É¥Í…Ñ¥½¸™½ÕÉ¹¥ÍÍ•ÕÈ¹¤Õ¹”Í•ÍÍ¥½¸‘¥ÍÑ…¹Ñ”¸ˆô¥t¤°(€€€€€€€•±•µ•¹Ð ‰‘•Ñ…¥±Ìˆ°íô°m•±•µ•¹Ð ‰ÍÕµµ…Éäˆ°ìÑ•áÐè€‰EÕ”™…¥É”…ÁÉ•ÌÕ¹”•áÁ¥É…Ñ¥½¸€üˆô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè€‰I•±…¹•è±”½¹Í•¹Ñ•µ•¹Ð‘•ÁÕ¥ÌÙ½ÑÉ”‰…­•¹ÁÕ¥ÌÙ•É¥™¥•è±•ÌÁ•Éµ¥ÍÍ¥½¹Ìµ¥¹¥µ…±•Ì¸ˆô¥t¤°(€€€€€€€•±•µ•¹Ð ‰‘•Ñ…¥±Ìˆ°íô°m•±•µ•¹Ð ‰ÍÕµµ…Éäˆ°ìÑ•áÐè€‰=ÔÍ½¹ÐÍÑ½­••Ì±•Ì‘½¹¹••ÌÍ•¹Í¥‰±•Ì€üˆô¤°•±•µ•¹Ð ‰Àˆ°ìÑ•áÐè€‰…¹Ì±•ÌÍ•É•ÑÌ±½Õ‘™±…É”Õ¹¥ÅÕ•µ•¹Ð¸1”¹…Ù¥…Ñ•ÕÈ¹”É•½¥Ð¹¤±”™½ÕÉ¹¥ÍÍ•ÕÈ°¹¤Í•É•ÐMÕÁ…‰…Í”Í•ÉÙ•ÕÈ¸ˆô¥t¤(€€€€€t¤°(€€€€€½™™¥¥…±I•Í½ÕÉ•Ì¡¥¹Ñ•É…Ñ¥½¸¤¹±•¹Ñ €ü•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰Øàµ½¹¹•Ñ¥½¸µÉ•Í½ÕÉ•ÌØàµ½¹¹•Ñ¥½¸µÉ•Í½ÕÉ•Ì´µ½µÁ…Ðˆô°½™™¥¥…±I•Í½ÕÉ•Ì¡¥¹Ñ•É…Ñ¥½¸¤¹µ…À ¡É•Í½ÕÉ”¤€ôø½™™¥¥…±1¥¹¬¡É•Í½ÕÉ”¤¤¤€è¹Õ±°(€€€t¤ì(€ô((€™Õ¹Ñ¥½¸É•¹‘•É%¹ÍÁ•Ñ½È ¤ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡Í•±•Ñ•‘%¤ñð%9QIQ%=9MlÁtì(€€€¥˜€ …¥¹Ñ•É…Ñ¥½¸¤É•ÑÕÉ¸ì(€€€Í•±•Ñ•‘%€ô¥¹Ñ•É…Ñ¥½¸¹¥ì(€€€½¹ÍÐ½¹¹•Ñ¥½¸€ô½¹¹•Ñ¥½¹5…À ¤¹•Ð¡¥¹Ñ•É…Ñ¥½¸¹¥¤ì(€€€½¹ÍÐµ•Ñ¡½€ôÍ•±•Ñ•‘5•Ñ¡½¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸¤ì(€€€½¹ÍÐÑ…‰½¹Ñ•¹Ð€ô¥¹ÍÁ•Ñ½ÉQ…ˆ€ôôô€‰µ•Ñ¡½‘Ìˆ(€€€€€€üµ•Ñ¡½‘ÍA…¹•°¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸°µ•Ñ¡½¤(€€€€€€è¥¹ÍÁ•Ñ½ÉQ…ˆ€ôôô€‰Í•ÑÕÀˆ(€€€€€€€€üÍ•ÑÕÁA…¹•°¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸°µ•Ñ¡½¤(€€€€€€€€è¥¹ÍÁ•Ñ½ÉQ…ˆ€ôôô€‰‘¥…¹½ÍÑ¥Ìˆ(€€€€€€€€€€ü‘¥…¹½ÍÑ¥ÍA…¹•°¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸°µ•Ñ¡½¤(€€€€€€€€€€è½Ù•ÉÙ¥•ÝA…¹•°¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸°µ•Ñ¡½¤ì(€€€¥¹ÍÁ•Ñ½É!½ÍÐ¹É•Á±…•¡¥±‘É•¸ (€€€€€•±•µ•¹Ð ‰¡•…‘•Èˆ°ì±…ÍÍ9…µ”è€‰Øàµ½¹¹•Ñ¥½¸µ¥¹ÍÁ•Ñ½É}}¡•…‘•Èˆô°l(€€€€€€€•±•µ•¹Ð ‰ÍÁ…¸ˆ°ì±…ÍÍ9…µ”èØàµ½¹¹•Ñ¥½¸µ…É‘}}¥½¸Øàµ½¹¹•Ñ¥½¸µ…É‘}}¥½¸´´‘í¥¹Ñ•É…Ñ¥½¸¹…Ñ•½Éåõ€ô°m¥½¸¡¥¹Ñ•É…Ñ¥½¸¹¥½¸¥t¤°(€€€€€€€•±•µ•¹Ð ‰‘¥Øˆ°íô°m•±•µ•¹Ð ‰Íµ…±°ˆ°ìÑ•áÐè¥¹Ñ•É…Ñ¥½¹…Ñ•½Éä¡¥¹Ñ•É…Ñ¥½¸¹…Ñ•½Éä¤¹±…‰•°ô¤°•±•µ•¹Ð ‰ Èˆ°ìÑ•áÐè¥¹Ñ•É…Ñ¥½¸¹¹…µ”°…ÑÑÉ¥‰ÕÑ•ÌèìÑÉ…¹Í±…Ñ”è€‰¹¼ˆ°Ñ…‰¥¹‘•àè€ˆ´Äˆôô¥t¤°(€€€€€€€ÍÑ…Ñ•	…‘”¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸¤(€€€€€t¤°(€€€€€•±•µ•¹Ð ‰‘¥Øˆ°ì±…ÍÍ9…µ”è€‰Øàµ½¹¹•Ñ¥½¸µÑ…‰Ìˆ°…ÑÑÉ¥‰ÕÑ•ÌèìÉ½±”è€‰Ñ…‰±¥ÍÐˆ°€‰…É¥„µ±…‰•°ˆè•Ñ…¥±Ì€‘í¥¹Ñ•É…Ñ¥½¸¹¹…µ•õ€ôô°%9MAQ=I}Q	L¹µ…À¡Ñ…‰	ÕÑÑ½¸¤¤°(€€€€€Ñ…‰½¹Ñ•¹Ð(€€€€¤ì(€ô((€™Õ¹Ñ¥½¸É•¹‘•É±° ¤ì(€€€É•¹‘•É5•ÑÉ¥Ì ¤ì(€€€É•¹‘•É=ÁÁ½ÉÑÕ¹¥Ñ¥•Ì ¤ì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•¹‘•É%¹ÍÁ•Ñ½È ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô((€™Õ¹Ñ¥½¸Í•±•Ñ¹‘I•¹‘•È¡¥°Ñ…ˆ€ô€‰½Ù•ÉÙ¥•Üˆ°ÍÉ½±°€ô™…±Í”¤ì(€€€¥˜€ …¥¹Ñ•É…Ñ¥½¹	å%¡¥¤¤É•ÑÕÉ¸™…±Í”ì(€€€Í•±•Ñ•‘%€ô¥ì(€€€¥¹ÍÁ•Ñ½ÉQ…ˆ€ôÑ…ˆì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•¹‘•É%¹ÍÁ•Ñ½È ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€€€¥˜€¡ÍÉ½±°€˜˜±½‰…±Q¡¥Ì¹µ…Ñ¡5•‘¥„ü¸ ˆ¡µ…àµÝ¥‘Ñ è€äàÁÁà¤ˆ¤ü¹µ…Ñ¡•Ì¤¥¹ÍÁ•Ñ½É!½ÍÐ¹ÍÉ½±±%¹Ñ½Y¥•Ü¡ì‰•¡…Ù¥½Èè€‰Íµ½½Ñ ˆ°‰±½¬è€‰ÍÑ…ÉÐˆô¤ì(€€€É•ÑÕÉ¸ÑÉÕ”ì(€ô((€™Õ¹Ñ¥½¸±½…±¥…¹½ÍÑ¥Œ¡¥¤ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡¥¤ì(€€€¥˜€ …¥¹Ñ•É…Ñ¥½¸¤É•ÑÕÉ¸¹Õ±°ì(€€€½¹ÍÐ½¹¹•Ñ¥½¸€ô½¹¹•Ñ¥½¹5…À ¤¹•Ð¡¥¤ì(€€€½¹ÍÐµ•Ñ¡½€ôÍ•±•Ñ•‘5•Ñ¡½¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸¤ì(€€€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì(€€€€€¥¹Ñ•É…Ñ¥½¸°(€€€€€µ•Ñ¡½°(€€€€€É•Á½ÉÐèÉÕ¹½¹¹•Ñ¥½¹¥…¹½ÍÑ¥Ì¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸°µ•Ñ¡½°ì½¹±¥¹”è±½‰…±Q¡¥Ì¹¹…Ù¥…Ñ½Èü¹½¹1¥¹”€„ôô™…±Í”ô¤°(€€€€€Í•ÉÙ¥”èÝ½É­•ÉM•ÉÙ¥•½É½¹¹•Ñ¥½¸¡¥°µ•Ñ¡½ü¹¥¤(€€€ô¤ì(€ô((€…Íå¹Œ™Õ¹Ñ¥½¸ÉÕ¹¥…¹½ÍÑ¥Œ¡¥¤ì(€€€½¹ÍÐ±½…°€ô±½…±¥…¹½ÍÑ¥Œ¡¥¤ì(€€€¥˜€ …±½…°¤É•ÑÕÉ¸¹Õ±°ì(€€€±•ÐÉ•ÍÁ½¹Í”€ô¹Õ±°ì(€€€±•Ð•ÉÉ½È€ô¹Õ±°ì(€€€¥˜€¡±½…°¹Í•ÉÙ¥”€˜˜•áÑ•É¹…±M•ÉÙ¥•Ìü¹‘¥…¹½ÍÑ¥Œ¤ì(€€€€€ÑÉäì(€€€€€€€É•ÍÁ½¹Í”€ô…Ý…¥Ð•áÑ•É¹…±M•ÉÙ¥•Ì¹‘¥…¹½ÍÑ¥Œ¡±½…°¹Í•ÉÙ¥”¤ì(€€€€€ô…Ñ €¡™…¥±ÕÉ”¤ì(€€€€€€€•ÉÉ½È€ô™…¥±ÕÉ”ì(€€€€€ô(€€€ô(€€€½¹ÍÐÉ•Á½ÉÐ€ôµ•É•]½É­•É¥…¹½ÍÑ¥Œ¡±½…°¹É•Á½ÉÐ°ìÍ•ÉÙ¥”è±½…°¹Í•ÉÙ¥”°É•ÍÁ½¹Í”°•ÉÉ½Èô¤ì(€€€‘¥…¹½ÍÑ¥Ì¹Í•Ð¡¥°É•Á½ÉÐ¤ì(€€€É•ÑÕÉ¸É•Á½ÉÐì(€ô((€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹½¹™¥ÕÉ”ˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ì(€€€Í•±•Ñ¹‘I•¹‘•È¡¥°€‰Í•ÑÕÀˆ°ÑÉÕ”¤ì(€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰ÍÍ¥ÍÑ…¹Ð½ÕÙ•ÉÐˆ°ì¥¹Ñ•É…Ñ¥½¸è¥ô¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹µ•Ñ¡½¹½Á•¸ˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ì(€€€Í•±•Ñ¹‘I•¹‘•È¡¥°€‰µ•Ñ¡½‘Ìˆ°ÑÉÕ”¤ì(€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰5•Ñ¡½‘•Ì½ÕÙ•ÉÑ•Ìˆ°ì¥¹Ñ•É…Ñ¥½¸è¥ô¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹Ñ…ˆˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ñðÍ•±•Ñ•‘%ì(€€€½¹ÍÐÑ…ˆ€ô%9MAQ=I}Q	L¹Í½µ” ¡•¹ÑÉä¤€ôø•¹ÑÉä¹¥€ôôô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹Ñ…ˆ¤€ü½¹Ñ•áÐ¹•±•µ•¹Ð¹‘…Ñ…Í•Ð¹Ñ…ˆ€è€‰½Ù•ÉÙ¥•Üˆì(€€€Í•±•Ñ¹‘I•¹‘•È¡¥°Ñ…ˆ¤ì(€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰YÕ”µ¥Í”„©½ÕÈˆ°ì¥¹Ñ•É…Ñ¥½¸è¥°Ñ…ˆô¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹µ•Ñ¡½¹Í•±•Ðˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ì(€€€½¹ÍÐµ•Ñ¡½‘%€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹µ•Ñ¡½ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡¥¤ì(€€€¥˜€ …½¹¹•Ñ¥½¹5•Ñ¡½‘Ì¡¥¹Ñ•É…Ñ¥½¸¤¹Í½µ” ¡•¹ÑÉä¤€ôø•¹ÑÉä¹¥€ôôôµ•Ñ¡½‘%¤¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰•ÑÑ”µ•Ñ¡½‘”¸•ÍÐÁ…Ì‘¥ÍÁ½¹¥‰±”¸ˆ¤ì(€€€Í•±•Ñ•‘5•Ñ¡½‘Ì¹Í•Ð¡¥°µ•Ñ¡½‘%¤ì(€€€½¹ÍÐµ•Ñ¡½€ô½¹¹•Ñ¥½¹5•Ñ¡½¡¥¹Ñ•É…Ñ¥½¸°µ•Ñ¡½‘%¤ì(€€€½¹ÍÐ½¹¹•Ñ¥½¸€ô½¹¹•Ñ¥½¹5…À ¤¹•Ð¡¥¤ì(€€€¥˜€ …‘É…™ÑI•™•É•¹•Ì¹¡…Ì¡¥¤¤‘É…™ÑI•™•É•¹•Ì¹Í•Ð¡¥°½¹¹•Ñ¥½¸ü¹É•™•É•¹”ñðµ•Ñ¡½ü¹•¹‘Á½¥¹Ðñð€ˆˆ¤ì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•¹‘•É%¹ÍÁ•Ñ½È ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰5•Ñ¡½‘”Í•±•Ñ¥½¹¹•”ˆ°ì¥¹Ñ•É…Ñ¥½¸è¥°µ•Ñ¡½èµ•Ñ¡½‘%ô¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹Í•ÑÕÀ¹½µÁ±•Ñ”ˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ñðÍ•±•Ñ•‘%ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡¥¤ì(€€€½¹ÍÐ½¹¹•Ñ¥½¸€ô½¹¹•Ñ¥½¹5…À ¤¹•Ð¡¥¤ì(€€€½¹ÍÐµ•Ñ¡½€ôÍ•±•Ñ•‘5•Ñ¡½¡¥¹Ñ•É…Ñ¥½¸°½¹¹•Ñ¥½¸¤ì(€€€½¹ÍÐ…Ù…¥±…‰¥±¥Ñä€ôµ•Ñ¡½‘Ù…¥±…‰¥±¥Ñä¡µ•Ñ¡½°½¹¹•Ñ¥½¹1¥ÍÐ ¤¤ì(€€€¥˜€ ……Ù…¥±…‰¥±¥Ñä¹ÕÍ…‰±”¤ì(€€€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µ‰±½­•´‘í¥‘õ€°Ñ¥Ñ±”è¥¹Ñ•É…Ñ¥½¸ü¹¹…µ”ñð€‰½¹¹•Ñ¥½¸ˆ°µ•ÍÍ…”è…Ù…¥±…‰¥±¥Ñä¹É•…Í½¸°ÑåÁ”è€‰Ý…É¹¥¹œˆô¤ì(€€€€€É•ÑÕÉ¸Õ¹…Ù…¥±…‰±”¡…Ù…¥±…‰¥±¥Ñä¹É•…Í½¸¤ì(€€€ô(€€€½¹ÍÐÉ•™•É•¹”€ôÙ…±¥‘…Ñ•I•™•É•¹”¡µ•Ñ¡½°‘É…™ÑI•™•É•¹•Ì¹•Ð¡¥¤€üü½¹¹•Ñ¥½¸ü¹É•™•É•¹”€üüµ•Ñ¡½ü¹•¹‘Á½¥¹Ð€üü€ˆˆ¤ì(€€€¥˜€ …É•™•É•¹”¹½¬¤ì(€€€€€½¹ÍÐÉ•™•É•¹•%¹ÁÕÐ€ô¥¹ÍÁ•Ñ½É!½ÍÐ¹ÅÕ•ÉåM•±•Ñ½È ‰m‘…Ñ„µ½¹¹•Ñ¥½¸µÉ•™•É•¹•tˆ¤ì(€€€€€É•™•É•¹•%¹ÁÕÐü¹Í•ÑÕÍÑ½µY…±¥‘¥Ñäü¸¡É•™•É•¹”¹µ•ÍÍ…”¤ì(€€€€€Í•Ñ¥•±‘MÑ…Ñ”¡É•™•É•¹•%¹ÁÕÐ°€‰¥¹Ù…±¥ˆ°É•™•É•¹”¹µ•ÍÍ…”¤ì(€€€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µÉ•™•É•¹”´‘í¥‘õ€°Ñ¥Ñ±”è€‰½¹™¥ÕÉ…Ñ¥½¸¥¹½µÁ±•Ñ”ˆ°µ•ÍÍ…”èÉ•™•É•¹”¹µ•ÍÍ…”°ÑåÁ”è€‰Ý…É¹¥¹œˆô¤ì(€€€€€É•™•É•¹•%¹ÁÕÐü¹™½ÕÌ ¤ì(€€€€€É•ÑÕÉ¸Õ¹…Ù…¥±…‰±”¡É•™•É•¹”¹µ•ÍÍ…”¤ì(€€€ô(€€€½¹ÍÐ‰…­•¹‘I•ÅÕ¥É•€ôµ•Ñ¡½ü¹…Ù…¥±…‰¥±¥Ñä€ôôô€‰‰…­•¹ˆì(€€€½¹ÍÐÉ•ÍÕ±Ð€ôÉ•Á½Í¥Ñ½Éä¹½¹¹•Ñ¥½¹Ì¹½¹™¥ÕÉ”¡¥°ì(€€€€€µ•Ñ¡½‘%èµ•Ñ¡½ü¹¥°(€€€€€É•™•É•¹”èÉ•™•É•¹”¹Ù…±Õ”°(€€€€€…Á¥Y•ÉÍ¥½¸èµ•Ñ¡½ü¹…Á¥Y•ÉÍ¥½¸ñð€‰¸…ÑÑ•¹Ñ”ˆ°(€€€€€‘•Ñ…¥°è‰…­•¹‘I•ÅÕ¥É•€ü€‰AÉ•Á…É…Ñ¥½¸±½…±”Ñ•Éµ¥¹•”¸	…­•¹Í•ÕÉ¥Í”É•ÅÕ¥Ì¸ˆ€è€‰M½ÕÉ”ÁÉ•Á…É•”¸½¹¹•Ñ•ÕÈÉÕ¹Ñ¥µ”É•ÅÕ¥Ì¸ˆ(€€€ô¤ì(€€€¥˜€¡¥€ôôô€‰ÍÁ½Ñ¥™äˆ¤ÍÁ½Ñ¥™å1¥Ù”ü¹É•™É•Í ü¸ ¤ì(€€€¥˜€¡É•ÍÕ±Ð¹½¬¤ì(€€€€€Í•±•Ñ•‘5•Ñ¡½‘Ì¹Í•Ð¡¥°µ•Ñ¡½ü¹¥ñð€ˆˆ¤ì(€€€€€©½ÕÉ¹…°ü¹É•½Éü¸¡ìÍ½ÕÉ”è¥°…Ñ•½Éäè¥¹Ñ•É…Ñ¥½¸ü¹…Ñ•½Éäñð€‰ÍåÍÑ•´ˆ°¥½¸è¥¹Ñ•É…Ñ¥½¸ü¹¥½¸ñð€‰Á±Õœˆ°Ñ¥Ñ±”è€‘í¥¹Ñ•É…Ñ¥½¸ü¹¹…µ”ñð€‰%¹Ñ•É…Ñ¥½¸‰ôÁÉ•Á…É••€°‘•ÍÉ¥ÁÑ¥½¸è‰…­•¹‘I•ÅÕ¥É•€ü€‰1”‰…­•¹Í•ÕÉ¥Í”É•ÍÑ”É•ÅÕ¥Ì…Ù…¹ÐÑ½ÕÑ”Íå¹¡É½¹¥Í…Ñ¥½¸¸ˆ€è5•Ñ¡½‘”€‘íµ•Ñ¡½ü¹±…‰•°ñð€‰±½…±”‰ôÁÉ•Á…É•”¹€°Ñ¥µ•ÍÑ…µÀè¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤°Ñ½¹”è€‰ÍÕ•ÍÌˆô¤ì(€€€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µÉ•…‘ä´‘í¥‘õ€°Ñ¥Ñ±”è¥¹Ñ•É…Ñ¥½¸ü¹¹…µ”ñð€‰½¹¹•Ñ¥½¸ˆ°µ•ÍÍ…”è‰…­•¹‘I•ÅÕ¥É•€ü€‰AÉ•Á…É…Ñ¥½¸Ù…±¥‘•”¸	…­•¹Í•ÕÉ¥Í”É•ÅÕ¥ÌÁ½ÕÈ½¹¹•Ñ•È±”½µÁÑ”¸ˆ€è€‰AÉ•Á…É…Ñ¥½¸±½…±”Ù…±¥‘•”¸ˆ°ÑåÁ”è€‰ÍÕ•ÍÌˆô¤ì(€€€€€¥¹ÍÁ•Ñ½ÉQ…ˆ€ô€‰½Ù•ÉÙ¥•Üˆì(€€€€€É•¹‘•É±° ¤ì(€€€ô(€€€É•ÑÕÉ¸É•ÍÕ±Ðì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹Ñ•ÍÐˆ°…Íå¹Œ€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ñðÍ•±•Ñ•‘%ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡¥¤ì(€€€¥˜€ …¥¹Ñ•É…Ñ¥½¸¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰•ÑÑ”¥¹Ñ•É…Ñ¥½¸¸•á¥ÍÑ”Á…Ì¸ˆ¤ì(€€€¥˜€¡Á•¹‘¥¹¥…¹½ÍÑ¥Ì¹¡…Ì¡¥¤¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰U¸‘¥…¹½ÍÑ¥Œ•ÍÐ‘•©„•¸½ÕÉÌ¸ˆ¤ì(€€€Á•¹‘¥¹¥…¹½ÍÑ¥Ì¹…‘¡¥¤ì(€€€Í•±•Ñ¹‘I•¹‘•È¡¥°€‰‘¥…¹½ÍÑ¥Ìˆ°ÑÉÕ”¤ì(€€€±•ÐÉ•Á½ÉÐì(€€€ÑÉäì(€€€€€É•Á½ÉÐ€ô…Ý…¥ÐÉÕ¹¥…¹½ÍÑ¥Œ¡¥¤ì(€€€ô™¥¹…±±äì(€€€€€Á•¹‘¥¹¥…¹½ÍÑ¥Ì¹‘•±•Ñ”¡¥¤ì(€€€ô(€€€¥˜€¡½¹ÑÉ½±±•È¹Í¥¹…°¹…‰½ÉÑ•¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰1”‘¥…¹½ÍÑ¥Œ„•Ñ”¥¹Ñ•ÉÉ½µÁÔ¸ˆ¤ì(€€€Í•±•Ñ¹‘I•¹‘•È¡¥°€‰‘¥…¹½ÍÑ¥Ìˆ°™…±Í”¤ì(€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µÑ•ÍÐ´‘í¥‘õ€°Ñ¥Ñ±”è¥…¹½ÍÑ¥Œ€‘í¥¹Ñ•É…Ñ¥½¸¹¹…µ•õ€°µ•ÍÍ…”èÉ•Á½ÉÐü¹™…¥±•€ü€‰U¸‰±½…”„•Ñ”‘•Ñ•Ñ”¸ˆ€èÉ•Á½ÉÐü¹Ý…É¹¥¹Ì€ü€‰1„½¹™¥ÕÉ…Ñ¥½¸‘•µ…¹‘”Ù½ÑÉ”…ÑÑ•¹Ñ¥½¸¸ˆ€è€‰1•Ì½¹ÑÉ½±•Ì‘¥ÍÁ½¹¥‰±•ÌÍ½¹ÐÙ…±¥‘•Ì¸ˆ°ÑåÁ”èÉ•Á½ÉÐü¹™…¥±•€ü€‰•ÉÉ½Èˆ€èÉ•Á½ÉÐü¹Ý…É¹¥¹Ì€ü€‰Ý…É¹¥¹œˆ€è€‰ÍÕ•ÍÌˆô¤ì(€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰¥…¹½ÍÑ¥ŒÑ•Éµ¥¹”ˆ°É•Á½ÉÐ¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹‘¥…¹½Í”µ…±°ˆ°…Íå¹Œ€ ¤€ôøì(€€€¥˜€¡±½‰…±¥…¹½ÍÑ¥A•¹‘¥¹œ¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰1”‘¥…¹½ÍÑ¥Œ±½‰…°•ÍÐ‘•©„•¸½ÕÉÌ¸ˆ¤ì(€€€±½‰…±¥…¹½ÍÑ¥A•¹‘¥¹œ€ôÑÉÕ”ì(€€€ÑÉäì(€€€€€½¹ÍÐµ…À€ô½¹¹•Ñ¥½¹5…À ¤ì(€€€€€½¹ÍÐ½¹™¥ÕÉ•€ô%9QIQ%=9L¹™¥±Ñ•È ¡¥¹Ñ•É…Ñ¥½¸¤€ôøµ…À¹¡…Ì¡¥¹Ñ•É…Ñ¥½¸¹¥¤¤ì(€€€€€½¹ÍÐÑ…É•ÑÌ€ô½¹™¥ÕÉ•¹±•¹Ñ €ü½¹™¥ÕÉ•€èm¥¹Ñ•É…Ñ¥½¹	å%¡Í•±•Ñ•‘%¥t¹™¥±Ñ•È¡	½½±•…¸¤ì(€€€€€±•ÐÉ•ÍÁ½¹Í”€ô¹Õ±°ì(€€€€€±•Ð•ÉÉ½È€ô¹Õ±°ì(€€€€€ÑÉäì(€€€€€€€¥˜€¡•áÑ•É¹…±M•ÉÙ¥•Ìü¹‘¥…¹½ÍÑ¥Œ¤É•ÍÁ½¹Í”€ô…Ý…¥Ð•áÑ•É¹…±M•ÉÙ¥•Ì¹‘¥…¹½ÍÑ¥Œ ¤ì(€€€€€ô…Ñ €¡™…¥±ÕÉ”¤ì(€€€€€€€•ÉÉ½È€ô™…¥±ÕÉ”ì(€€€€€ô(€€€€€½¹ÍÐÉ•Á½ÉÑÌ€ôÑ…É•ÑÌ¹µ…À ¡¥¹Ñ•É…Ñ¥½¸¤€ôøì(€€€€€€€½¹ÍÐ±½…°€ô±½…±¥…¹½ÍÑ¥Œ¡¥¹Ñ•É…Ñ¥½¸¹¥¤ì(€€€€€€€¥˜€ …±½…°¤É•ÑÕÉ¸¹Õ±°ì(€€€€€€€½¹ÍÐÉ•Á½ÉÐ€ôµ•É•]½É­•É¥…¹½ÍÑ¥Œ¡±½…°¹É•Á½ÉÐ°ìÍ•ÉÙ¥”è±½…°¹Í•ÉÙ¥”°É•ÍÁ½¹Í”°•ÉÉ½Èè±½…°¹Í•ÉÙ¥”€ü•ÉÉ½È€è¹Õ±°ô¤ì(€€€€€€€‘¥…¹½ÍÑ¥Ì¹Í•Ð¡¥¹Ñ•É…Ñ¥½¸¹¥°É•Á½ÉÐ¤ì(€€€€€€€É•ÑÕÉ¸É•Á½ÉÐì(€€€€€ô¤¹™¥±Ñ•È¡	½½±•…¸¤ì(€€€€€¥˜€¡½¹ÑÉ½±±•È¹Í¥¹…°¹…‰½ÉÑ•¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰1”‘¥…¹½ÍÑ¥Œ„•Ñ”¥¹Ñ•ÉÉ½µÁÔ¸ˆ¤ì(€€€€€±½‰…±¥…¹½ÍÑ¥Œ€ô=‰©•Ð¹™É••é”¡ì(€€€€€€€Ñ•ÍÑ•èÉ•Á½ÉÑÌ¹±•¹Ñ °(€€€€€€€™…¥±•èÉ•Á½ÉÑÌ¹É•‘Õ” ¡ÍÕ´°É•Á½ÉÐ¤€ôøÍÕ´€¬É•Á½ÉÐ¹™…¥±•°€À¤°(€€€€€€€Ý…É¹¥¹ÌèÉ•Á½ÉÑÌ¹É•‘Õ” ¡ÍÕ´°É•Á½ÉÐ¤€ôøÍÕ´€¬É•Á½ÉÐ¹Ý…É¹¥¹Ì°€À¤°(€€€€€€€Ý½É­•ÉY•É¥™¥•èÉ•Á½ÉÑÌ¹™¥±Ñ•È ¡É•Á½ÉÐ¤€ôøÉ•Á½ÉÐ¹Ý½É­•ÉY•É¥™¥•¤¹±•¹Ñ °(€€€€€€€É…¹Ðè¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤(€€€€€ô¤ì(€€€€€É•¹‘•É5•ÑÉ¥Ì ¤ì(€€€€€É•¹‘•É%¹ÍÁ•Ñ½È ¤ì(€€€€€É•™É•Í¡%½¹Ì ¤ì(€€€€€¹½Ñ¥™ä¡ì¥è€‰½¹¹•Ñ¥½¹Ìµ‘¥…¹½ÍÑ¥Œµ…±°ˆ°Ñ¥Ñ±”è€‰½¹¹•Ñ¥½¹Ì!Õˆˆ°µ•ÍÍ…”è€‘í±½‰…±¥…¹½ÍÑ¥Œ¹Ñ•ÍÑ•‘ô½¹¹•á¥½¸‘í±½‰…±¥…¹½ÍÑ¥Œ¹Ñ•ÍÑ•€ø€Ä€ü€‰Ìˆ€è€ˆ‰ôÙ•É¥™¥•”‘í±½‰…±¥…¹½ÍÑ¥Œ¹Ñ•ÍÑ•€ø€Ä€ü€‰Ìˆ€è€ˆ‰ô°€‘í±½‰…±¥…¹½ÍÑ¥Œ¹Ý½É­•ÉY•É¥™¥•‘ôÙ¥„]½É­•È¹€°ÑåÁ”è±½‰…±¥…¹½ÍÑ¥Œ¹™…¥±•€ü€‰•ÉÉ½Èˆ€è±½‰…±¥…¹½ÍÑ¥Œ¹Ý…É¹¥¹Ì€ü€‰Ý…É¹¥¹œˆ€è€‰ÍÕ•ÍÌˆô¤ì(€€€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰¥…¹½ÍÑ¥Œ±½‰…°Ñ•Éµ¥¹”ˆ°±½‰…±¥…¹½ÍÑ¥Œ¤ì(€€€ô™¥¹…±±äì(€€€€€±½‰…±¥…¹½ÍÑ¥A•¹‘¥¹œ€ô™…±Í”ì(€€€ô(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹‘¥Í½¹¹•Ðˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡¥¤ì(€€€½¹ÍÐÉ•ÍÕ±Ð€ôÉ•Á½Í¥Ñ½Éä¹½¹¹•Ñ¥½¹Ì¹‘¥Í½¹¹•Ð¡¥¤ì(€€€¥˜€¡¥€ôôô€‰ÍÁ½Ñ¥™äˆ¤ÍÁ½Ñ¥™å1¥Ù”ü¹É•™É•Í ü¸ ¤ì(€€€¥˜€¡É•ÍÕ±Ð¹½¬¤ì(€€€€€Í•±•Ñ•‘5•Ñ¡½‘Ì¹‘•±•Ñ”¡¥¤ì(€€€€€‘É…™ÑI•™•É•¹•Ì¹‘•±•Ñ”¡¥¤ì(€€€€€‘¥…¹½ÍÑ¥Ì¹‘•±•Ñ”¡¥¤ì(€€€€€©½ÕÉ¹…°ü¹É•½Éü¸¡ìÍ½ÕÉ”è¥°…Ñ•½Éäè¥¹Ñ•É…Ñ¥½¸ü¹…Ñ•½Éäñð€‰ÍåÍÑ•´ˆ°¥½¸è€‰Õ¹Á±Õœˆ°Ñ¥Ñ±”è€‘í¥¹Ñ•É…Ñ¥½¸ü¹¹…µ”ñð€‰%¹Ñ•É…Ñ¥½¸‰ôÉ•Ñ¥É••€°‘•ÍÉ¥ÁÑ¥½¸è€‰0…ÍÍ½¥…Ñ¥½¸„•Ñ”ÍÕÁÁÉ¥µ•”¸0…•Ì™½ÕÉ¹¥ÍÍ•ÕÈÁ•ÕÐ•ÑÉ”É•Ù½ÅÕ”Í•Á…É•µ•¹Ð¸ˆ°Ñ¥µ•ÍÑ…µÀè¹•Ü…Ñ” ¤¹Ñ½%M=MÑÉ¥¹œ ¤°Ñ½¹”è€‰Ý…É¹¥¹œˆô¤ì(€€€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µ½™˜´‘í¥‘õ€°Ñ¥Ñ±”è¥¹Ñ•É…Ñ¥½¸ü¹¹…µ”ñð€‰½¹¹•Ñ¥½¸ˆ°µ•ÍÍ…”è€‰ÍÍ½¥…Ñ¥½¸ÍÕÁÁÉ¥µ•”¸Y•É¥™¥•è…ÕÍÍ¤±•Ì…•Ì¡•è±”™½ÕÉ¹¥ÍÍ•ÕÈ¸ˆ°ÑåÁ”è€‰¥¹™¼ˆô¤ì(€€€€€É•¹‘•É±° ¤ì(€€€ô(€€€É•ÑÕÉ¸É•ÍÕ±Ðì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹½ÁÁ½ÉÑÕ¹¥Ñä¹…ÁÁ±äˆ°€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ì(€€€½¹ÍÐµ•Ñ¡½‘%€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹µ•Ñ¡½ì(€€€Í•±•Ñ•‘5•Ñ¡½‘Ì¹Í•Ð¡¥°µ•Ñ¡½‘%¤ì(€€€Í•±•Ñ¹‘I•¹‘•È¡¥°€‰Í•ÑÕÀˆ°ÑÉÕ”¤ì(€€€É•ÑÕÉ¸½µÁ±•Ñ• ‰5•Ñ¡½‘”‘•Ñ•Ñ•”Í•±•Ñ¥½¹¹•”ˆ°ì¥¹Ñ•É…Ñ¥½¸è¥°µ•Ñ¡½èµ•Ñ¡½‘%ô¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹½Áäˆ°…Íå¹Œ€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ½Á¥•€ô…Ý…¥Ð½ÁåQ•áÐ¡½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹Ù…±Õ”¤ì(€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µ½Áä´‘í½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ñð€‰Ù…±Õ”‰õ€°Ñ¥Ñ±”è½Á¥•€ü€‰½Á¥”ˆ€è€‰½Á¥”¥µÁ½ÍÍ¥‰±”ˆ°µ•ÍÍ…”è½Á¥•€ü€‰1„Ù…±•ÕÈÁÕ‰±¥ÅÕ”„•Ñ”½Á¥•”¸ˆ€è€‰1”ÁÉ•ÍÍ”µÁ…Á¥•ÉÌ¸•ÍÐÁ…Ì…•ÍÍ¥‰±”¸ˆ°ÑåÁ”è½Á¥•€ü€‰ÍÕ•ÍÌˆ€è€‰Ý…É¹¥¹œˆô¤ì(€€€É•ÑÕÉ¸½Á¥•€ü½µÁ±•Ñ• ‰Y…±•ÕÈ½Á¥•”ˆ¤€èÕ¹…Ù…¥±…‰±” ‰1”ÁÉ•ÍÍ”µÁ…Á¥•ÉÌ¸•ÍÐÁ…Ì…•ÍÍ¥‰±”¸ˆ¤ì(€ô¤¤ì(€É•±•…Í•Ì¹ÁÕÍ ¡…Ñ¥½¹Ì¹Í½Á” ‰Øà¹½¹¹•Ñ¥½¹Ì¹‘¥…¹½ÍÑ¥Œ¹½Áäˆ°…Íå¹Œ€¡½¹Ñ•áÐ¤€ôøì(€€€½¹ÍÐ¥€ô½¹Ñ•áÐ¹•±•µ•¹Ðü¹‘…Ñ…Í•Ð¹¥¹Ñ•É…Ñ¥½¸ñðÍ•±•Ñ•‘%ì(€€€½¹ÍÐ¥¹Ñ•É…Ñ¥½¸€ô¥¹Ñ•É…Ñ¥½¹	å%¡¥¤ì(€€€½¹ÍÐÉ•Á½ÉÐ€ô‘¥…¹½ÍÑ¥Ì¹•Ð¡¥¤ì(€€€¥˜€ …É•Á½ÉÐ¤É•ÑÕÉ¸Õ¹…Ù…¥±…‰±” ‰1…¹•è…‰½É±”‘¥…¹½ÍÑ¥Œ¸ˆ¤ì(€€€½¹ÍÐÁ…å±½…€ô)M=8¹ÍÑÉ¥¹¥™ä¡ìÁÉ½‘ÕÐè€‰Q!=9ˆ°¥¹Ñ•É…Ñ¥½¸è¥¹Ñ•É…Ñ¥½¸ü¹¹…µ”ñð¥°µ•Ñ¡½èÍ•±•Ñ•‘5•Ñ¡½‘Ì¹•Ð¡¥¤ñð½¹¹•Ñ¥½¹5…À ¤¹•Ð¡¥¤ü¹µ•Ñ¡½‘%ñð€‰É•½µµ•¹‘•ˆ°É•Á½ÉÐô°¹Õ±°°€È¤ì(€€€½¹ÍÐ½Á¥•€ô…Ý…¥Ð½ÁåQ•áÐ¡Á…å±½…¤ì(€€€¹½Ñ¥™ä¡ì¥è½¹¹•Ñ¥½¸µÉ•Á½ÉÐ´‘í¥‘õ€°Ñ¥Ñ±”è½Á¥•€ü€‰I…ÁÁ½ÉÐ½Á¥”ˆ€è€‰½Á¥”¥µÁ½ÍÍ¥‰±”ˆ°µ•ÍÍ…”è½Á¥•€ü€‰1”É…ÁÁ½ÉÐ¹”½¹Ñ¥•¹Ð…ÕÕ¹”‘½¹¹•”Í•¹Í¥‰±”¸ˆ€è€‰1”ÁÉ•ÍÍ”µÁ…Á¥•ÉÌ¸•ÍÐÁ…Ì…•ÍÍ¥‰±”¸ˆ°ÑåÁ”è½Á¥•€ü€‰ÍÕ•ÍÌˆ€è€‰Ý…É¹¥¹œˆô¤ì(€€€É•ÑÕÉ¸½Á¥•€ü½µÁ±•Ñ• ‰I…ÁÁ½ÉÐ½Á¥”ˆ¤€èÕ¹…Ù…¥±…‰±” ‰1”ÁÉ•ÍÍ”µÁ…Á¥•ÉÌ¸•ÍÐÁ…Ì…•ÍÍ¥‰±”¸ˆ¤ì(€ô¤¤ì((€Í•…É ¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¥¹ÁÕÐˆ°€ ¤€ôøì(€€€ÅÕ•Éä€ôÍ•…É ¹Ù…±Õ”ì(€€€Ù¥Í¥‰±•1¥µ¥Ð€ô=99Q%=9}A}M%iì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€ÍÑ…ÑÕÍ¥±Ñ•È¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì(€€€ÍÑ…ÑÕÌ€ôÍÑ…ÑÕÍ¥±Ñ•È¹Ù…±Õ”ñð€‰…±°ˆì(€€€Ù¥Í¥‰±•1¥µ¥Ð€ô=99Q%=9}A}M%iì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€Í½ÉÑM•±•Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°€ ¤€ôøì(€€€½É‘•È€ôÍ½ÉÑM•±•Ð¹Ù…±Õ”ì(€€€Ù¥Í¥‰±•1¥µ¥Ð€ô=99Q%=9}A}M%iì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì(€…Ñ•½Éå	…È¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰±¥¬ˆ°€¡•Ù•¹Ð¤€ôøì(€€€½¹ÍÐ‰ÕÑÑ½¸€ô•Ù•¹Ð¹Ñ…É•Ð¹±½Í•ÍÐ ‰m‘…Ñ„µ½¹¹•Ñ¥½¸µ…Ñ•½Éåtˆ¤ì(€€€¥˜€ …‰ÕÑÑ½¸¤É•ÑÕÉ¸ì(€€€…Ñ•½Éä€ô‰ÕÑÑ½¸¹‘…Ñ…Í•Ð¹½¹¹•Ñ¥½¹…Ñ•½Éäñð€‰…±°ˆì(€€€Ù¥Í¥‰±•1¥µ¥Ð€ô=99Q%=9}A}M%iì(€€€É•¹‘•É…Ñ…±½œ ¤ì(€€€É•™É•Í¡%½¹Ì ¤ì(€ô°ìÍ¥¹…°è½¹ÑÉ½±±•È¹Í¥¹…°ô¤ì((€ÍÑ…”¹É•Á±…•¡¥±‘É•¸¡Á…”¤ì(€É•¹‘•É±° ¤ì(€½¹ÍÐÉ•±•…Í••¹Í¥Ñä€ô½ÁÑ¥½¹Ì¹ÍÕ‰ÍÉ¥‰•MÑ…Ñ”ü¸ ¡¹•áÐ¤€ôøÕÁ‘…Ñ•½±±•Ñ¥½¹•¹Í¥Ñå½¹ÑÉ½°¡‘•¹Í¥Ñå½¹ÑÉ½°°¹•áÐ¤¤ñð€  ¤€ôøíô¤ì(€É•ÑÕÉ¸€ ¤€ôøì(€€€½¹ÑÉ½±±•È¹…‰½ÉÐ ¤ì(€€€É•±•…Í•Ì¹É•Ù•ÉÍ” ¤¹™½É…  ¡É•±•…Í”¤€ôøÉ•±•…Í” ¤¤ì(€€€É•±•…Í••¹Í¥Ñä ¤ì(€€€‘¥…¹½ÍÑ¥Ì¹±•…È ¤ì(€€€Á•¹‘¥¹¥…¹½ÍÑ¥Ì¹±•…È ¤ì(€€€Í•±•Ñ•‘5•Ñ¡½‘Ì¹±•…È ¤ì(€€€‘É…™ÑI•™•É•¹•Ì¹±•…È ¤ì(€€€Á…”¹É•µ½Ù” ¤ì(€ôì)ô(