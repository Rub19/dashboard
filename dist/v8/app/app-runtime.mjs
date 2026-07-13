import { createLifecycle } from "../core/lifecycle.mjs";
import { createPresentationStore } from "../core/store.mjs";
import { createRouter } from "../core/router.mjs";
import { createActionFacade } from "../core/actions.mjs";
import { createCommandHistory } from "../command/history.mjs";
import { createCommandCenter } from "../command/command-center.mjs";
import { createHomeModel } from "../data/home-model.mjs";
import { createActivityJournal } from "../data/activity-journal.mjs";
import { createDocumentMetadataManager, themeColorForState } from "../core/document-metadata.mjs";
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
import { mountBrain } from "../pages/brain.mjs";
import { mountSettings } from "../pages/settings.mjs";
import { mountSpaces, mountFlows } from "../pages/system.mjs";
import { mountFeatureFallback } from "../pages/feature-fallback.mjs";

export function mountApplication(root, options = {}) {
  if (!root) throw new TypeError("Application runtime requires a root element");
  const repository = options.repository;
  const i18n = options.i18n;
  const metadata = options.metadata || createDocumentMetadataManager(document);
  if (!repository) throw new TypeError("Application runtime requires a profile repository");

  const startedAt = performance.now();
  const store = createPresentationStore({}, { fallbackState: { accent: options.profile?.accent, space: options.profile?.space, flow: options.profile?.flow } });
  const initialModel = createHomeModel();
  const lifecycle = createLifecycle();
  const history = createCommandHistory();
  const activityJournal = createActivityJournal(repository);
  let actions = null;
  let router = null;
  let destroyed = false;
  let routeRequest = 0;

  document.documentElement.dataset.accent = store.getState().accent;
  document.documentElement.dataset.density = store.getState().density;
  document.documentElement.dataset.theme = store.getState().theme;
  metadata.setThemeColor(themeColorForState(store.getState()));
  delete document.documentElement.dataset.entry;

  const shell = mountShell(root, {
    initialState: store.getState(),
    user: initialModel.user,
    contextName: options.profile?.name || "Personnel",
    onAction: (actionId, context) => actions?.dispatch(actionId, context)
  });
  const toasts = createToastManager(shell.toastRegion);
  const panels = createPanelManager(shell.panelHost, {
    user: initialModel.user,
    snapshot: () => repository.snapshot(),
    getState: () => store.getState(),
    currentLocale: () => i18n?.locale?.() || "fr",
    onLocaleChange: (locale) => i18n?.setLocale?.(locale),
    onClose: () => actions?.dispatch("v8.panel.close", { source: "keyboard" })
  });
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
    onClose: () => actions?.dispatch("v8.mission.close", { source: "backdrop" })
  });
  const contextMenu = createContextMenu(shell.contextMenuHost);

  function finishRouteMount(route, focus) {
    i18n?.apply?.(shell.stage);
    metadata.setRoute(route);
    if (focus) shell.focusStage();
  }

  function showRouteLoader(route) {
    const page = document.createElement("section");
    page.className = "v8-page v8-lazy-page";
    page.dataset.page = route;
    page.setAttribute("aria-busy", "true");
    page.innerHTML = '<div class="v8-lazy-page__header"><span class="v8-skeleton"></span><span class="v8-skeleton"></span></div><div class="v8-lazy-page__grid"><span class="v8-skeleton"></span><span class="v8-skeleton"></span><span class="v8-skeleton"></span></div>';
    shell.stage.replaceChildren(page);
  }

  function mountLazyRoute(route, focus, requestId) {
    const loader = route === "activity" ? () => import("../pages/activity.mjs") : () => import("../pages/connections.mjs");
    lifecycle.unmount();
    showRouteLoader(route);
    finishRouteMount(route, focus);
    loader()
      .then(async (module) => {
        await module.prepare?.();
        if (destroyed || requestId !== routeRequest || router?.current() !== route) return;
        lifecycle.mount(route, () => route === "activity"
          ? module.mountActivity(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), notify: (notice) => toasts.show(notice) })
          : module.mountConnections(shell.stage, { repository, actions, journal: activityJournal, state: store.getState(), notify: (notice) => toasts.show(notice) }));
        finishRouteMount(route, focus);
      })
      .catch(() => {
        if (destroyed || requestId !== routeRequest || router?.current() !== route) return;
        lifecycle.mount(route, () => mountFeatureFallback(shell.stage, route));
        finishRouteMount(route, focus);
        toasts.show({ id: `lazy-${route}`, title: route === "activity" ? "Activity Hub" : "Connections", message: "Le module n'a pas pu etre charge.", type: "error" });
      });
  }

  function mountRoute(route, focus = true) {
    const requestId = ++routeRequest;
    shell.update({ ...store.getState(), route });
    if (route === "activity" || route === "connections") {
      mountLazyRoute(route, focus, requestId);
      return;
    }
    lifecycle.mount(route, () => {
      if (route === "home") return mountHome(shell.stage, createHomeModel(), store.getState());
      if (route === "notes") return mountNotes(shell.stage, { repository, actions, notify: (notice) => toasts.show(notice) });
      if (route === "tasks") return mountTasks(shell.stage, { repository, actions, notify: (notice) => toasts.show(notice) });
      if (route === "calendar") return mountCalendar(shell.stage, { repository, actions, notify: (notice) => toasts.show(notice) });
      if (route === "files") return mountFiles(shell.stage, { repository, actions, notify: (notice) => toasts.show(notice) });
      if (route === "brain") return mountBrain(shell.stage, { repository, actions, state: store.getState() });
      if (route === "settings") return mountSettings(shell.stage, { repository, actions, state: store.getState() });
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
    setLocale: (locale) => i18n?.setLocale?.(locale),
    getLocale: () => i18n?.locale?.() || "fr",
    onActivity: (actionId, result) => activityJournal.capture(actionId, result)
  });

  const unsubscribe = store.subscribe((next, previous) => {
    if (next.accent !== previous.accent) document.documentElement.dataset.accent = next.accent;
    if (next.density !== previous.density) document.documentElement.dataset.density = next.density;
    if (next.theme !== previous.theme) document.documentElement.dataset.theme = next.theme;
    if (next.space !== previous.space) document.documentElement.dataset.space = next.space;
    if (next.theme !== previous.theme || next.space !== previous.space) metadata.setThemeColor(themeColorForState(next));
    shell.update(next);
    if (next.commandOpen !== previous.commandOpen) {
      if (next.commandOpen) commandCenter.open(next);
      else commandCenter.close();
    }
    if (next.panel !== previous.panel) {
      panels.close({ restoreFocus: !next.commandOpen && !next.missionOpen });
      if (next.panel) panels.open(next.panel);
    }
    if (next.missionOpen !== previous.missionOpen) {
      if (next.missionOpen) missionControl.open(next);
      else missionControl.close({ restoreFocus: !next.commandOpen && !next.panel });
    }
    if (next.commandOpen !== previous.commandOpen || next.panel !== previous.panel || next.missionOpen !== previous.missionOpen) {
      metadata.setSurface(next.commandOpen ? "command" : next.missionOpen ? "mission" : next.panel);
    }
    if (next.space !== previous.space) metadata.setRoute(next.route);
    const settingsChanged = next.route === "settings" && (
      next.theme !== previous.theme ||
      next.density !== previous.density ||
      next.accent !== previous.accent ||
      next.space !== previous.space
    );
    if (settingsChanged) mountRoute("settings", false);
    if (next.space !== previous.space && ["home", "brain", "spaces", "flows"].includes(next.route)) mountRoute(next.route, false);
    contextMenu.close();
  });

  function handleGlobalKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      actions.dispatch("v8.command.open", { source: "keyboard" });
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
    if (!editable && !store.getState().commandOpen && !store.getState().panel && ["PageDown", "PageUp", "Home", "End"].includes(event.key)) {
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

  function handleNetworkChange() {
    store.setState({ syncStatus: globalThis.navigator?.onLine === false ? "error" : "online" });
  }

  document.addEventListener("keydown", handleGlobalKeydown);
  document.addEventListener("pointerdown", handlePointerDown);
  shell.stage.addEventListener("contextmenu", handleContextMenu);
  globalThis.addEventListener?.("online", handleNetworkChange);
  globalThis.addEventListener?.("offline", handleNetworkChange);
  const persistedRoute = store.getState().route;
  if (!globalThis.location.hash && persistedRoute !== "home") {
    globalThis.history.replaceState({ ethoneV8Route: persistedRoute }, "", `#/${persistedRoute}`);
  }
  router.start();
  document.documentElement.dataset.space = store.getState().space;
  refreshIcons();
  root.dataset.bootStatus = "ready";
  root.dataset.bootMs = Math.round(performance.now() - startedAt);

  function destroy() {
    if (destroyed) return false;
    destroyed = true;
    routeRequest += 1;
    document.removeEventListener("keydown", handleGlobalKeydown);
    document.removeEventListener("pointerdown", handlePointerDown);
    shell.stage.removeEventListener("contextmenu", handleContextMenu);
    globalThis.removeEventListener?.("online", handleNetworkChange);
    globalThis.removeEventListener?.("offline", handleNetworkChange);
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
      documentTitle: document.title,
      documentContext: metadata.current(),
      activitySubscribers: activityJournal.subscriberCount()
    }),
    destroy
  });
}
