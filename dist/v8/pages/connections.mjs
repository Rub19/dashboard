import { INTEGRATIONS, INTEGRATION_CATEGORIES, integrationById, integrationCategory, setupGuide } from "../data/integrations.mjs";
import { actionButton, element, icon } from "../ui/dom.mjs";
import { emptyState } from "../ui/empty-state.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { prepareActivityUI } from "./activity-style.mjs";

export { prepareActivityUI as prepare };

const STATUS_META = Object.freeze({
  connected: { label: "Connecte", icon: "circle-check-big", tone: "success" },
  disconnected: { label: "Deconnecte", icon: "circle-off", tone: "muted" },
  error: { label: "Erreur", icon: "triangle-alert", tone: "danger" },
  syncing: { label: "Synchronisation", icon: "refresh-cw", tone: "info" },
  "permission-denied": { label: "Permission refusee", icon: "shield-x", tone: "warning" },
  "token-expired": { label: "Token expire", icon: "clock-alert", tone: "warning" }
});

function completed(message, data = null) {
  return Object.freeze({ ok: true, status: "completed", message, data });
}

function connectionAction(actionId, integrationId, variant, children, ariaLabel = null) {
  const button = actionButton({ actionId, variant, ariaLabel }, children);
  button.dataset.integration = integrationId;
  return button;
}

function statusBadge(connection) {
  const meta = STATUS_META[connection?.status] || STATUS_META.disconnected;
  return element("span", { className: `v8-connection-status v8-connection-status--${meta.tone}` }, [icon(meta.icon), element("span", { text: meta.label })]);
}

function connectionCard(integration, connection) {
  const category = integrationCategory(integration.category);
  const connected = connection?.status === "connected";
  const prepared = connection?.setupComplete === true;
  return element("article", { className: "v8-connection-card v8-surface", dataset: { integrationCard: integration.id } }, [
    element("header", { className: "v8-connection-card__header" }, [
      element("span", { className: `v8-connection-card__icon v8-connection-card__icon--${integration.category}` }, [icon(integration.icon)]),
      element("div", {}, [element("h3", { text: integration.name, attributes: { translate: "no" } }), element("span", { text: category.label })]),
      statusBadge(connection)
    ]),
    element("p", { className: "v8-connection-card__description", text: integration.description }),
    element("dl", { className: "v8-connection-card__meta" }, [
      element("div", {}, [element("dt", { text: "Derniere sync" }), element("dd", { text: connection?.lastSyncAt || "Jamais" })]),
      element("div", {}, [element("dt", { text: "API" }), element("dd", { text: connection?.apiVersion || "Non connectee" })])
    ]),
    prepared && !connected ? element("span", { className: "v8-connection-ready" }, [icon("shield-check"), "Guide termine, OAuth requis"]) : null,
    element("footer", { className: "v8-connection-card__actions" }, [
      connectionAction("v8.connections.configure", integration.id, connected ? "secondary" : "primary", [icon(prepared ? "rotate-cw" : "settings-2"), element("span", { text: connected ? "Configurer" : prepared ? "Reconnecter" : "Configurer" })]),
      connectionAction("v8.connections.test", integration.id, "secondary", [icon("flask-conical"), element("span", { text: "Tester" })]),
      connected ? connectionAction("v8.connections.disconnect", integration.id, "danger", [icon("unplug"), element("span", { text: "Deconnecter" })]) : null
    ])
  ]);
}

export function mountConnections(stage, options = {}) {
  const repository = options.repository;
  const actions = options.actions;
  const journal = options.journal;
  const notify = options.notify || (() => {});
  const controller = new AbortController();
  const releases = [];
  let category = "all";
  let query = "";
  let selectedId = null;

  const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher Spotify, GitHub, Calendar...", "aria-label": "Rechercher une integration", autocomplete: "off" } });
  const categoryBar = element("div", { className: "v8-connection-categories", attributes: { role: "toolbar", "aria-label": "Categories d'integrations" } });
  const grid = element("div", { className: "v8-connections-grid" });
  const resultCount = element("span", { className: "v8-section-count" });
  const setupHost = element("section", { className: "v8-connection-setup v8-surface", attributes: { hidden: true, "aria-live": "polite" } });

  INTEGRATION_CATEGORIES.forEach((entry) => categoryBar.append(element("button", {
    className: `v8-filter-chip${entry.id === category ? " is-active" : ""}`,
    attributes: { type: "button", "aria-pressed": entry.id === category ? "true" : "false" },
    dataset: { connectionCategory: entry.id }
  }, [icon(entry.icon), element("span", { text: entry.label })])));

  const page = element("section", { className: "v8-page v8-connections-page", dataset: { page: "connections" } }, [
    element("header", { className: "v8-page-heading" }, [
      element("div", { className: "v8-page-heading__copy" }, [element("span", { className: "v8-eyebrow", text: "Ecosysteme" }), element("h1", { text: "Connections" }), element("p", { text: "Configurez les sources qui peuvent alimenter Activity Hub et Brain." })]),
      element("div", { className: "v8-page-heading__actions" }, [actionButton({ actionId: "v8.activity.open", variant: "secondary" }, [icon("activity"), element("span", { text: "Activity Hub" })])])
    ]),
    setupHost,
    element("section", { className: "v8-connections-catalog" }, [
      element("header", { className: "v8-connections-toolbar" }, [element("div", { className: "v8-input-wrap v8-connections-search" }, [icon("search"), search]), resultCount]),
      categoryBar,
      grid
    ]),
    element("footer", { className: "v8-connections-security" }, [icon("lock-keyhole"), element("div", {}, [element("strong", { text: "Secrets interdits dans le frontend" }), element("p", { text: "Les guides ne stockent ni token, ni mot de passe, ni cle API. Les connexions distantes exigent un backend OAuth securise." })])])
  ]);

  function connectionMap() {
    return new Map((repository.snapshot().connections || []).map((connection) => [connection.id, connection]));
  }

  function renderCatalog() {
    const normalized = query.toLowerCase().trim();
    const connections = connectionMap();
    const visible = INTEGRATIONS.filter((integration) => (
      (category === "all" || integration.category === category)
      && (!normalized || `${integration.name} ${integration.description} ${integration.category}`.toLowerCase().includes(normalized))
    ));
    grid.replaceChildren(...visible.map((integration) => connectionCard(integration, connections.get(integration.id))));
    if (!visible.length) {
      const reset = element("button", {
        className: "v8-button v8-button--primary",
        text: "Réinitialiser les filtres",
        attributes: { type: "button" },
        events: {
          click: () => {
            query = "";
            category = "all";
            search.value = "";
            renderCatalog();
            search.focus({ preventScroll: true });
          }
        }
      });
      grid.append(emptyState({
        iconName: "search-x",
        eyebrow: "Catalogue connecté",
        title: "Aucune intégration trouvée",
        description: "Essayez un autre service ou revenez à toutes les catégories.",
        actions: [reset],
        className: "v8-empty-state--wide"
      }));
    }
    resultCount.textContent = `${visible.length} integration${visible.length > 1 ? "s" : ""}`;
    categoryBar.querySelectorAll("[data-connection-category]").forEach((button) => {
      const active = button.dataset.connectionCategory === category;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    refreshIcons();
  }

  function renderSetup(id) {
    const integration = integrationById(id);
    if (!integration) return;
    const connection = connectionMap().get(id);
    const steps = setupGuide(integration);
    const completeAction = connectionAction("v8.connections.setup.complete", id, "primary", [icon(connection?.setupComplete ? "check" : "shield-check"), element("span", { text: connection?.setupComplete ? "Preparation validee" : "Valider la preparation" })]);
    completeAction.disabled = connection?.setupComplete === true;
    setupHost.hidden = false;
    setupHost.replaceChildren(
      element("header", { className: "v8-connection-setup__header" }, [
        element("span", { className: `v8-connection-card__icon v8-connection-card__icon--${integration.category}` }, [icon(integration.icon)]),
        element("div", {}, [element("span", { className: "v8-eyebrow", text: "Assistant de configuration" }), element("h2", { text: integration.name, attributes: { translate: "no" } }), element("p", { text: integration.description })]),
        actionButton({ actionId: "v8.connections.setup.close", className: "v8-icon-button", ariaLabel: "Fermer le guide" }, [icon("x")])
      ]),
      element("ol", { className: "v8-connection-steps" }, steps.map((step, index) => element("li", {}, [element("span", { text: String(index + 1) }), element("div", {}, [element("strong", { text: step }), element("p", { text: index === steps.length - 1 ? "ETHONE verifiera uniquement la preparation locale." : "Suivez cette etape avec les permissions minimales." })])]))),
      element("div", { className: "v8-connection-setup__notice" }, [icon("shield-check"), element("div", {}, [element("strong", { text: "Configuration sans secret" }), element("p", { text: "Les identifiants sensibles devront etre echanges par un backend OAuth. Ils ne seront jamais enregistres ici." })])]),
      element("footer", { className: "v8-connection-setup__actions" }, [
        completeAction,
        actionButton({ actionId: "v8.connections.setup.close", variant: "secondary" }, [element("span", { text: "Fermer" })])
      ])
    );
    setupHost.scrollIntoView({ behavior: "smooth", block: "start" });
    refreshIcons();
  }

  function closeSetup() {
    selectedId = null;
    setupHost.hidden = true;
    setupHost.replaceChildren();
    return completed("Guide ferme");
  }

  releases.push(actions.scope("v8.connections.configure", (context) => {
    selectedId = context.element?.dataset.integration || null;
    renderSetup(selectedId);
    return completed("Guide ouvert", { integration: selectedId });
  }));
  releases.push(actions.scope("v8.connections.setup.close", closeSetup));
  releases.push(actions.scope("v8.connections.setup.complete", (context) => {
    const id = context.element?.dataset.integration || selectedId;
    const integration = integrationById(id);
    const result = repository.connections.configure(id);
    if (result.ok) {
      journal.record({ source: id, category: integration?.category || "system", icon: integration?.icon || "plug", title: `${integration?.name || "Integration"} preparee`, description: "Le guide local est termine. OAuth reste requis pour les donnees distantes.", timestamp: new Date().toISOString(), tone: "success" });
      notify({ id: `connection-ready-${id}`, title: integration?.name || "Connection", message: "Preparation locale validee. Aucun secret stocke.", type: "success" });
      renderCatalog();
      renderSetup(id);
    }
    return result;
  }));
  releases.push(actions.scope("v8.connections.test", (context) => {
    const id = context.element?.dataset.integration;
    const integration = integrationById(id);
    const result = repository.connections.test(id);
    notify({ id: `connection-test-${id}`, title: integration?.name || "Connection", message: result.message, type: result.ok ? "success" : "info" });
    renderCatalog();
    return result;
  }));
  releases.push(actions.scope("v8.connections.disconnect", (context) => {
    const id = context.element?.dataset.integration;
    const integration = integrationById(id);
    const result = repository.connections.disconnect(id);
    if (result.ok) {
      journal.record({ source: id, category: integration?.category || "system", icon: "unplug", title: `${integration?.name || "Integration"} deconnectee`, description: "La connexion locale a ete desactivee.", timestamp: new Date().toISOString(), tone: "warning" });
      notify({ id: `connection-off-${id}`, title: integration?.name || "Connection", message: "Connexion locale desactivee.", type: "info" });
      renderCatalog();
    }
    return result;
  }));

  search.addEventListener("input", () => {
    query = search.value;
    renderCatalog();
  }, { signal: controller.signal });
  categoryBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-connection-category]");
    if (!button) return;
    category = button.dataset.connectionCategory || "all";
    renderCatalog();
  }, { signal: controller.signal });

  stage.replaceChildren(page);
  renderCatalog();
  refreshIcons();
  return () => {
    controller.abort();
    releases.reverse().forEach((release) => release());
    page.remove();
  };
}
