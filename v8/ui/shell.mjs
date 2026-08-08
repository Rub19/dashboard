import { navigationItem } from "../data/navigation.mjs";
import { workspaceById } from "../data/workspaces.mjs";
import { refreshIcons } from "./icons.mjs";
import { avatarMarkup, mobileNavigationMarkup, navigationMarkup } from "./navigation.mjs";
import { attachFocusPopover } from "./focus-popover.mjs";

const TOPBAR_BRAND_SVG = `<svg viewBox="0 0 64 64" role="img" aria-label="ETHONE"><defs><linearGradient id="v8-topbar-brand-surface" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14191f"/><stop offset="1" stop-color="#080a0d"/></linearGradient><linearGradient id="v8-topbar-brand-signal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7be5c3"/><stop offset="1" stop-color="#8bc9fa"/></linearGradient></defs><rect x="1.25" y="1.25" width="61.5" height="61.5" rx="15.25" fill="url(#v8-topbar-brand-signal)"/><rect x="4.15" y="4.15" width="55.7" height="55.7" rx="12.6" fill="url(#v8-topbar-brand-surface)"/><path d="M19 18v28m0-28h26M19 32h20.5M19 46h26" fill="none" stroke="#f4f7fa" stroke-width="6.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
import { createDock } from "./dock.mjs";

const ROUTE_META = Object.freeze({
  home: { title: "Accueil", icon: "house", status: "online", statusLabel: "Prêt" },
  notes: { title: "Notes", icon: "notebook-pen", status: "saving", statusLabel: "Sauvegarde cloud" },
  tasks: { title: "Tâches", icon: "circle-check-big", status: "sync", statusLabel: "Sync" },
  calendar: { title: "Calendrier", icon: "calendar-days", status: "online", statusLabel: "Agenda prêt" },
  files: { title: "Fichiers", icon: "folder", status: "sync", statusLabel: "Index synchronise" },
  activity: { title: "Activity Hub", icon: "activity", status: "online", statusLabel: "Stable" },
  connections: { title: "Connections", icon: "plug", status: "sync", statusLabel: "Connecteurs" },
  spaces: { title: "Spaces", icon: "layout-grid", status: "online", statusLabel: "Actif" },
  flows: { title: "Flows", icon: "workflow", status: "online", statusLabel: "Prêt" },
  widgets: { title: "Widgets", icon: "panels-top-left", status: "online", statusLabel: "Widgets prêts" },
  brain: { title: "Brain", icon: "brain", status: "brain", statusLabel: "Brain prêt" },
  settings: { title: "Réglages", icon: "settings-2", status: "online", statusLabel: "Cloud" }
});

const PANEL_META = Object.freeze({
  widgets: { title: "Widgets", icon: "panels-top-left", actionId: "v8.widgets.open" },
  notifications: { title: "Notifications", icon: "bell", actionId: "v8.notifications.open" },
  profile: { title: "Profil", icon: "user-round", actionId: "v8.profile.open" }
});

const SYNC_META = Object.freeze({
  loading: { label: "Connexion Supabase", tone: "syncing" },
  saving: { label: "Synchronisation en cours", tone: "syncing" },
  saved: { label: "Synchronisé avec Supabase", tone: "online" },
  offline: { label: "Hors ligne - modifications en attente", tone: "warning" },
  retrying: { label: "Nouvelle tentative", tone: "syncing" },
  error: { label: "Erreur de synchronisation", tone: "error" },
  expired: { label: "Session Supabase expirée", tone: "error" },
  online: { label: "Synchronisé avec Supabase", tone: "online" },
  syncing: { label: "Synchronisation en cours", tone: "syncing" }
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

export function createBreadcrumbModel(input = {}) {
  const route = input.route || "home";
  const space = input.space || "personal";
  const panel = input.panel || null;
  const meta = routeMeta(route);
  const item = navigationItem(route);
  const routeAction = route === "widgets" ? "v8.widgets.open" : item.id === route ? item.actionId : "v8.home.open";
  const spaceMeta = workspaceById(space);
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
  const sync = SYNC_META[input.syncStatus] || SYNC_META.loading;
  const offline = input.networkStatus === "offline";
  const saveMeta = {
    idle: { label: "Sauvegarde prête", tone: "muted", icon: "circle" },
    saving: { label: "Enregistrement en cours", tone: "syncing", icon: "loader-circle" },
    saved: { label: "Enregistré", tone: "online", icon: "check" },
    pending: { label: "Modifications en attente", tone: "warning", icon: "clock-3" },
    error: { label: "Erreur de sauvegarde", tone: "error", icon: "triangle-alert" }
  }[input.saveStatus] || { label: "Sauvegarde prête", tone: "muted", icon: "circle" };
  const sessionExpired = ["expired", "error"].includes(input.sessionStatus);
  return Object.freeze({
    network: Object.freeze({ label: offline ? "Hors ligne" : "En ligne", icon: offline ? "wifi-off" : "wifi", tone: offline ? "error" : "online" }),
    sync: Object.freeze({ label: sync.label, icon: sync.tone === "syncing" ? "refresh-cw" : (offline || sync.tone === "warning" || sync.tone === "error") ? "cloud-off" : "cloud", tone: sync.tone }),
    save: Object.freeze(saveMeta),
    session: Object.freeze({ label: sessionExpired ? "Session expirée" : input.sessionStatus === "checking" ? "Session vérifiée" : "Session chiffrée", icon: sessionExpired ? "shield-alert" : "shield-check", tone: sessionExpired ? "error" : "online" }),
    clock: Object.freeze({ label: /^\d{2}:\d{2}$/.test(String(input.localTime || "")) ? input.localTime : "--:--", icon: "clock-3", tone: "muted", timeZone: String(input.timeZone || "UTC") }),
    version: Object.freeze({ label: `ETHONE ${String(input.version || "8.0")}`, icon: "badge-check", tone: "muted" })
  });
}

function statusMarkup(model) {
  return `<span class="v8-status-item v8-status-item--network" data-tone="${escapeHtml(model.network.tone)}"><i data-lucide="${escapeHtml(model.network.icon)}" aria-hidden="true"></i><span>${escapeHtml(model.network.label)}</span></span><button type="button" class="v8-status-item v8-status-item--sync" data-action="v8.sync.refresh" data-tone="${escapeHtml(model.sync.tone)}" aria-label="${escapeHtml(model.sync.label)}"><i data-lucide="${escapeHtml(model.sync.icon)}" data-presence-icon="cloud" aria-hidden="true"></i><span>${escapeHtml(model.sync.label)}</span></button><span class="v8-status-item v8-status-item--save" data-tone="${escapeHtml(model.save.tone)}"><i data-lucide="${escapeHtml(model.save.icon)}" aria-hidden="true"></i><span>${escapeHtml(model.save.label)}</span></span><span class="v8-status-item v8-status-item--session" data-tone="${escapeHtml(model.session.tone)}"><i data-lucide="${escapeHtml(model.session.icon)}" aria-hidden="true"></i><span>${escapeHtml(model.session.label)}</span></span><time class="v8-status-item v8-status-item--clock" datetime="${escapeHtml(model.clock.label)}" title="${escapeHtml(model.clock.timeZone)}"><i data-lucide="${escapeHtml(model.clock.icon)}" aria-hidden="true"></i><span translate="no">${escapeHtml(model.clock.label)}</span></time><button type="button" class="v8-status-item v8-status-item--version" data-action="v8.changelog.open" data-tone="muted" aria-label="Notes de version"><i data-lucide="${escapeHtml(model.version.icon)}" aria-hidden="true"></i><span translate="no">${escapeHtml(model.version.label)}</span></button>`;
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
              <span class="v8-topbar__workspace-mark" aria-hidden="true">${TOPBAR_BRAND_SVG}</span>
              <span class="v8-topbar__workspace-copy">
                <span translate="no">ETHONE</span>
                <strong id="v8-workspace-name" translate="no">Personnel</strong>
              </span>
            </button>
            <nav class="v8-breadcrumbs" aria-label="Fil d'Ariane"><ol id="v8-breadcrumb-list"></ol><div class="v8-breadcrumb-context" id="v8-breadcrumb-context" aria-label="Contexte actif"></div></nav>
          </div>
          <button type="button" class="v8-command-launcher" data-action="v8.command.open" aria-label="Ouvrir le Command Center pour rechercher, ouvrir ou lancer une action">
            <i data-lucide="search" aria-hidden="true"></i>
            <span>Rechercher ou agir</span>
            <kbd translate="no">Ctrl K</kbd>
          </button>
          <div class="v8-context-strip__tools v8-topbar__tools" aria-label="Action Bar globale">
            <button type="button" class="v8-action-status v8-focus-status" data-action="v8.focus.start.pomodoro" data-tooltip="Pomodoro (25m)" aria-label="Minuteur Pomodoro"><i data-lucide="timer" aria-hidden="true"></i><span><small>Focus</small><strong id="v8-focus-timer-label">Pomodoro</strong></span><b aria-hidden="true"></b></button>
            <button type="button" class="v8-action-status v8-brain-status" data-action="v8.brain.open" data-tooltip="Brain Status" aria-label="Ouvrir Brain"><i data-lucide="brain" data-presence-icon="brain" aria-hidden="true"></i><span><small>Brain</small><strong>Contextuel</strong></span><b aria-hidden="true"></b></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-sync-action" data-action="v8.sync.refresh" data-tooltip="Cloud Sync" aria-label="Synchroniser" aria-keyshortcuts="Control+S Meta+S"><i data-lucide="cloud" data-presence-icon="cloud" aria-hidden="true"></i><span class="v8-action-dot" aria-hidden="true"></span></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-language-action" data-action="v8.locale.cycle" data-tooltip="Changer de langue" aria-label="Changer de langue"><i data-lucide="languages" aria-hidden="true"></i></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-theme-action" data-action="v8.theme.toggle" data-tooltip="Changer de theme" aria-label="Changer de theme"><i data-lucide="moon-star" aria-hidden="true"></i></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-quick-action" data-action="v8.command.open" data-tooltip="Actions rapides" aria-label="Actions rapides"><i data-lucide="zap" aria-hidden="true"></i></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-notification-button" data-action="v8.notifications.open" aria-label="Ouvrir les notifications" data-tooltip="Notifications"><i data-lucide="bell" data-presence-icon="notifications" aria-hidden="true"></i><span class="v8-mail-signal" aria-hidden="true"><i data-lucide="mail" data-presence-icon="mail"></i></span><span class="v8-notification-badge" data-presence-notification-badge aria-hidden="true" hidden>0</span></button>
            <button type="button" class="v8-icon-button v8-topbar-action v8-settings-action" data-action="v8.settings.open" data-route="settings" aria-label="Ouvrir les reglages" data-tooltip="Reglages"><i data-lucide="settings-2" aria-hidden="true"></i></button>
            <button type="button" class="v8-profile-button" data-action="v8.profile.open" aria-label="Ouvrir le profil" data-tooltip="Profil"><span id="v8-profile-mark" class="v8-profile-button__mark" translate="no" aria-hidden="true"></span><i data-lucide="chevron-down" aria-hidden="true"></i></button>
          </div>
        </div>
      </header>
      <div class="v8-stage-wrap">
        <span class="v8-signal-ribbon" aria-hidden="true"></span>
        <main id="v8-stage" class="v8-stage" tabindex="-1" aria-live="polite"></main>
      </div>
      <footer id="v8-status-bar" class="v8-status-bar" aria-label="Barre d'etat ETHONE"></footer>
      <div id="v8-dock-host" class="v8-dock-host"></div>
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
  const workspaceName = root.querySelector("#v8-workspace-name");
  const profileMark = root.querySelector("#v8-profile-mark");
  const syncAction = root.querySelector(".v8-sync-action");
  const themeAction = root.querySelector(".v8-theme-action i");
  const themeButton = root.querySelector(".v8-theme-action");
  const statusBar = root.querySelector("#v8-status-bar");
  const media = globalThis.matchMedia("(max-width: 820px)");
  let activeRoute = options.initialState?.route || "home";
  let activeSpace = options.initialState?.space || "personal";
  let activeFlow = options.initialState?.flow || workspaceById(activeSpace).flow;
  let activeSync = options.initialState?.syncStatus || "loading";
  let activeNetwork = options.initialState?.networkStatus || "online";
  let activeSave = options.initialState?.saveStatus || "idle";
  let activeSession = options.initialState?.sessionStatus || "checking";
  let activeTime = options.initialState?.localTime || "--:--";
  let activeTimeZone = options.initialState?.timeZone || "UTC";
  let activeVersion = options.initialState?.version || "8.0";
  let railExpanded = options.initialState?.railExpanded === true;
  let navMode = media.matches ? "mobile" : "desktop";
  let transitionTimer = 0;
  let breadcrumbRenderKey = "";
  let statusRenderKey = "";
  const contextName = String(options.contextName || "Personnel").slice(0, 80);
  const dock = createDock(root.querySelector("#v8-dock-host"), { route: activeRoute, ownerId: options.ownerId, owner: options.profileId, media: options.spotify, initialOrder: options.dockOrder, onChange: options.onDockChange, onAction: options.onAction, focusTimer: options.focusTimer });
  let activeUser = options.user || null;

  function renderProfileMark() {
    if (profileMark) profileMark.innerHTML = avatarMarkup(activeUser?.avatar, String(activeUser?.initial || "R").slice(0, 1).toUpperCase());
    refreshIcons();
  }

  function updateUser(user) {
    activeUser = user || null;
    renderProfileMark();
    renderNavigation();
  }

  renderProfileMark();

  function renderBreadcrumbs(panel = null) {
    const renderKey = `${activeRoute}|${activeSpace}|${activeFlow}|${panel || ""}|${activeSync}|${contextName}`;
    if (renderKey === breadcrumbRenderKey) return;
    breadcrumbRenderKey = renderKey;
    const markup = breadcrumbsMarkup(createBreadcrumbModel({ route: activeRoute, space: activeSpace, flow: activeFlow, panel, syncStatus: activeSync, workspace: contextName }));
    breadcrumbs.innerHTML = markup.trail;
    breadcrumbContext.innerHTML = markup.context;
    refreshIcons();
  }

  function renderStatus() {
    const renderKey = `${activeSync}|${activeNetwork}|${activeSave}|${activeSession}|${activeTime}|${activeTimeZone}|${activeVersion}`;
    if (renderKey === statusRenderKey) return;
    statusRenderKey = renderKey;
    statusBar.innerHTML = statusMarkup(createStatusModel({ syncStatus: activeSync, networkStatus: activeNetwork, saveStatus: activeSave, sessionStatus: activeSession, localTime: activeTime, timeZone: activeTimeZone, version: activeVersion }));
    refreshIcons();
  }

  function renderNavigation() {
    navMode = media.matches ? "mobile" : "desktop";
    if (navMode === "mobile") navHost.innerHTML = mobileNavigationMarkup(activeRoute, { contextName, avatar: activeUser?.avatar });
    else navHost.innerHTML = navigationMarkup(activeRoute, { expanded: railExpanded, space: activeSpace, contextName, avatar: activeUser?.avatar });
    shell.dataset.navigation = navMode;
    refreshIcons();
    const viewport = navHost.querySelector(".v8-rail__apps");
    const current = viewport?.querySelector('[aria-current="page"]');
    if (current) {
      const bounds = viewport.getBoundingClientRect();
      const activeBounds = current.getBoundingClientRect();
      if (activeBounds.top < bounds.top) viewport.scrollTop += activeBounds.top - bounds.top;
      else if (activeBounds.bottom > bounds.bottom) viewport.scrollTop += activeBounds.bottom - bounds.bottom;
    }
    const drawer = navHost.querySelector(".v8-mobile-nav__drawer");
    if (drawer) drawer.hidden = true;
  }

  function update(state = {}) {
    const nextRoute = state.route || activeRoute;
    const nextSpace = state.space || activeSpace;
    const nextFlow = state.flow || activeFlow;
    const nextSync = state.syncStatus || activeSync;
    const nextNetwork = state.networkStatus || activeNetwork;
    const nextSave = state.saveStatus || activeSave;
    const nextSession = state.sessionStatus || activeSession;
    const nextTime = state.localTime || activeTime;
    const nextTimeZone = state.timeZone || activeTimeZone;
    const nextVersion = state.version || activeVersion;
    const nextExpanded = state.railExpanded === true;
    const routeChanged = nextRoute !== activeRoute;
    const navigationChanged = routeChanged || nextSpace !== activeSpace || nextExpanded !== railExpanded;
    activeRoute = nextRoute;
    activeSpace = nextSpace;
    activeFlow = nextFlow;
    activeSync = nextSync;
    activeNetwork = nextNetwork;
    activeSave = nextSave;
    activeSession = nextSession;
    activeTime = nextTime;
    activeTimeZone = nextTimeZone;
    activeVersion = nextVersion;
    railExpanded = nextExpanded;
    const meta = routeMeta(activeRoute);
    const spaceMeta = workspaceById(activeSpace);
    shell.dataset.route = activeRoute;
    shell.dataset.panel = state.panel || "";
    shell.dataset.status = meta.status;
    shell.dataset.space = activeSpace;
    shell.dataset.rail = railExpanded ? "expanded" : "compact";
    shell.dataset.sync = activeSync;
    if (workspaceName) workspaceName.textContent = spaceMeta.label;
    if (syncAction) syncAction.dataset.status = activeSync;
    const effectiveTheme = document.documentElement.dataset.thème || state.thème;
    if (themeAction) themeAction.dataset.lucide = effectiveTheme === "day" ? "moon-star" : "sun";
    if (themeButton) {
      const label = effectiveTheme === "day" ? "Activer le theme Nuit" : "Activer le theme Jour";
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
      dock.update(activeRoute);
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
  update(options.initialState || {});
  const focusStatus = root.querySelector(".v8-focus-status");
  if (focusStatus && options.focusTimer) {
    attachFocusPopover(focusStatus, { focusTimer: options.focusTimer, onAction: options.onAction });
  }
  refreshIcons();

  return Object.freeze({
    stage,
    panelHost: root.querySelector("#v8-panel-host"),
    commandHost: root.querySelector("#v8-command-host"),
    missionHost: root.querySelector("#v8-mission-host"),
    contextMenuHost: root.querySelector("#v8-context-menu-host"),
    toastRegion: root.querySelector("#v8-toast-region"),
    update,
    updateUser,
    updateSpotify: dock.updateMedia,
    dockOrder: dock.order,
    setDockOrder: dock.setOrder,
    focusStage: () => stage.focus({ preventScroll: true }),
    navigationMode: () => navMode,
    destroy: () => {
      clearTimeout(transitionTimer);
      media.removeEventListener?.("change", handleMediaChange);
      root.removeEventListener("click", handleAction);
      dock.destroy();
      root.replaceChildren();
    }
  });
}
