import { NAVIGATION_ITEMS, navigationItem } from "../data/navigation.mjs";
import { refreshIcons } from "./icons.mjs";
import { navigationMarkup } from "./navigation.mjs";

const ROUTE_META = Object.freeze({
  home: { title: "Accueil", icon: "house", status: "online", statusLabel: "Prêt" },
  notes: { title: "Notes", icon: "notebook-pen", status: "saving", statusLabel: "Sauvegarde locale" },
  tasks: { title: "Tâches", icon: "circle-check-big", status: "sync", statusLabel: "Sync" },
  calendar: { title: "Calendrier", icon: "calendar-days", status: "online", statusLabel: "Agenda prêt" },
  files: { title: "Fichiers", icon: "folder", status: "sync", statusLabel: "Index local" },
  activity: { title: "Activity Hub", icon: "activity", status: "online", statusLabel: "Stable" },
  connections: { title: "Connections", icon: "plug", status: "sync", statusLabel: "Connecteurs" },
  spaces: { title: "Spaces", icon: "layout-grid", status: "online", statusLabel: "Actif" },
  flows: { title: "Flows", icon: "workflow", status: "online", statusLabel: "Prêt" },
  widgets: { title: "Widgets", icon: "panels-top-left", status: "online", statusLabel: "Widgets prêts" },
  brain: { title: "Brain", icon: "brain", status: "brain", statusLabel: "Brain prêt" },
  settings: { title: "Réglages", icon: "settings-2", status: "online", statusLabel: "Local" }
});

const PANEL_META = Object.freeze({
  widgets: { title: "Widgets", icon: "panels-top-left", actionId: "v8.widgets.open" },
  notifications: { title: "Notifications", icon: "bell", actionId: "v8.notifications.open" },
  profile: { title: "Profil", icon: "user-round", actionId: "v8.profile.open" }
});

const SPACE_META = Object.freeze({
  personal: { label: "Personnel", flow: "Essentiel", icon: "user-round" },
  focus: { label: "Focus", flow: "Deep Work", icon: "focus" },
  studio: { label: "Studio", flow: "Creation", icon: "sparkles" }
});

const SYNC_META = Object.freeze({
  online: { label: "Synchronise", tone: "online" },
  syncing: { label: "Synchronisation", tone: "syncing" },
  local: { label: "Local", tone: "local" },
  error: { label: "Hors ligne", tone: "error" }
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function routeMeta(route) {
  const item = navigationItem(route);
  return ROUTE_META[route] || { title: item.label, icon: item.icon, status: "online", statusLabel: "Pret" };
}

function routeTabsMarkup(activeRoute) {
  return NAVIGATION_ITEMS.map((item) => {
    const active = item.id === activeRoute;
    return `<button type="button" class="v8-route-tab${active ? " is-active" : ""}" data-action="${escapeHtml(item.actionId)}" data-route="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.label)}"${active ? ' aria-current="page"' : ""}><i data-lucide="${escapeHtml(item.icon)}" aria-hidden="true"></i><span>${escapeHtml(item.label)}</span></button>`;
  }).join("");
}

export function createBreadcrumbModel(input = {}) {
  const route = input.route || "home";
  const space = input.space || "personal";
  const panel = input.panel || null;
  const meta = routeMeta(route);
  const item = navigationItem(route);
  const routeAction = route === "widgets" ? "v8.widgets.open" : item.id === route ? item.actionId : "v8.home.open";
  const spaceMeta = SPACE_META[space] || SPACE_META.personal;
  const panelMeta = PANEL_META[panel] || null;
  const crumbs = [
    { id: "root", label: "ETHONE", icon: "house", actionId: "v8.home.open" },
    { id: "workspace", label: "Workspace", icon: "briefcase-business", actionId: "v8.spaces.open" },
    { id: "space", label: spaceMeta.label, icon: spaceMeta.icon, actionId: "v8.mission.open" },
    { id: "route", label: meta.title, icon: meta.icon || item.icon, actionId: routeAction, route }
  ];
  if (panelMeta) crumbs.push({ id: "panel", label: panelMeta.title, icon: panelMeta.icon, actionId: panelMeta.actionId });
  const sync = SYNC_META[input.syncStatus] || SYNC_META.online;
  return Object.freeze({
    crumbs: Object.freeze(crumbs.map((crumb, index) => Object.freeze({ ...crumb, current: index === crumbs.length - 1 }))),
    context: Object.freeze({
      workspace: String(input.workspace || "Personnel").slice(0, 80),
      space: spaceMeta.label,
      flow: String(input.flow || spaceMeta.flow).slice(0, 80),
      sync: sync.label,
      syncTone: sync.tone
    })
  });
}

export function createStatusModel(input = {}) {
  const meta = routeMeta(input.route || "home");
  const sync = SYNC_META[input.syncStatus] || SYNC_META.online;
  const offline = sync.tone === "error";
  return Object.freeze({
    network: Object.freeze({ label: offline ? "Hors ligne" : "En ligne", icon: offline ? "wifi-off" : "wifi", tone: offline ? "error" : "online" }),
    sync: Object.freeze({ label: sync.label, icon: sync.tone === "syncing" ? "refresh-cw" : offline ? "cloud-off" : "cloud", tone: sync.tone }),
    brain: Object.freeze({ label: "Brain actif", icon: "brain", tone: "brain" }),
    route: Object.freeze({ label: meta.statusLabel, icon: meta.icon, tone: meta.status })
  });
}

function statusMarkup(model) {
  return `<button type="button" class="v8-status-item" data-action="v8.sync.refresh" data-tone="${escapeHtml(model.sync.tone)}" aria-label="${escapeHtml(model.sync.label)}"><i data-lucide="${escapeHtml(model.sync.icon)}" aria-hidden="true"></i><span>${escapeHtml(model.sync.label)}</span></button><span class="v8-status-item" data-tone="${escapeHtml(model.network.tone)}"><i data-lucide="${escapeHtml(model.network.icon)}" aria-hidden="true"></i><span>${escapeHtml(model.network.label)}</span></span><button type="button" class="v8-status-item" data-action="v8.brain.open" data-tone="brain" aria-label="Ouvrir Brain"><i data-lucide="brain" aria-hidden="true"></i><span>${escapeHtml(model.brain.label)}</span></button><span class="v8-status-item v8-status-item--route" data-tone="${escapeHtml(model.route.tone)}"><i data-lucide="${escapeHtml(model.route.icon)}" aria-hidden="true"></i><span>${escapeHtml(model.route.label)}</span></span>`;
}

function breadcrumbsMarkup(model) {
  const trail = model.crumbs.map((crumb, index) => {
    const separator = index ? '<span class="v8-breadcrumb-separator" aria-hidden="true">&#8250;</span>' : "";
    return `<li class="v8-breadcrumb-step v8-breadcrumb-step--${escapeHtml(crumb.id)}${crumb.current ? " is-current" : ""}"${crumb.current ? ' aria-current="page"' : ""}>${separator}<button type="button" class="v8-breadcrumb-button" data-action="${escapeHtml(crumb.actionId)}"${crumb.route ? ` data-route="${escapeHtml(crumb.route)}"` : ""} aria-label="Ouvrir ${escapeHtml(crumb.label)}"><i data-lucide="${escapeHtml(crumb.icon)}" aria-hidden="true"></i><span>${escapeHtml(crumb.label)}</span></button></li>`;
  }).join("");
  const context = `<span class="v8-breadcrumb-context__item v8-breadcrumb-context__item--workspace"><small>Workspace</small><strong translate="no">${escapeHtml(model.context.workspace)}</strong></span><span class="v8-breadcrumb-context__item v8-breadcrumb-context__item--space"><small>Space</small><strong>${escapeHtml(model.context.space)}</strong></span><span class="v8-breadcrumb-context__item v8-breadcrumb-context__item--flow"><small>Mode</small><strong translate="no">${escapeHtml(model.context.flow)}</strong></span><span class="v8-breadcrumb-context__item v8-breadcrumb-context__item--sync" data-status="${escapeHtml(model.context.syncTone)}"><i aria-hidden="true"></i><span>${escapeHtml(model.context.sync)}</span></span>`;
  return Object.freeze({ trail, context });
}

export function mountShell(root, options = {}) {
  root.removeAttribute("aria-live");
  root.innerHTML = `
    <div class="v8-shell" data-route="home" data-space="personal">
      <div class="v8-nav-slot" id="v8-nav-slot"></div>
      <header class="v8-context-strip v8-topbar" aria-label="ETHONE OS">
        <div class="v8-topbar__main">
          <div class="v8-topbar__identity">
            <button type="button" class="v8-topbar__workspace" data-action="v8.mission.open" aria-label="Ouvrir Mission Control" data-tooltip="Mission Control">
              <span class="v8-topbar__workspace-mark" aria-hidden="true">E</span>
              <span class="v8-topbar__workspace-copy">
                <span translate="no">ETHONE</span>
                <strong id="v8-workspace-name" translate="no">Personnel</strong>
              </span>
            </button>
            <nav class="v8-breadcrumbs" aria-label="Fil d'Ariane"><ol id="v8-breadcrumb-list"></ol><div class="v8-breadcrumb-context" id="v8-breadcrumb-context" aria-label="Contexte actif"></div></nav>
          </div>
          <button type="button" class="v8-command-launcher" data-action="v8.command.open" aria-label="Ouvrir le Command Center">
            <i data-lucide="search" aria-hidden="true"></i>
            <span>Rechercher, ouvrir une app ou lancer une action</span>
            <kbd translate="no">Ctrl K</kbd>
          </button>
          <div class="v8-context-strip__tools v8-topbar__tools" aria-label="Action Bar globale">
            <button type="button" class="v8-action-status v8-brain-status" data-action="v8.brain.open" data-tooltip="Brain Status" aria-label="Ouvrir Brain"><i data-lucide="brain" aria-hidden="true"></i><span><small>Brain</small><strong>Contextuel</strong></span><b aria-hidden="true"></b></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-sync-action" data-action="v8.sync.refresh" data-tooltip="Cloud Sync" aria-label="Synchroniser"><i data-lucide="cloud" aria-hidden="true"></i><span class="v8-action-dot" aria-hidden="true"></span></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-language-action" data-action="v8.locale.cycle" data-tooltip="Changer de langue" aria-label="Changer de langue"><i data-lucide="languages" aria-hidden="true"></i></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-theme-action" data-action="v8.theme.toggle" data-tooltip="Changer de theme" aria-label="Changer de theme"><i data-lucide="moon-star" aria-hidden="true"></i></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-quick-action" data-action="v8.command.open" data-tooltip="Actions rapides" aria-label="Actions rapides"><i data-lucide="zap" aria-hidden="true"></i></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-notification-button" data-action="v8.notifications.open" aria-label="Ouvrir les notifications" data-tooltip="Notifications"><i data-lucide="bell" aria-hidden="true"></i><span class="v8-notification-badge" aria-hidden="true">2</span></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-settings-action" data-action="v8.settings.open" data-route="settings" aria-label="Ouvrir les reglages" data-tooltip="Reglages"><i data-lucide="settings-2" aria-hidden="true"></i></button>
            <button type="button" class="v8-profile-button" data-action="v8.profile.open" aria-label="Ouvrir le profil" data-tooltip="Profil"><span id="v8-profile-initial" translate="no">R</span><i data-lucide="chevron-down" aria-hidden="true"></i></button>
          </div>
        </div>
        <nav class="v8-route-tabs" id="v8-route-tabs" aria-label="Applications ETHONE"></nav>
      </header>
      <div class="v8-stage-wrap">
        <span class="v8-signal-ribbon" aria-hidden="true"></span>
        <main id="v8-stage" class="v8-stage" tabindex="-1" aria-live="polite"></main>
      </div>
      <footer id="v8-status-bar" class="v8-status-bar" aria-label="Barre d'etat ETHONE"></footer>
      <div id="v8-panel-host"></div>
      <div id="v8-command-host"></div>
      <div id="v8-mission-host"></div>
      <div id="v8-context-menu-host"></div>
      <div id="v8-toast-region" class="v8-toast-region" aria-label="Notifications" aria-live="polite"></div>
    </div>`;

  const shell = root.querySelector(".v8-shell");
  const navHost = root.querySelector("#v8-nav-slot");
  const stage = root.querySelector("#v8-stage");
  const breadcrumbs = root.querySelector("#v8-breadcrumb-list");
  const breadcrumbContext = root.querySelector("#v8-breadcrumb-context");
  const routeTabs = root.querySelector("#v8-route-tabs");
  const workspaceName = root.querySelector("#v8-workspace-name");
  const profileInitial = root.querySelector("#v8-profile-initial");
  const syncAction = root.querySelector(".v8-sync-action");
  const themeAction = root.querySelector(".v8-theme-action i");
  const themeButton = root.querySelector(".v8-theme-action");
  const statusBar = root.querySelector("#v8-status-bar");
  const media = globalThis.matchMedia("(max-width: 820px)");
  let activeRoute = options.initialState?.route || "home";
  let activeSpace = options.initialState?.space || "personal";
  let activeFlow = options.initialState?.flow || SPACE_META[activeSpace]?.flow || "Essentiel";
  let activeSync = options.initialState?.syncStatus || "online";
  let railExpanded = options.initialState?.railExpanded === true;
  let navMode = media.matches ? "mobile" : "desktop";
  let transitionTimer = 0;
  let breadcrumbRenderKey = "";
  let statusRenderKey = "";
  const contextName = String(options.contextName || "Personnel").slice(0, 80);

  if (profileInitial) profileInitial.textContent = String(options.user?.initial || "R").slice(0, 1).toUpperCase();

  function renderBreadcrumbs(panel = null) {
    const renderKey = `${activeRoute}|${activeSpace}|${activeFlow}|${panel || ""}|${activeSync}|${contextName}`;
    if (renderKey === breadcrumbRenderKey) return;
    breadcrumbRenderKey = renderKey;
    const markup = breadcrumbsMarkup(createBreadcrumbModel({ route: activeRoute, space: activeSpace, flow: activeFlow, panel, syncStatus: activeSync, workspace: contextName }));
    breadcrumbs.innerHTML = markup.trail;
    breadcrumbContext.innerHTML = markup.context;
    refreshIcons();
  }

  function renderRouteTabs() {
    routeTabs.innerHTML = routeTabsMarkup(activeRoute);
    refreshIcons();
  }

  function renderStatus() {
    const renderKey = `${activeRoute}|${activeSync}`;
    if (renderKey === statusRenderKey) return;
    statusRenderKey = renderKey;
    statusBar.innerHTML = statusMarkup(createStatusModel({ route: activeRoute, syncStatus: activeSync }));
    refreshIcons();
  }

  function renderNavigation() {
    navMode = media.matches ? "mobile" : "desktop";
    navHost.innerHTML = navigationMarkup(navMode, activeRoute, { expanded: railExpanded, space: activeSpace, contextName });
    shell.dataset.navigation = navMode;
    refreshIcons();
  }

  function update(state = {}) {
    const nextRoute = state.route || activeRoute;
    const nextSpace = state.space || activeSpace;
    const nextFlow = state.flow || activeFlow;
    const nextSync = state.syncStatus || activeSync;
    const nextExpanded = state.railExpanded === true;
    const routeChanged = nextRoute !== activeRoute;
    const navigationChanged = routeChanged || nextSpace !== activeSpace || nextExpanded !== railExpanded;
    activeRoute = nextRoute;
    activeSpace = nextSpace;
    activeFlow = nextFlow;
    activeSync = nextSync;
    railExpanded = nextExpanded;
    const meta = routeMeta(activeRoute);
    const spaceMeta = SPACE_META[activeSpace] || SPACE_META.personal;
    shell.dataset.route = activeRoute;
    shell.dataset.panel = state.panel || "";
    shell.dataset.status = meta.status;
    shell.dataset.space = activeSpace;
    shell.dataset.rail = railExpanded ? "expanded" : "compact";
    shell.dataset.sync = state.syncStatus || "online";
    if (workspaceName) workspaceName.textContent = spaceMeta.label;
    if (syncAction) syncAction.dataset.status = state.syncStatus || "online";
    if (themeAction) themeAction.dataset.lucide = state.theme === "graphite" ? "moon-star" : "sun";
    if (themeButton) {
      const label = state.theme === "graphite" ? "Activer le theme Nuit" : "Activer le theme Graphite";
      themeButton.setAttribute("aria-label", label);
      themeButton.dataset.tooltip = label;
    }
    renderBreadcrumbs(state.panel || null);
    renderStatus();
    if (navigationChanged) renderNavigation();
    if (routeChanged) {
      shell.classList.remove("is-route-transitioning");
      stage.classList.remove("is-route-transitioning");
      stage.getBoundingClientRect();
      shell.classList.add("is-route-transitioning");
      stage.classList.add("is-route-transitioning");
      clearTimeout(transitionTimer);
      transitionTimer = setTimeout(() => {
        shell.classList.remove("is-route-transitioning");
        stage.classList.remove("is-route-transitioning");
      }, 240);
      renderRouteTabs();
    }
    refreshIcons();
  }

  function handleAction(event) {
    const control = event.target.closest("[data-action]");
    if (!control || !root.contains(control)) return;
    if (control.matches("button")) event.preventDefault();
    options.onAction?.(control.dataset.action, {
      element: control,
      route: control.dataset.route || activeRoute,
      space: activeSpace,
      event
    });
  }

  function handleMediaChange() {
    const nextMode = media.matches ? "mobile" : "desktop";
    if (nextMode !== navMode) renderNavigation();
  }

  root.addEventListener("click", handleAction);
  media.addEventListener?.("change", handleMediaChange);
  renderNavigation();
  renderRouteTabs();
  update(options.initialState || {});
  refreshIcons();

  return Object.freeze({
    stage,
    panelHost: root.querySelector("#v8-panel-host"),
    commandHost: root.querySelector("#v8-command-host"),
    missionHost: root.querySelector("#v8-mission-host"),
    contextMenuHost: root.querySelector("#v8-context-menu-host"),
    toastRegion: root.querySelector("#v8-toast-region"),
    update,
    focusStage: () => stage.focus({ preventScroll: true }),
    navigationMode: () => navMode,
    destroy: () => {
      clearTimeout(transitionTimer);
      media.removeEventListener?.("change", handleMediaChange);
      root.removeEventListener("click", handleAction);
      root.replaceChildren();
    }
  });
}
