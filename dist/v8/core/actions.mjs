function completed(message, data = null) {
  return Object.freeze({ ok: true, status: "completed", message, data });
}

function unavailable(message) {
  return Object.freeze({ ok: false, status: "unavailable", message, data: null });
}

function failed(message, error) {
  return Object.freeze({ ok: false, status: "failed", message, data: error || null });
}

export function createActionFacade(options = {}) {
  const navigate = typeof options.navigate === "function" ? options.navigate : () => {};
  const setState = typeof options.setState === "function" ? options.setState : () => {};
  const getState = typeof options.getState === "function" ? options.getState : () => ({});
  const notify = typeof options.notify === "function" ? options.notify : () => {};
  const signOut = typeof options.signOut === "function" ? options.signOut : null;
  const setLocale = typeof options.setLocale === "function" ? options.setLocale : null;
  const getLocale = typeof options.getLocale === "function" ? options.getLocale : () => "fr";
  const onActivity = typeof options.onActivity === "function" ? options.onActivity : null;
  const handlers = new Map();
  let syncTimer = 0;

  function register(id, handler) {
    if (!id || typeof handler !== "function") return false;
    handlers.set(String(id), handler);
    return true;
  }

  function unregister(id) {
    return handlers.delete(String(id || ""));
  }

  function scope(id, handler) {
    const actionId = String(id || "");
    if (!actionId || typeof handler !== "function") return () => false;
    const previous = handlers.get(actionId);
    handlers.set(actionId, handler);
    let restored = false;
    return () => {
      if (restored || handlers.get(actionId) !== handler) return false;
      restored = true;
      if (previous) handlers.set(actionId, previous);
      else handlers.delete(actionId);
      return true;
    };
  }

  function openRoute(route, label) {
    return () => {
      setState({ missionOpen: false, commandOpen: false, panel: null });
      navigate(route);
      return completed(`${label} ouvert`);
    };
  }

  register("v8.home.open", openRoute("home", "Accueil"));
  register("v8.notes.open", openRoute("notes", "Notes"));
  register("v8.tasks.open", openRoute("tasks", "Taches"));
  register("v8.calendar.open", openRoute("calendar", "Calendrier"));
  register("v8.files.open", openRoute("files", "Fichiers"));
  register("v8.activity.open", openRoute("activity", "Activity Hub"));
  register("v8.connections.open", openRoute("connections", "Connections"));
  register("v8.spaces.open", openRoute("spaces", "Spaces"));
  register("v8.flows.open", openRoute("flows", "Flows"));
  register("v8.brain.open", openRoute("brain", "Brain"));
  register("v8.settings.open", openRoute("settings", "Reglages"));

  function openNewNote(context) {
    navigate("notes");
    const scoped = handlers.get("v8.notes.new");
    if (scoped && scoped !== openNewNote) return scoped(context);
    return completed("Notes ouvert");
  }
  register("v8.notes.new", openNewNote);

  function openNewEvent(context) {
    navigate("calendar");
    const scoped = handlers.get("v8.calendar.new");
    if (scoped && scoped !== openNewEvent) return scoped(context);
    return completed("Calendrier ouvert");
  }
  register("v8.calendar.new", openNewEvent);

  function openNewFileLink(context) {
    navigate("files");
    const scoped = handlers.get("v8.files.new-link");
    if (scoped && scoped !== openNewFileLink) return scoped(context);
    return completed("Fichiers ouvert");
  }
  register("v8.files.new-link", openNewFileLink);

  function openNewTask(context) {
    navigate("tasks");
    const scoped = handlers.get("v8.tasks.new");
    if (scoped && scoped !== openNewTask) return scoped(context);
    return completed("Taches ouvert");
  }
  register("v8.tasks.new", openNewTask);

  register("v8.widgets.open", () => {
    setState({ panel: "widgets", commandOpen: false, missionOpen: false });
    return completed("Panneau Widgets ouvert");
  });
  register("v8.profile.open", () => {
    setState({ panel: "profile", commandOpen: false, missionOpen: false });
    return completed("Profil ouvert");
  });
  register("v8.notifications.open", () => {
    setState({ panel: "notifications", commandOpen: false, missionOpen: false });
    return completed("Notifications ouvertes");
  });
  register("v8.panel.close", () => {
    setState({ panel: null });
    return completed("Panneau ferme");
  });
  register("v8.command.open", () => {
    setState({ commandOpen: true, missionOpen: false, panel: null, commandQuery: "", commandIndex: 0 });
    return completed("Command Center ouvert");
  });
  register("v8.command.close", () => {
    setState({ commandOpen: false, commandQuery: "", commandIndex: 0 });
    return completed("Command Center ferme");
  });
  register("v8.auth.signout", () => signOut
    ? signOut()
    : unavailable("La deconnexion n'est pas disponible dans ce contexte."));

  register("v8.sidebar.toggle", () => {
    const expanded = !getState().railExpanded;
    setState({ railExpanded: expanded });
    return completed(expanded ? "Sidebar developpee" : "Sidebar compacte", { expanded });
  });

  register("v8.mission.open", () => {
    setState({ missionOpen: true, commandOpen: false, panel: null });
    return completed("Mission Control ouvert");
  });
  register("v8.mission.close", () => {
    setState({ missionOpen: false });
    return completed("Mission Control ferme");
  });

  function activateSpace(id, label, flow, accent) {
    return () => {
      setState({ space: id, flow, accent, missionOpen: false, panel: null, commandOpen: false });
      notify({ id: `space-${id}`, title: "Space actif", message: `${label} est pret.`, type: "success" });
      return completed(`Space ${label} active`, { space: id, flow, accent });
    };
  }

  register("v8.space.personal", activateSpace("personal", "Personnel", "Essentiel", "mint"));
  register("v8.space.focus", activateSpace("focus", "Focus", "Deep Work", "sky"));
  register("v8.space.studio", activateSpace("studio", "Studio", "Creation", "rose"));

  register("v8.sync.refresh", () => {
    setState({ syncStatus: "syncing" });
    if (syncTimer) globalThis.clearTimeout?.(syncTimer);
    syncTimer = globalThis.setTimeout?.(() => {
      syncTimer = 0;
      setState({ syncStatus: globalThis.navigator?.onLine === false ? "error" : "online" });
    }, 900) || 0;
    notify({ id: "sync-refresh", title: "Cloud Sync", message: "Synchronisation locale verifiee.", type: "success" });
    return completed("Synchronisation lancee");
  });

  register("v8.theme.toggle", () => {
    const theme = getState().theme === "night" ? "graphite" : "night";
    setState({ theme });
    notify({ id: "theme-updated", title: "Theme", message: theme === "night" ? "Mode Nuit applique" : "Mode Graphite applique", type: "success" });
    return completed("Theme modifie", { theme });
  });
  register("v8.theme.night", () => {
    setState({ theme: "night" });
    return completed("Mode Nuit applique", { theme: "night" });
  });
  register("v8.theme.graphite", () => {
    setState({ theme: "graphite" });
    return completed("Mode Graphite applique", { theme: "graphite" });
  });
  register("v8.density.toggle", () => {
    const density = getState().density === "comfortable" ? "compact" : "comfortable";
    setState({ density });
    return completed("Densite modifiee", { density });
  });

  register("v8.locale.cycle", () => {
    if (!setLocale) return unavailable("Le changement de langue n'est pas disponible.");
    const locales = ["fr", "en", "es", "de"];
    const current = getLocale();
    const locale = locales[(locales.indexOf(current) + 1) % locales.length];
    setLocale(locale);
    notify({ id: "locale-updated", title: "Langue", message: locale.toUpperCase(), type: "success" });
    return completed("Langue modifiee", { locale });
  });

  ["mint", "sky", "amber", "violet", "rose"].forEach((accent) => {
    register(`v8.accent.${accent}`, () => {
      setState({ accent });
      return completed("Accent modifie", { accent });
    });
  });

  register("v8.appearance.cycle", () => {
    const accents = ["mint", "sky", "amber", "violet", "rose"];
    const current = getState().accent || accents[0];
    const next = accents[(accents.indexOf(current) + 1) % accents.length];
    setState({ accent: next });
    notify({ id: "accent-updated", title: "Apparence", message: `Accent ${next} applique`, type: "success" });
    return completed("Accent modifie", { accent: next });
  });

  function dispatch(id, context = {}) {
    const actionId = String(id || "");
    const handler = handlers.get(actionId);
    if (!handler) {
      const result = unavailable("Cette commande n'est pas encore disponible dans ETHONE.");
      notify({ id: `missing-${actionId || "action"}`, title: "Bientot disponible", message: result.message, type: "info" });
      return result;
    }

    try {
      const result = handler(Object.freeze({ ...context, actionId }));
      const normalized = result && typeof result === "object" ? result : completed("Action terminee", result ?? null);
      if (onActivity && typeof normalized?.then !== "function") {
        try { onActivity(actionId, normalized, getState()); } catch {}
      }
      return normalized;
    } catch (error) {
      const result = failed("L'action n'a pas pu etre terminee.", error);
      notify({ id: `failed-${actionId}`, title: "Action interrompue", message: result.message, type: "error" });
      return result;
    }
  }

  function destroy() {
    if (syncTimer) globalThis.clearTimeout?.(syncTimer);
    syncTimer = 0;
    handlers.clear();
  }

  return Object.freeze({
    register,
    unregister,
    scope,
    dispatch,
    destroy,
    has: (id) => handlers.has(String(id || "")),
    ids: () => Object.freeze([...handlers.keys()])
  });
}
