import { createLifecycle } from "../core/lifecycle.mjs";
import { createPresentationStore } from "../core/store.mjs";
import { createRouter } from "../core/router.mjs";
import { createActionFacade } from "../core/actions.mjs";
import { createDensityEngine } from "../core/density-engine.mjs";
import { createCommandHistory } from "../command/history.mjs";
import { createCommandCenter } from "../command/command-center.mjs";
import { createHomeModel } from "../data/home-model.mjs";
import { claimDailyBriefing } from "../data/daily-briefing.mjs";
import { createActivityJournal } from "../data/activity-journal.mjs";
import { createDocumentMetadataManager, themeColorForState } from "../core/document-metadata.mjs";
import { createAmbientEngine } from "../core/experience.mjs";
import { calendarPresenceState, createPresenceEngine } from "../core/presence-engine.mjs";
import { createSpotifyLive } from "../services/spotify-live.mjs";
import { mountShell } from "../ui/shell.mjs";
import { createPanelManager } from "../ui/panel.mjs";
import { createToastManager } from "../ui/toast.mjs";
import { createMissionControl } from "../ui/mission-control.mjs";
import { createContextMenu } from "../ui/context-menu.mjs";
import { refreshIcons } from "../ui/icons.mjs";
import { mountHome } from "../pages/home.mjs";
import { mountNotes } from "../pages/notes.mjs";
import { mountTasks } from "../pages/tasks.mjs";
import { mountCalendar } from "../pages/calendar.mjs";
import { mountFiles } from "../pages/files.mjs";
import { mountSpaces, mountFlows } from "../pages/system.mjs";
import { mountFeatureFallback } from "../pages/feature-fallback.mjs";

export function mountApplication(root, options = {}) {
  if (!root) throw new TypeError("Application runtime requires a root element");
  const repository = options.repository;
  const i18n = options.i18n;
  const metadata = options.metadata || createDocumentMetadataManager(document);
  const sounds = options.soundManager || null;
  const cloudSync = options.cloudSync || null;
  const clockManager = options.clockManager || null;
  const externalServices = options.externalServices || null;
  if (!repository) throw new TypeError("Application runtime requires a profile repository");

  const startedAt = performance.now();
  const initialSync = cloudSync?.status?.() || {};
  const initialClock = clockManager?.snapshot?.() || {};
  const store = createPresentationStore({
    ...(cloudSync?.preferences?.() || {}),
    syncStatus: initialSync.syncStatus,
    networkStatus: initialSync.networkStatus,
    saveStatus: initialSync.saveStatus,
    sessionStatus: initialSync.sessionStatus,
    localTime: initialClock.time,
    timeZone: initialClock.timeZone
  }, { fallbackState: { accent: options.profile?.accent, space: options.profile?.space, flow: options.profile?.flow } });
  const initialModel = createHomeModel({ snapshot: repository.snapshot() });
  const lifecycle = createLifecycle();
  const densityEngine = createDensityEngine({ target: document.documentElement, runtime: globalThis, getState: () => store.getState() });
  const history = createCommandHistory();
  const activityJournal = createActivityJournal(repository);
  const ownsAmbientEngine = !options.ambientEngine;
  const ambient = options.ambientEngine || createAmbientEngine({
    target: document.documentElement,
    document,
    runtime: globalThis,
    soundManager: sounds,
    getState: () => store.getState()
  });
  const ownsPresenceEngine = !options.presenceEngine;
  const presence = options.presenceEngine || createPresenceEngine({ target: document.documentElement, document, runtime: globalThis });
  const ownsSpotifyLive = !options.spotifyLive;
  const spotifyLive = options.spotifyLive || createSpotifyLive({
    document,
    runtime: globalThis,
    isConnected: () => repository.snapshot().connections.some((connection) => connection.id === "spotify" && connection.status === "connected")
  });
  let actions = null;
  let router = null;
  let shell = null;
  let destroyed = false;
  let routeRequest = 0;
  let brainRuntime = null;
  let brainRuntimePromise = null;
  let applyingCloudPreferences = false;
  let cloudPreferencesKey = JSON.stringify(store.cloudSnapshot());
  let densityStateKey = JSON.stringify({ density: store.getState().density, settings: store.getState().densitySettings, space: store.getState().space, flow: store.getState().flow, panel: store.getState().panel, rail: store.getState().railExpanded });

  const releaseCloudBinding = cloudSync?.bindRuntime?.({
    readPreferences: () => ({
      ...store.cloudSnapshot(),
      locale: i18n?.locale?.() || "fr",
      sound: sounds?.preferences?.() || null,
      dock: shell?.dockOrder?.() || cloudSync?.preferences?.().dock || null
    }),
    applyPreferences: (preferences) => {
      applyingCloudPreferences = true;
      try {
        store.setState(preferences);
        if (preferences?.locale) i18n?.setLocale?.(preferences.locale, { announce: false });
        if (preferences?.sound) sounds?.setPreferences?.(preferences.sound);
        if (preferences?.dock) shell?.setDockOrder?.(preferences.dock);
      } finally {
        cloudPreferencesKey = JSON.stringify(store.cloudSnapshot());
        applyingCloudPreferences = false;
      }
    }
  }) || (() => {});
  const releaseCloudStatus = cloudSync?.subscribe?.((next) => {
    store.setState({
      syncStatus: next.syncStatus,
      networkStatus: next.networkStatus,
      saveStatus: next.saveStatus,
      sessionStatus: next.sessionStatus
    });
  }) || (() => {});
  const releaseClock = clockManager?.subscribe?.((next) => {
    store.setState({ localTime: next.time, timeZone: next.timeZone });
  }) || (() => {});
  const releaseSoundPreferences = sounds?.subscribe?.(() => {
    if (!applyingCloudPreferences) cloudSync?.queue?.("sound-preferences");
  }) || (() => {});

  document.documentElement.dataset.accent = store.getState().accent;
  document.documentElement.dataset.theme = store.getState().theme;
  document.documentElement.dataset.space = store.getState().space;
  document.documentElement.dataset.spotlight = store.getState().spotlightEnabled === false ? "disabled" : "enabled";
  densityEngine.start(store.getState());
  if (ownsAmbientEngine) ambient.start(store.getState());
  else ambient.refresh(store.getState());
  if (ownsSpotifyLive) spotifyLive.start();
  else spotifyLive.refresh?.();
  const initialSpotify = spotifyLive.state?.() || {};
  const initialMedia = initialSpotify.playing ? "playing" : initialSpotify.available ? "paused" : "idle";
  const initialCalendar = calendarPresenceState(repository.snapshot().events);
  if (ownsPresenceEngine) presence.start({ route: store.getState().route, syncStatus: store.getState().syncStatus, media: initialMedia, calendar: initialCalendar });
  else presence.update({ route: store.getState().route, syncStatus: store.getState().syncStatus, media: initialMedia, calendar: initialCalendar });
  metadata.setThemeColor(themeColorForState(store.getState()));
  delete document.documentElement.dataset.entry;

  shell = mountShell(root, {
    initialState: store.getState(),
    user: initialModel.user,
    profileId: options.profile?.id,
    contextName: options.profile?.name || "Personnel",
    dockOrder: cloudSync?.preferences?.().dock,
    spotify: initialSpotify,
    onDockChange: () => cloudSync?.queue?.("dock-layout"),
    onAction: (actionId, context) => actions?.dispatch(actionId, context)
  });
  const releaseSpotify = spotifyLive.subscribe?.((playback) => {
    presence.update({ media: playback.playing ? "playing" : playback.available ? "paused" : "idle" });
    shell.updateSpotify(playback);
  }, { immediate: false }) || (() => {});
  presence.signalIcon?.("brain");
  if (initialCalendar === "approaching") presence.signalIcon?.("calendar");
  const toasts = createToastManager(shell.toastRegion, { sounds, presence });
  const panels = createPanelManager(shell.panelHost, {
    user: initialModel.user,
    snapshot: () => repository.snapshot(),
    getState: () => store.getState(),
    currentLocale: () => i18n?.locale?.() || "fr",
    onLocaleChange: (locale) => i18n?.setLocale?.(locale),
    onClose: () => actions?.dispatch("v8.panel.close", { source: "keyboard" })
  });
  let unreadNotifications = panels.notificationCount();
  presence.update({ notifications: unreadNotifications });
  const commandCenter = createCommandCenter(shell.commandHost, {
    history,
    additionalCommands: () => {
      const snapshot = repository.snapshot();
      const makeCommand = (kind, item, index) => {
        const routes = { note: "notes", task: "tasks", file: "files" };
        const icons = { note: "notebook-pen", task: "circle-check-big", file: "file" };
        const labels = { note: "Note", task: "Tache", file: "Fichier" };
        const title = String(item?.title || item?.name || `${labels[kind]} ${index + 1}`).slice(0, 96);
        const detail = String(item?.content || item?.description || "Ouvrir dans ETHONE").replace(/\s+/g, " ").slice(0, 96);
        return Object.freeze({
          id: `content.${kind}.${String(item?.id || index)}`,
          actionId: `v8.${routes[kind]}.open`,
          label: title,
          subtitle: detail,
          category: labels[kind],
          icon: icons[kind],
          keywords: Object.freeze([title, detail, kind]),
          contexts: Object.freeze([routes[kind]]),
          contextPriority: 88
        });
      };
      return Object.freeze([
        ...(snapshot.notes || []).slice(0, 8).map((item, index) => makeCommand("note", item, index)),
        ...(snapshot.tasks || []).slice(0, 8).map((item, index) => makeCommand("task", item, index)),
        ...(snapshot.files || []).slice(0, 8).map((item, index) => makeCommand("file", item, index))
      ]);
    },
    onExecute: (command) => actions?.dispatch(command.actionId, { source: "command-center", command }),
    onClose: () => actions?.dispatch("v8.command.close", { source: "command-center" })
  });
  const missionControl = createMissionControl(shell.missionHost, {
    snapshot: () => repository.snapshot(),
    activity: () => activityJournal.entries(),
    onClose: () => actions?.dispatch("v8.mission.close", { source: "backdrop" })
  });
  const contextMenu = createContextMenu(shell.contextMenuHost);

  function finishRouteMount(route, focus) {
    i18n?.apply?.(shell.stage);
    presence.revealWidgets(shell.stage);
    metadata.setRoute(route);
    if (focus) shell.focusStage();
  }

  function showRouteLoader(route) {
    const skeleton = () => {
      const node = document.createElement("span");
      node.className = "v8-skeleton";
      return node;
    };
    const header = document.createElement("div");
    header.className = "v8-lazy-page__header";
    header.append(skeleton(), skeleton());
    const grid = document.createElement("div");
    grid.className = "v8-lazy-page__grid";
    grid.append(skeleton(), skeleton(), skeleton());
    const page = document.createElement("section");
    page.className = "v8-page v8-lazy-page";
    page.dataset.page = route;
    page.setAttribute("aria-busy", "true");
    page.append(header, grid);
    shell.stage.replaceChildren(page);
  }

  function ensureBrainRuntime() {
    if (brainRuntime) return Promise.resolve(brainRuntime);
    if (brainRuntimePromise) return brainRuntimePromise;
    brainRuntimePromise = import("../brain/runtime.mjs").then(({ createBrainRuntime }) => {
      if (destroyed) throw new Error("Application fermee");
      brainRuntime = createBrainRuntime({
        repository,
        actions,
        getState: () => store.getState(),
        externalServices,
        clientProvider: options.clientProvider,
        ownerId: options.ownerId || repository.owner?.(),
        presence,
        runtime: globalThis
      });
      return brainRuntime;
    }).finally(() => { brainRuntimePromise = null; });
    return brainRuntimePromise;
  }

  function mountLazyRoute(route, focus, requestId) {
    const loaders = {
      activity: () => import("../pages/activity.mjs"),
      connections: () => import("../pages/connections.mjs"),
      brain: () => import("../pages/brain.mjs"),
      settings: () => import("../pages/settings.mjs")
    };
    const loader = loaders[route];
    lifecycle.unmount();
    showRouteLoader(route);
    finishRouteMount(route, focus);
    Promise.all([loader(), ["brain", "settings"].includes(route) ? ensureBrainRuntime() : Promise.resolve(null)])
      .then(async ([module, brain]) => {
        await module.prepare?.();
        if (destroyed || requestId !== routeRequest || router?.current() !== route) return;
        lifecycle.mount(route, () => {
          if (route === "activity") return module.mountActivity(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), spotifyLive, presence, notify: (notice) => toasts.show(notice) });
          if (route === "connections") return module.mountConnections(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), spotifyLive, externalServices, notify: (notice) => toasts.show(notice) });
          if (route === "brain") return module.mountBrain(shell.stage, { repository, actions, state: store.getState(), presence, brain, notify: (notice) => toasts.show(notice) });
          return module.mountSettings(shell.stage, { repository, actions, state: store.getState(), sounds, externalServices, densityEngine, subscribeState: store.subscribe, brain, notify: (notice) => toasts.show(notice) });
        });
        finishRouteMount(route, focus);
      })
      .catch(() => {
        if (destroyed || requestId !== routeRequest || router?.current() !== route) return;
        lifecycle.mount(route, () => mountFeatureFallback(shell.stage, route));
        finishRouteMount(route, focus);
        toasts.show({ id: `lazy-${route}`, title: route === "activity" ? "Activity Hub" : route === "connections" ? "Connections" : route === "settings" ? "Reglages" : "Brain", message: "Le module n'a pas pu etre charge.", type: "error" });
      });
  }

  function mountRoute(route, focus = true) {
    const requestId = ++routeRequest;
    shell.update({ ...store.getState(), route });
    if (["activity", "connections", "brain", "settings"].includes(route)) {
      mountLazyRoute(route, focus, requestId);
      return;
    }
    lifecycle.mount(route, () => {
      if (route === "home") return mountHome(shell.stage, createHomeModel({ snapshot: repository.snapshot() }), { ...store.getState(), spotifyLive, presence, sync: cloudSync });
      if (route === "notes") return mountNotes(shell.stage, { repository, actions, presence, sync: cloudSync, notify: (notice) => toasts.show(notice) });
      if (route === "tasks") return mountTasks(shell.stage, { repository, actions, presence, notify: (notice) => toasts.show(notice) });
      if (route === "calendar") return mountCalendar(shell.stage, { repository, actions, presence, notify: (notice) => toasts.show(notice) });
      if (route === "files") return mountFiles(shell.stage, { repository, actions, presence, notify: (notice) => toasts.show(notice) });
      if (route === "spaces") return mountSpaces(shell.stage, { repository, actions, state: store.getState() });
      if (route === "flows") return mountFlows(shell.stage, { repository, actions, state: store.getState() });
      return mountFeatureFallback(shell.stage, route);
    });
    finishRouteMount(route, focus);
  }

  router = createRouter({
    runtime: globalThis,
    onRoute: (route) => {
      if (store.getState().route !== route) store.setState({ route });
      activityJournal.captureRoute(route);
      mountRoute(route, root.dataset.bootStatus === "ready");
    }
  });

  actions = createActionFacade({
    navigate: (route) => router.navigate(route),
    setState: (patch) => store.setState(patch),
    getState: () => store.getState(),
    notify: (notice) => toasts.show(notice),
    signOut: options.onSignOut,
    setLocale: (locale) => {
      const next = i18n?.setLocale?.(locale);
      cloudSync?.queue?.("locale");
      return next;
    },
    getLocale: () => i18n?.locale?.() || "fr",
    sounds,
    sync: cloudSync,
    spotifyLive,
    onActivity: (actionId, result) => activityJournal.capture(actionId, result)
  });

  const unsubscribe = store.subscribe((next, previous) => {
    const nextCloudPreferencesKey = JSON.stringify(store.cloudSnapshot());
    if (!applyingCloudPreferences && nextCloudPreferencesKey !== cloudPreferencesKey) {
      cloudPreferencesKey = nextCloudPreferencesKey;
      cloudSync?.queue?.("preferences");
    }
    if (next.accent !== previous.accent) document.documentElement.dataset.accent = next.accent;
    const nextDensityStateKey = JSON.stringify({ density: next.density, settings: next.densitySettings, space: next.space, flow: next.flow, panel: next.panel, rail: next.railExpanded });
    if (nextDensityStateKey !== densityStateKey) {
      densityStateKey = nextDensityStateKey;
      densityEngine.refresh(next);
    }
    if (next.theme !== previous.theme) document.documentElement.dataset.theme = next.theme;
    if (next.space !== previous.space) document.documentElement.dataset.space = next.space;
    if (next.spotlightEnabled !== previous.spotlightEnabled) document.documentElement.dataset.spotlight = next.spotlightEnabled ? "enabled" : "disabled";
    if (next.flow !== previous.flow || next.space !== previous.space || next.theme !== previous.theme) ambient.refresh(next);
    if (next.theme !== previous.theme || next.space !== previous.space) metadata.setThemeColor(themeColorForState(next));
    shell.update(next);
    if (next.panel === "notifications" && previous.panel !== "notifications") unreadNotifications = 0;
    if (next.route !== previous.route || next.syncStatus !== previous.syncStatus || next.panel !== previous.panel) {
      presence.update({ route: next.route, syncStatus: next.syncStatus, notifications: unreadNotifications });
    }
    if (next.commandOpen !== previous.commandOpen) {
      if (next.commandOpen) commandCenter.open(next);
      else commandCenter.close();
    }
    if (next.panel !== previous.panel) {
      panels.close({ restoreFocus: !next.commandOpen && !next.missionOpen });
      if (next.panel) {
        panels.open(next.panel);
        presence.revealWidgets(shell.panelHost);
      }
    }
    if (next.missionOpen !== previous.missionOpen) {
      if (next.missionOpen) {
        missionControl.open(next);
        presence.revealWidgets(shell.missionHost);
      }
      else missionControl.close({ restoreFocus: !next.commandOpen && !next.panel });
    }
    if (next.commandOpen !== previous.commandOpen || next.panel !== previous.panel || next.missionOpen !== previous.missionOpen) {
      metadata.setSurface(next.commandOpen ? "command" : next.missionOpen ? "mission" : next.panel);
    }
    if (next.space !== previous.space) metadata.setRoute(next.route);
    const settingsChanged = next.route === "settings" && (
      next.theme !== previous.theme ||
      next.accent !== previous.accent ||
      next.space !== previous.space ||
      next.spotlightEnabled !== previous.spotlightEnabled
    );
    if (settingsChanged) mountRoute("settings", false);
    if (next.space !== previous.space && ["home", "brain", "spaces", "flows"].includes(next.route)) mountRoute(next.route, false);
    contextMenu.close();
  });

  function handleGlobalKeydown(event) {
    if (event.key === "F2") {
      event.preventDefault();
      actions.dispatch(store.getState().missionOpen ? "v8.mission.close" : "v8.mission.open", { source: "keyboard" });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      actions.dispatch(store.getState().commandOpen ? "v8.command.close" : "v8.command.open", { source: "keyboard" });
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "m") {
      event.preventDefault();
      actions.dispatch(store.getState().missionOpen ? "v8.mission.close" : "v8.mission.open", { source: "keyboard" });
      return;
    }
    if (event.key === "Escape" && store.getState().missionOpen) {
      event.preventDefault();
      actions.dispatch("v8.mission.close", { source: "keyboard" });
      return;
    }
    if (event.key === "Escape" && !store.getState().commandOpen && store.getState().panel) {
      event.preventDefault();
      actions.dispatch("v8.panel.close", { source: "keyboard" });
      return;
    }
    const target = event.target;
    const editable = target?.matches?.("input, textarea, select, [contenteditable='true']");
    if (!editable && !store.getState().commandOpen && !store.getState().missionOpen && !store.getState().panel && ["PageDown", "PageUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const page = Math.max(240, shell.stage.clientHeight * 0.82);
      if (event.key === "PageDown") shell.stage.scrollBy({ top: page, behavior: "auto" });
      if (event.key === "PageUp") shell.stage.scrollBy({ top: -page, behavior: "auto" });
      if (event.key === "Home") shell.stage.scrollTo({ top: 0, behavior: "auto" });
      if (event.key === "End") shell.stage.scrollTo({ top: shell.stage.scrollHeight, behavior: "auto" });
    }
  }

  function handleContextMenu(event) {
    if (!shell.stage.contains(event.target)) return;
    if (event.target?.closest?.("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    contextMenu.open(event.clientX, event.clientY);
  }

  function handlePointerDown(event) {
    if (!shell.contextMenuHost.contains(event.target)) contextMenu.close();
  }

  function handleVisibilityRefresh() {
    if (!document.hidden) presence.update({ calendar: calendarPresenceState(repository.snapshot().events) });
  }

  document.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("pointerdown", handlePointerDown);
  document.addEventListener("visibilitychange", handleVisibilityRefresh);
  shell.stage.addEventListener("contextmenu", handleContextMenu);
  const persistedRoute = store.getState().route;
  if (!globalThis.location.hash && persistedRoute !== "home") {
    globalThis.history.replaceState({ ethoneV8Route: persistedRoute }, "", `#/${persistedRoute}`);
  }
  router.start();
  if (store.getState().brainPreferences?.briefing?.enabled !== false && claimDailyBriefing(globalThis.localStorage, initialModel.briefing)) {
    toasts.show({
      id: "daily-brain-briefing",
      title: "Briefing Brain pret",
      message: initialModel.briefing.summary,
      type: "info",
      duration: 6200,
      action: { label: "Voir le briefing", run: () => actions.dispatch("v8.home.open", { source: "daily-briefing" }) }
    });
  }
  document.documentElement.dataset.space = store.getState().space;
  cloudSync?.queue?.("runtime-ready");
  refreshIcons();
  root.dataset.bootStatus = "ready";
  root.dataset.bootMs = Math.round(performance.now() - startedAt);

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    routeRequest += 1;
    document.removeEventListener("keydown", handleGlobalKeydown);
    document.removeEventListener("pointerdown", handlePointerDown);
    document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    shell.stage.removeEventListener("contextmenu", handleContextMenu);
    if (ownsAmbientEngine) ambient.destroy();
    releaseSpotify();
    releaseClock();
    releaseSoundPreferences();
    releaseCloudStatus();
    releaseCloudBinding();
    if (ownsSpotifyLive) spotifyLive.destroy();
    if (ownsPresenceEngine) presence.destroy();
    densityEngine.destroy();
    brainRuntime?.destroy?.();
    brainRuntime = null;
    unsubscribe();
    actions.destroy?.();
    router.stop();
    commandCenter.destroy();
    missionControl.destroy();
    contextMenu.destroy();
    panels.destroy();
    toasts.destroy();
    activityJournal.destroy();
    lifecycle.unmount();
    shell.destroy();
    return true;
  }

  return Object.freeze({
    getState: store.getState,
    dispatch: actions.dispatch,
    navigate: router.navigate,
    refresh: () => mountRoute(router.current(), false),
    notify: (notice) => toasts.show(notice),
    diagnostics: () => Object.freeze({
      bootMs: Number(root.dataset.bootMs || 0),
      route: router.current(),
      mountedSurfaces: lifecycle.stats().mounted,
      navigationMode: shell.navigationMode(),
      storeSubscribers: store.subscriberCount(),
      commandOpen: commandCenter.isOpen(),
      missionOpen: missionControl.isOpen(),
      contextMenuOpen: contextMenu.isOpen(),
      activePanel: panels.current(),
      visualContext: document.documentElement.dataset.context || "neutral",
      ambientPhase: document.documentElement.dataset.ambient || "afternoon",
      ambientEngine: ambient.diagnostics?.() || null,
      presenceEngine: presence.diagnostics?.() || null,
      spotifyLive: spotifyLive.diagnostics?.() || null,
      documentTitle: document.title,
      documentContext: metadata.current(),
      activitySubscribers: activityJournal.subscriberCount(),
      soundSystem: sounds?.diagnostics?.() || null,
      cloudSync: cloudSync?.diagnostics?.() || null,
      clock: clockManager?.diagnostics?.() || null,
      externalServices: externalServices?.diagnostics?.() || null,
      densityEngine: densityEngine.diagnostics(),
      brain: brainRuntime ? Object.freeze({ loaded: true, ...brainRuntime.diagnostics() }) : Object.freeze({ loaded: false })
    }),
    setBrainPresence: presence.setBrain,
    destroy
  });
}
