import { WORKSPACES } from "../data/workspaces.mjs";
import { DENSITY_CUSTOM_RANGES, DENSITY_MODES } from "./density-engine.mjs";
import { patchBrainPreferences, sanitizeBrainPreferences } from "../brain/preferences.mjs";
import { sanitizeAutomationRule, sanitizeAutomationRules } from "./automation-engine.mjs";

const LOCALES = Object.freeze(["fr", "en", "es", "de"]);

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
  const sounds = options.sounds || null;
  const sync = options.sync || null;
  const spotifyLive = options.spotifyLive || null;
  const focusTimer = options.focusTimer || null;
  const handlers = new Map();

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
  register("v8.settings.open", openRoute("settings", "Réglages"));
  register("v8.spotify.toggle", () => spotifyLive?.command
    ? spotifyLive.command("toggle")
    : unavailable("Le contrôle Spotify n'est pas disponible."));
  register("v8.spotify.next", () => spotifyLive?.command
    ? spotifyLive.command("next")
    : unavailable("Le contrôle Spotify n'est pas disponible."));
  register("v8.spotify.previous", () => spotifyLive?.command
    ? spotifyLive.command("previous")
    : unavailable("Le contrôle Spotify n'est pas disponible."));

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
  register("v8.changelog.open", () => {
    setState({ panel: "changelog", commandOpen: false, missionOpen: false });
    return completed("Notes de version ouvertes");
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
  register("v8.dock.edit.open", () => {
    const editBtn = typeof document !== "undefined" ? document.querySelector("[data-dock-command=edit]") : null;
    if (editBtn) editBtn.click();
    return completed("Éditeur du Dock ouvert");
  });

  function activateSpace(id, label, flow, accent) {
    return () => {
      setState({ space: id, flow, accent, missionOpen: false, panel: null, commandOpen: false });
      notify({ id: `space-${id}`, title: "Space actif", message: `${label} est pret.`, type: "success", sound: false });
      return completed(`Space ${label} active`, { space: id, flow, accent });
    };
  }

  WORKSPACES.forEach(({ id, label, flow, accent, actionId }) => {
    const activate = activateSpace(id, label, flow, accent);
    register(actionId, activate);
    register(`v8.dashboard.${id}`, (context) => {
      const result = activate(context);
      navigate("home");
      return result;
    });
  });

  register("v8.sync.refresh", () => {
    if (!sync?.refresh) return unavailable("La synchronisation Supabase n'est pas disponible.");
    notify({ id: "sync-refresh", title: "Supabase", message: "Vérification de la synchronisation cloud.", type: "sync", duration: 0, sound: false });
    return Promise.resolve(sync.refresh()).then((response) => {
      notify({
        id: "sync-refresh",
        title: "Supabase",
        message: response.ok ? "Données synchronisees avec Supabase." : response.message,
        type: response.ok ? "success" : (response.status === "offline" ? "warning" : "error")
      });
      return response;
    }).catch((error) => {
      const response = failed("La synchronisation Supabase a échoué.", error);
      notify({ id: "sync-refresh", title: "Supabase", message: response.message, type: "error" });
      return response;
    });
  });

  register("v8.theme.toggle", () => {
    const theme = getState().theme === "day" ? "night" : "day";
    setState({ theme });
    notify({ id: "thème-updated", title: "Thème", message: theme === "day" ? "Mode Jour applique" : "Mode Nuit applique", type: "success" });
    return completed("Thème modifié", { theme });
  });
  register("v8.theme.night", () => {
    setState({ theme: "night" });
    return completed("Mode Nuit applique", { theme: "night" });
  });
  register("v8.theme.graphite", () => {
    setState({ theme: "graphite" });
    return completed("Mode Graphite applique", { theme: "graphite" });
  });
  register("v8.theme.day", () => {
    setState({ theme: "day" });
    return completed("Mode Jour applique", { theme: "day" });
  });
  register("v8.theme.auto", () => {
    setState({ theme: "auto" });
    return completed("Mode Automatique applique", { theme: "auto" });
  });
  ["classic", "boreale", "cyberpunk", "eclipse", "emeraude", "minerale"].forEach((auraId) => {
    register(`v8.aura.${auraId}`, () => {
      globalThis.localStorage?.setItem("v8_home_aura", auraId);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.dataset.aura = auraId;
      }
      notify({ id: "aura-updated", title: "Ambiance Aura", message: `Ambiance « ${auraId} » activée.`, type: "success" });
      return completed(`Aura ${auraId} activée`, { aura: auraId });
    });
  });
  ["inter", "outfit", "mono", "serif"].forEach((fontId) => {
    register(`v8.font.${fontId}`, () => {
      globalThis.localStorage?.setItem("v8_font_family", fontId);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.dataset.font = fontId;
      }
      notify({ id: "font-updated", title: "Typographie", message: `Police « ${fontId} » appliquée.`, type: "success" });
      return completed(`Font ${fontId} activée`, { font: fontId });
    });
  });
  ["rounded", "sharp", "soft"].forEach((styleId) => {
    register(`v8.radius.${styleId}`, () => {
      globalThis.localStorage?.setItem("v8_radius_style", styleId);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.dataset.radiusStyle = styleId;
      }
      notify({ id: "radius-updated", title: "Courbure du Design", message: `Style de bordure « ${styleId} » appliqué.`, type: "success" });
      return completed(`Radius ${styleId} activé`, { radiusStyle: styleId });
    });
  });
  ["focus", "intense", "zen", "night"].forEach((modeId) => {
    register(`v8.session.mode.${modeId}`, () => {
      globalThis.localStorage?.setItem("v8_home_session_mode", modeId);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.dataset.sessionMode = modeId;
      }
      notify({ id: "session-updated", title: "Rythme de session", message: `Mode de session « ${modeId} » engagé.`, type: "success" });
      return completed(`Session ${modeId} engagée`, { sessionMode: modeId });
    });
  });
  register("v8.zen.toggle", () => {
    const zen = !getState().zen;
    setState({ zen });
    if (typeof document !== "undefined" && document.documentElement) {
      if (zen) {
        document.documentElement.dataset.v8Zen = "true";
      } else {
        delete document.documentElement.dataset.v8Zen;
      }
    }
    notify({
      id: "zen-toggled",
      title: "Mode Zen",
      message: zen ? "Mode concentration activé (Alt+Z pour quitter)." : "Mode concentration désactivé.",
      type: "info",
      duration: 2500
    });
    return completed("Mode Zen modifié", { zen });
  });
  function setDockScale(valid) {
    setState({ dockScale: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      if (valid && valid !== "normal") {
        document.documentElement.dataset.v8DockScale = valid;
      } else {
        delete document.documentElement.dataset.v8DockScale;
      }
    }
    notify({ id: "dock-scale", title: "Dock", message: `Taille du Dock : ${valid}`, type: "success" });
    return completed("Taille du Dock modifiée", { dockScale: valid });
  }
  register("v8.dock.scale", (scale = "normal") => setDockScale(["compact", "normal", "large"].includes(scale) ? scale : "normal"));
  register("v8.dock.scale.compact", () => setDockScale("compact"));
  register("v8.dock.scale.normal", () => setDockScale("normal"));
  register("v8.dock.scale.large", () => setDockScale("large"));

  function setDockAlign(valid) {
    setState({ dockAlign: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      if (valid && valid !== "center") document.documentElement.dataset.v8DockAlign = valid;
      else delete document.documentElement.dataset.v8DockAlign;
    }
    notify({ id: "dock-align", title: "Dock", message: `Alignement : ${valid === "stretch" ? "Plein Écran" : "Centré"}`, type: "success" });
    return completed("Alignement du Dock modifié", { dockAlign: valid });
  }
  function setDockGlass(valid) {
    setState({ dockGlass: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      if (valid && valid !== "default") document.documentElement.dataset.v8DockGlass = valid;
      else delete document.documentElement.dataset.v8DockGlass;
    }
    notify({ id: "dock-glass", title: "Dock", message: `Verre : ${valid}`, type: "success" });
    return completed("Effet du Dock modifié", { dockGlass: valid });
  }
  function setDockAutoHide(valid) {
    setState({ dockAutoHide: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      if (valid) document.documentElement.dataset.v8DockAutohide = "true";
      else delete document.documentElement.dataset.v8DockAutohide;
    }
    notify({ id: "dock-autohide", title: "Dock", message: `Masquage auto : ${valid ? "Activé" : "Désactivé"}`, type: "success" });
    return completed("Masquage auto modifié", { dockAutoHide: valid });
  }
  function setHomeGrid(valid) {
    setState({ homeGrid: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.v8HomeGrid = valid;
    }
    notify({ id: "home-grid", title: "Accueil", message: `Grille Accueil : ${valid} colonnes`, type: "success" });
    return completed("Grille Accueil modifiée", { homeGrid: valid });
  }
  function setHomeHero(valid) {
    setState({ homeHero: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.v8HomeHero = valid;
    }
    notify({ id: "home-hero", title: "Accueil", message: `Bannière Accueil : ${valid}`, type: "success" });
    return completed("Bannière Accueil modifiée", { homeHero: valid });
  }
  function setDockMagnify(valid) {
    setState({ dockMagnify: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.v8DockMagnify = valid ? "true" : "false";
    }
    notify({ id: "dock-magnify", title: "Dock", message: `Zoom au survol : ${valid ? "Activé" : "Désactivé"}`, type: "success" });
    return completed("Zoom du Dock modifié", { dockMagnify: valid });
  }
  function setUiAnimations(valid) {
    setState({ uiAnimations: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.v8Animations = valid;
    }
    notify({ id: "ui-animations", title: "Interface", message: `Animations : ${valid}`, type: "success" });
    return completed("Animations UI modifiées", { uiAnimations: valid });
  }
  function setUiGlow(valid) {
    setState({ uiGlow: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.v8UiGlow = valid ? "true" : "false";
    }
    notify({ id: "ui-glow", title: "Interface", message: `Aura lumineuse : ${valid ? "Activée" : "Désactivée"}`, type: "success" });
    return completed("Aura lumineuse UI modifiée", { uiGlow: valid });
  }
  function setUiSoundFeedback(valid) {
    setState({ uiSoundFeedback: valid });
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.dataset.v8UiSoundFeedback = valid ? "true" : "false";
    }
    notify({ id: "ui-sound-feedback", title: "Audio", message: `Retours sonores interactifs : ${valid ? "Activés" : "Désactivés"}`, type: "success" });
    return completed("Retours sonores UI modifiés", { uiSoundFeedback: valid });
  }

  register("v8.dock.align.center", () => setDockAlign("center"));
  register("v8.dock.align.stretch", () => setDockAlign("stretch"));
  register("v8.dock.glass.default", () => setDockGlass("default"));
  register("v8.dock.glass.ultra", () => setDockGlass("ultra"));
  register("v8.dock.glass.opaque", () => setDockGlass("opaque"));
  register("v8.dock.autohide.toggle", () => setDockAutoHide(!getState().dockAutoHide));
  register("v8.dock.autohide.on", () => setDockAutoHide(true));
  register("v8.dock.autohide.off", () => setDockAutoHide(false));
  register("v8.dock.magnify.on", () => setDockMagnify(true));
  register("v8.dock.magnify.off", () => setDockMagnify(false));
  register("v8.dock.magnify.toggle", () => setDockMagnify(!getState().dockMagnify));
  register("v8.ui.animations.smooth", () => setUiAnimations("smooth"));
  register("v8.ui.animations.snappy", () => setUiAnimations("snappy"));
  register("v8.ui.animations.reduced", () => setUiAnimations("reduced"));
  register("v8.ui.glow.on", () => setUiGlow(true));
  register("v8.ui.glow.off", () => setUiGlow(false));
  register("v8.ui.glow.toggle", () => setUiGlow(!getState().uiGlow));
  register("v8.ui.sound.feedback.on", () => setUiSoundFeedback(true));
  register("v8.ui.sound.feedback.off", () => setUiSoundFeedback(false));
  register("v8.ui.sound.feedback.toggle", () => setUiSoundFeedback(!getState().uiSoundFeedback));
  register("v8.home.grid.2", () => setHomeGrid("2"));
  register("v8.home.grid.3", () => setHomeGrid("3"));
  register("v8.home.grid.4", () => setHomeGrid("4"));
  register("v8.home.hero.full", () => setHomeHero("full"));
  register("v8.home.hero.compact", () => setHomeHero("compact"));
  register("v8.home.hero.hidden", () => setHomeHero("hidden"));
  register("v8.density.toggle", () => {
    const sequence = ["spacious", "comfortable", "compact", "ultra-compact", "automatic"];
    const current = getState().density;
    const density = sequence[(sequence.indexOf(current) + 1) % sequence.length];
    setState({ density });
    return completed("Densité modifiée", { density });
  });
  DENSITY_MODES.forEach((density) => {
    register(`v8.density.${density}`, () => {
      setState({ density });
      return completed("Densité modifiée", { density });
    });
  });
  register("v8.density.custom.update", (context = {}) => {
    const key = String(context.key || "");
    if (!Object.hasOwn(DENSITY_CUSTOM_RANGES, key)) return unavailable("Ce réglage de densité n'est pas disponible.");
    const current = getState().densitySettings || {};
    setState({ density: "custom", densitySettings: { ...current, custom: { ...(current.custom || {}), [key]: context.value } } });
    return completed("Densité personnalisée mise a jour", { key, value: context.value });
  });
  register("v8.density.focus", () => {
    const current = getState().densitySettings || {};
    const focusDensity = current.focusDensity === false;
    setState({ densitySettings: { ...current, focusDensity } });
    return completed(focusDensity ? "Densité Focus activee" : "Densité Focus desactivee", { focusDensity });
  });
  register("v8.density.spaces", () => {
    const current = getState().densitySettings || {};
    const adaptiveBySpace = current.adaptiveBySpace === false;
    setState({ densitySettings: { ...current, adaptiveBySpace } });
    return completed(adaptiveBySpace ? "Presets par Space actifs" : "Presets par Space desactives", { adaptiveBySpace });
  });

  register("v8.brain.preference", (context = {}) => {
    const path = String(context.path || "");
    if (!/^(?:enabled|assistantName|persona|tone|detail|language|proactive|suggestionFrequency|automationLevel|notifications|sounds|silentInFocus|briefing\.(?:enabled|concise)|provider\.(?:active|model|fallback|privacy)|memory\.(?:enabled|retentionDays|categories\.[a-z-]+)|permissions\.[a-z-]+)$/.test(path)) {
      return unavailable("Cette préférence Brain n'est pas modifiable.");
    }
    const brainPreferences = patchBrainPreferences(getState().brainPreferences, path, context.value);
    setState({ brainPreferences });
    return completed("Préférences Brain mises a jour", { path, value: context.value });
  });
  ["concise", "balanced", "expert", "coach", "creative", "developer", "custom"].forEach((persona) => {
    register(`v8.brain.persona.${persona}`, () => {
      const brainPreferences = patchBrainPreferences(getState().brainPreferences, "persona", persona);
      setState({ brainPreferences });
      return completed("Personnalite Brain mise a jour", { persona });
    });
  });
  register("v8.brain.memory.toggle", () => {
    const enabled = getState().brainPreferences?.memory?.enabled === false;
    setState({ brainPreferences: patchBrainPreferences(getState().brainPreferences, "memory.enabled", enabled) });
    return completed(enabled ? "Memoire Brain activee" : "Memoire Brain desactivee", { enabled });
  });
  register("v8.brain.briefing.toggle", () => {
    const enabled = getState().brainPreferences?.briefing?.enabled === false;
    setState({ brainPreferences: patchBrainPreferences(getState().brainPreferences, "briefing.enabled", enabled) });
    return completed(enabled ? "Briefing Brain active" : "Briefing Brain desactive", { enabled });
  });

  register("v8.automation.create", (context = {}) => {
    const preferences = getState().brainPreferences;
    const id = `auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const rule = sanitizeAutomationRule({ id, enabled: true, trigger: context.trigger, actionId: context.targetActionId }, id);
    const automations = sanitizeAutomationRules([...(preferences.automations || []), rule]);
    setState({ brainPreferences: sanitizeBrainPreferences({ ...preferences, automations }) });
    return completed("Automatisation créée", { id: rule.id });
  });
  register("v8.automation.toggle", (context = {}) => {
    const preferences = getState().brainPreferences;
    const id = String(context.id || "");
    const automations = (preferences.automations || []).map((rule) => rule.id === id ? { ...rule, enabled: !rule.enabled } : rule);
    setState({ brainPreferences: sanitizeBrainPreferences({ ...preferences, automations }) });
    return completed("Automatisation mise a jour", { id });
  });
  register("v8.automation.remove", (context = {}) => {
    const preferences = getState().brainPreferences;
    const id = String(context.id || "");
    const automations = (preferences.automations || []).filter((rule) => rule.id !== id);
    setState({ brainPreferences: sanitizeBrainPreferences({ ...preferences, automations }) });
    return completed("Automatisation supprimée", { id });
  });
  register("v8.automation.run", (context = {}) => {
    const preferences = getState().brainPreferences;
    const rule = (preferences.automations || []).find((entry) => entry.id === String(context.id || ""));
    if (!rule) return unavailable("Automatisation introuvable.");
    return dispatch(rule.actionId);
  });

  register("v8.spotlight.toggle", () => {
    const spotlightEnabled = getState().spotlightEnabled === false;
    setState({ spotlightEnabled });
    return completed(spotlightEnabled ? "Spotlight active" : "Spotlight desactive", { spotlightEnabled });
  });
  register("v8.motion.ambient.toggle", () => {
    const ambientEffectsEnabled = getState().ambientEffectsEnabled === false;
    setState({ ambientEffectsEnabled });
    return completed(ambientEffectsEnabled ? "Effets d'ambiance actives" : "Effets d'ambiance desactives", { ambientEffectsEnabled });
  });
  register("v8.motion.blur.toggle", () => {
    const interfaceBlurEnabled = getState().interfaceBlurEnabled === false;
    setState({ interfaceBlurEnabled });
    return completed(interfaceBlurEnabled ? "Flou d'interface active" : "Flou d'interface desactive", { interfaceBlurEnabled });
  });
  register("v8.activity.live.toggle", (context = {}) => {
    const id = String(context.id || context.element?.dataset.liveCard || "");
    const current = getState().activityLiveLayout;
    const hidden = current.hidden.includes(id) ? current.hidden.filter((entry) => entry !== id) : [...current.hidden, id];
    setState({ activityLiveLayout: { ...current, hidden } });
    return completed(hidden.includes(id) ? "Carte masquee" : "Carte affichee", { id, hidden: hidden.includes(id) });
  });
  register("v8.activity.live.move", (context = {}) => {
    const id = String(context.id || context.element?.dataset.liveCard || "");
    const direction = (context.direction || context.element?.dataset.direction) === "up" ? -1 : 1;
    const current = getState().activityLiveLayout;
    const order = [...current.order];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return unavailable("Deplacement impossible.");
    [order[index], order[target]] = [order[target], order[index]];
    setState({ activityLiveLayout: { ...current, order } });
    return completed("Ordre mis a jour", { order });
  });
  register("v8.home.live.toggle", (context = {}) => {
    const id = String(context.id || context.element?.dataset.liveCard || "");
    const current = getState().homeLiveLayout;
    const hidden = current.hidden.includes(id) ? current.hidden.filter((entry) => entry !== id) : [...current.hidden, id];
    setState({ homeLiveLayout: { ...current, hidden } });
    return completed(hidden.includes(id) ? "Carte masquee" : "Carte affichee", { id, hidden: hidden.includes(id) });
  });
  register("v8.home.live.move", (context = {}) => {
    const id = String(context.id || context.element?.dataset.liveCard || "");
    const direction = (context.direction || context.element?.dataset.direction) === "up" ? -1 : 1;
    const current = getState().homeLiveLayout;
    const order = [...current.order];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return unavailable("Deplacement impossible.");
    [order[index], order[target]] = [order[target], order[index]];
    setState({ homeLiveLayout: { ...current, order } });
    return completed("Ordre mis a jour", { order });
  });

  register("v8.sound.toggle", () => {
    if (!sounds?.setPreferences) return unavailable("Les sons ne sont pas disponibles dans ce contexte.");
    const enabled = sounds.preferences().enabled === false;
    sounds.setPreferences({ enabled });
    if (enabled) void sounds.preview?.();
    return completed(enabled ? "Sons actives" : "Sons desactives", { enabled });
  });
  register("v8.sound.silent", () => {
    if (!sounds?.setPreferences) return unavailable("Les sons ne sont pas disponibles dans ce contexte.");
    const silent = sounds.preferences().silent !== true;
    sounds.setPreferences({ silent });
    if (!silent && sounds.preferences().enabled) void sounds.preview?.();
    return completed(silent ? "Mode Silent active" : "Mode Silent desactive", { silent });
  });
  register("v8.sound.spatial", () => {
    if (!sounds?.setPreferences) return unavailable("Les sons ne sont pas disponibles dans ce contexte.");
    const spatial = sounds.preferences().spatial === false;
    sounds.setPreferences({ spatial });
    if (spatial && sounds.preferences().enabled) void sounds.preview?.();
    return completed(spatial ? "Audio spatial active" : "Audio spatial desactive", { spatial });
  });
  register("v8.sound.preview", () => {
    if (!sounds?.preview) return unavailable("L'apercu sonore n'est pas disponible.");
    void sounds.preview();
    return completed("Apercu sonore lance");
  });
  register("v8.sound.export", () => {
    if (!sounds?.exportWav) return unavailable("L'exportation sonore n'est pas disponible dans ce navigateur.");
    const ok = sounds.exportWav();
    if (!ok) return unavailable("Erreur lors de la génération du fichier WAV.");
    return completed("Téléchargement du pack audio (.wav) démarré");
  });
  register("v8.sound.volume", (context = {}) => {
    if (!sounds?.setPreferences) return unavailable("Les sons ne sont pas disponibles dans ce contexte.");
    const category = String(context.category || "master");
    const value = Math.min(1, Math.max(0, Number(context.value) || 0));
    if (category === "master") sounds.setPreferences({ master: value });
    else sounds.setPreferences({ volumes: { [category]: value } });
    return completed("Volume modifié", { category, value });
  });
  ["ethone", "minimal", "classic", "apple-inspired", "cyber-pulse", "silent"].forEach((pack) => {
    register(`v8.sound.pack.${pack}`, () => {
      if (!sounds?.setPreferences) return unavailable("Les sons ne sont pas disponibles dans ce contexte.");
      sounds.setPreferences({ pack });
      if (pack !== "silent" && sounds.preferences().enabled) void sounds.preview?.(pack);
      return completed("Pack sonore modifié", { pack });
    });
  });

  ["rain", "pink", "drone"].forEach((ambienceType) => {
    register(`v8.ambience.${ambienceType}`, () => {
      if (!sounds?.startAmbience) return unavailable("Le moteur d'ambiance n'est pas disponible.");
      const result = sounds.startAmbience(ambienceType);
      return completed(result === "none" ? "Ambiance arrêtée" : `Ambiance "${ambienceType}" activée`, { ambience: result });
    });
  });
  register("v8.ambience.stop", () => {
    if (!sounds?.stopAmbience) return unavailable("Le moteur d'ambiance n'est pas disponible.");
    sounds.stopAmbience();
    return completed("Ambiance arrêtée");
  });

  // ─── Focus Timer (Pomodoro) ───
  ["pomodoro", "deep", "quick"].forEach((preset) => {
    register(`v8.focus.start.${preset}`, () => {
      if (!focusTimer) return unavailable("Le minuteur focus n'est pas disponible.");
      focusTimer.start(preset);
      const s = focusTimer.getState();
      notify({ id: "focus-started", title: "Focus", message: `Session "${preset}" démarrée — ${focusTimer.formatRemaining()}`, type: "info" });
      return completed("Minuteur focus démarré", s);
    });
  });
  register("v8.focus.pause", () => {
    if (!focusTimer) return unavailable("Le minuteur focus n'est pas disponible.");
    focusTimer.pause();
    return completed("Focus en pause");
  });
  register("v8.focus.resume", () => {
    if (!focusTimer) return unavailable("Le minuteur focus n'est pas disponible.");
    focusTimer.resume();
    return completed("Focus repris");
  });
  register("v8.focus.stop", () => {
    if (!focusTimer) return unavailable("Le minuteur focus n'est pas disponible.");
    focusTimer.stop();
    return completed("Focus arrêté");
  });
  register("v8.focus.skip", () => {
    if (!focusTimer) return unavailable("Le minuteur focus n'est pas disponible.");
    focusTimer.skip();
    const s = focusTimer.getState();
    return completed(s.phase === "idle" ? "Session terminée" : `Phase suivante: ${s.phase}`, s);
  });

  register("v8.locale.cycle", () => {
    if (!setLocale) return unavailable("Le changement de langue n'est pas disponible.");
    const current = getLocale();
    const locale = LOCALES[(LOCALES.indexOf(current) + 1) % LOCALES.length];
    setLocale(locale);
    notify({ id: "locale-updated", title: "Langue", message: locale.toUpperCase(), type: "success" });
    return completed("Langue modifiée", { locale });
  });
  register("v8.locale.set", (context = {}) => {
    if (!setLocale) return unavailable("Le changement de langue n'est pas disponible.");
    const locale = String(context.locale || "").toLowerCase();
    if (!LOCALES.includes(locale)) return unavailable("Cette langue n'est pas disponible.");
    setLocale(locale);
    return completed("Langue modifiée", { locale });
  });

  ["mint", "sky", "amber", "violet", "rose"].forEach((accent) => {
    register(`v8.accent.${accent}`, () => {
      setState({ accent });
      return completed("Accent modifié", { accent });
    });
  });
  register("v8.accent.custom", (context = {}) => {
    const value = String(context.value || "");
    if (!/^#[0-9a-f]{6}$/i.test(value)) return unavailable("Couleur invalide.");
    setState({ accent: "custom", customAccentColor: value.toLowerCase() });
    return completed("Accent personnalisé applique", { accent: "custom", customAccentColor: value.toLowerCase() });
  });

  register("v8.appearance.cycle", () => {
    const accents = ["mint", "sky", "amber", "violet", "rose"];
    const current = getState().accent || accents[0];
    const next = accents[(accents.indexOf(current) + 1) % accents.length];
    setState({ accent: next });
    notify({ id: "accent-updated", title: "Apparence", message: `Accent ${next} applique`, type: "success" });
    return completed("Accent modifié", { accent: next });
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
      if (result && typeof result.then === "function") {
        return Promise.resolve(result).then((value) => {
          const normalized = value && typeof value === "object" ? value : completed("Action terminée", value ?? null);
          try { sounds?.playAction?.(actionId, normalized, context); } catch {}
          if (onActivity) {
            try { onActivity(actionId, normalized, getState()); } catch {}
          }
          return normalized;
        }).catch((error) => {
          const response = failed("L'action n'a pas pu être terminée.", error);
          try { sounds?.playAction?.(actionId, response, context); } catch {}
          notify({ id: `failed-${actionId}`, title: "Action interrompue", message: response.message, type: "error" });
          return response;
        });
      }
      const normalized = result && typeof result === "object" ? result : completed("Action terminée", result ?? null);
      try { sounds?.playAction?.(actionId, normalized, context); } catch {}
      if (onActivity) {
        try { onActivity(actionId, normalized, getState()); } catch {}
      }
      return normalized;
    } catch (error) {
      const result = failed("L'action n'a pas pu être terminée.", error);
      try { sounds?.playAction?.(actionId, result, context); } catch {}
      notify({ id: `failed-${actionId}`, title: "Action interrompue", message: result.message, type: "error" });
      return result;
    }
  }

  function destroy() {
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
