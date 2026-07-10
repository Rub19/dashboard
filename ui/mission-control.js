/* ETHONE Mission Control.
   Lazy, keyboard-first overview of the user's active Personal OS. */
(function initEthoneMissionControl(global) {
  "use strict";

  if (global.ETHONEMissionControl) return;

  var root = null;
  var shell = null;
  var openState = false;
  var selectedMode = "all";
  var searchQuery = "";
  var previousFocus = null;
  var sessionController = null;
  var renderFrame = 0;
  var dragState = null;
  var pendingFocusId = "";

  var SECTION_ORDER = ["spaces", "flows", "windows", "ai", "widgets", "dashboards", "projects"];
  var SECTION_META = {
    spaces: ["Spaces", "Environments", "layers-3"],
    flows: ["Flows", "Contexts", "workflow"],
    windows: ["Open windows", "Window Manager", "app-window"],
    ai: ["ETHONE AI", "Recent sessions", "brain-circuit"],
    widgets: ["Floating widgets", "Dashboard", "panel-top"],
    dashboards: ["Active dashboards", "Layouts", "layout-template"],
    projects: ["Recent projects", "Continue working", "folder-kanban"]
  };

  var WORDS = {
    fr: {
      title: "Votre environnement, en une vue.", subtitle: "Passez d'un Space à un Flow, reprenez une fenêtre ou continuez votre travail sans quitter le contexte.",
      search: "Rechercher Spaces, Flows, fenêtres, sessions IA...", all: "Tout", spaces: "Spaces", flows: "Flows", windows: "Fenêtres", ai: "IA", widgets: "Widgets", dashboards: "Dashboards", projects: "Projets",
      newSpace: "Nouveau Space", newFlow: "Nouveau Flow", close: "Fermer Mission Control", windowClose: "Fermer la fenêtre", active: "Actif", open: "Ouvrir", apply: "Activer", noResults: "Aucun résultat", noResultsCopy: "Essayez un autre terme ou affichez toutes les catégories.",
      emptyWindows: "Aucune fenêtre ouverte", emptyWindowsCopy: "Ouvrez la page actuelle dans le Window Manager quand vous en avez besoin.", openWindow: "Ouvrir une fenêtre",
      emptyAI: "Aucune session récente", emptyAICopy: "Votre prochaine conversation Brain apparaîtra ici.", openAI: "Ouvrir ETHONE AI",
      emptyWidgets: "Aucun widget actif", emptyWidgetsCopy: "Ajoutez les modules utiles à votre dashboard.", openWidgets: "Ajouter un widget",
      emptyDashboards: "Aucun dashboard sauvegardé", emptyDashboardsCopy: "Le dashboard actif apparaîtra ici dès qu'un layout est enregistré.",
      emptyProjects: "Aucun projet récent", emptyProjectsCopy: "Les projets Studio, notes et fichiers liés apparaîtront ici.",
      emptySpaces: "Aucun Space", emptyFlows: "Aucun Flow", createSpace: "Créer un Space", cancel: "Annuler", name: "Nom", description: "Description", template: "Type", accent: "Accent", create: "Créer et ouvrir",
      personal: "Personnel", work: "Travail", development: "Développement", study: "Études", gaming: "Gaming", streaming: "Streaming", creative: "Créatif",
      results: "résultats", keyboard: "Flèches pour naviguer", enter: "Entrée pour ouvrir", escape: "Échap pour fermer", reorder: "Glisser pour réorganiser", move: "Réorganiser",
      minimize: "Réduire", maximize: "Agrandir", pin: "Épingler", windowCount: "fenêtres", spaceCount: "Spaces", flowCount: "Flows", widgetCount: "widgets",
      spaceCreated: "Space créé.", createFailed: "Impossible de créer ce Space.", flowUnavailable: "Le Flow Builder est indisponible.", loading: "Synchronisation du contexte..."
    },
    en: {
      title: "Your environment, in one view.", subtitle: "Move between Spaces and Flows, resume a window, or continue your work without losing context.",
      search: "Search Spaces, Flows, windows, AI sessions...", all: "All", spaces: "Spaces", flows: "Flows", windows: "Windows", ai: "AI", widgets: "Widgets", dashboards: "Dashboards", projects: "Projects",
      newSpace: "New Space", newFlow: "New Flow", close: "Close Mission Control", windowClose: "Close window", active: "Active", open: "Open", apply: "Activate", noResults: "No results", noResultsCopy: "Try another term or show every category.",
      emptyWindows: "No open windows", emptyWindowsCopy: "Open the current page in Window Manager when you need it.", openWindow: "Open a window",
      emptyAI: "No recent sessions", emptyAICopy: "Your next Brain conversation will appear here.", openAI: "Open ETHONE AI",
      emptyWidgets: "No active widgets", emptyWidgetsCopy: "Add the useful modules to your dashboard.", openWidgets: "Add a widget",
      emptyDashboards: "No saved dashboards", emptyDashboardsCopy: "Your active dashboard will appear once a layout is saved.",
      emptyProjects: "No recent projects", emptyProjectsCopy: "Studio projects, linked notes, and files will appear here.",
      emptySpaces: "No Spaces", emptyFlows: "No Flows", createSpace: "Create a Space", cancel: "Cancel", name: "Name", description: "Description", template: "Type", accent: "Accent", create: "Create and open",
      personal: "Personal", work: "Work", development: "Development", study: "Study", gaming: "Gaming", streaming: "Streaming", creative: "Creative",
      results: "results", keyboard: "Arrows to navigate", enter: "Enter to open", escape: "Escape to close", reorder: "Drag to reorder", move: "Reorder",
      minimize: "Minimize", maximize: "Maximize", pin: "Pin", windowCount: "windows", spaceCount: "Spaces", flowCount: "Flows", widgetCount: "widgets",
      spaceCreated: "Space created.", createFailed: "This Space could not be created.", flowUnavailable: "Flow Builder is unavailable.", loading: "Syncing context..."
    }
  };

  function locale() {
    var value = String(global._lang || document.documentElement.lang || "en").toLowerCase().slice(0, 2);
    return value === "fr" ? "fr" : "en";
  }

  function tr(key) {
    return WORDS[locale()][key] || WORDS.en[key] || key;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function iconName(value) {
    value = String(value || "circle").toLowerCase();
    return /^[a-z0-9-]+$/.test(value) ? value : "circle";
  }

  function icon(name) {
    return '<i data-lucide="' + iconName(name) + '" aria-hidden="true"></i>';
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function model() {
    return global.ETHONEMissionControlModel || (global.Ethone && global.Ethone.get && global.Ethone.get("missionControlModel")) || null;
  }

  function notify(message, type) {
    if (typeof global.toast === "function") {
      try { global.toast(message, type || "info"); return; } catch (error) {}
    }
    if (type === "error") console.warn("[ETHONE Mission Control]", message);
  }

  function renderIcons(scope) {
    try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons({ attrs: { "stroke-width": 1.8 }, nameAttr: "data-lucide", icons: global.lucide.icons, root: scope || root }); }
    catch (error) {
      try { if (global.lucide && !global.__lucideFailed) global.lucide.createIcons(); } catch (ignored) {}
    }
  }

  function isTypingTarget(target) {
    if (!target) return false;
    var tag = String(target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }

  function isAppVisible() {
    var main = qs("#main-content");
    if (!main) return false;
    function hidden(element) {
      if (!element) return true;
      var style = getComputedStyle(element);
      return style.display === "none" || style.visibility === "hidden";
    }
    return !hidden(main) && hidden(qs("#auth-screen")) && hidden(qs("#profile-screen")) && hidden(qs("#password-screen"));
  }

  function runAction(id, context) {
    if (!id) return false;
    var payload = Object.assign({ source: "mission-control" }, context || {});
    try {
      var registry = global.ETHONEActions || global.ACTION_REGISTRY || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
      if (registry && typeof registry.dispatch === "function") return registry.dispatch(id, payload) !== false;
      if (registry && typeof registry.run === "function") return registry.run(id, payload) !== false;
      if (typeof global.runAction === "function") return global.runAction(id, payload) !== false;
    } catch (error) {
      console.warn("[ETHONE Mission Control] action failed", id, error);
    }
    return false;
  }

  function openPage(page, context) {
    close();
    if (!runAction(page + ".open", Object.assign({ page: page }, context || {})) && typeof global.switchPage === "function") {
      try { global.switchPage(page, null); return true; } catch (error) {}
    }
    return true;
  }

  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.createElement("div");
    root.id = "ethone-mission-control";
    root.className = "ethone-mission-control";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="emc-backdrop" data-emc-close></div>' +
      '<section class="emc-shell" role="dialog" aria-modal="true" aria-labelledby="emc-title" tabindex="-1"></section>' +
      '<div class="emc-create-layer" aria-hidden="true"></div>';
    document.body.appendChild(root);
    shell = qs(".emc-shell", root);
    root.addEventListener("click", onClick);
    root.addEventListener("input", onInput);
    root.addEventListener("submit", onSubmit);
    root.addEventListener("keydown", onKeydown);
    root.addEventListener("dragstart", onDragStart);
    root.addEventListener("dragover", onDragOver);
    root.addEventListener("drop", onDrop);
    root.addEventListener("dragend", clearDragState);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerCancel);
    return root;
  }

  function modeButtons() {
    return ["all"].concat(SECTION_ORDER).map(function (mode) {
      var label = tr(mode);
      var meta = SECTION_META[mode];
      var modeIcon = mode === "all" ? "layout-grid" : meta[2];
      return '<button type="button" class="emc-mode' + (selectedMode === mode ? " is-active" : "") + '" data-emc-mode="' + mode + '" data-emc-focusable aria-pressed="' + (selectedMode === mode ? "true" : "false") + '">' + icon(modeIcon) + '<span>' + esc(label) + '</span></button>';
    }).join("");
  }

  function headerHTML(data) {
    var counts = data.counts || {};
    return '<header class="emc-header">' +
      '<div class="emc-brand-mark">' + icon("orbit") + '</div>' +
      '<div class="emc-heading"><span class="emc-kicker">ETHONE · MISSION CONTROL</span><h1 id="emc-title">' + esc(tr("title")) + '</h1><p>' + esc(tr("subtitle")) + '</p></div>' +
      '<div class="emc-header-actions">' +
        '<button type="button" class="emc-button emc-button-secondary" data-emc-create="space" data-emc-focusable>' + icon("layers-3") + '<span>' + esc(tr("newSpace")) + '</span></button>' +
        '<button type="button" class="emc-button emc-button-primary" data-emc-create="flow" data-emc-focusable>' + icon("workflow") + '<span>' + esc(tr("newFlow")) + '</span></button>' +
        '<button type="button" class="emc-icon-button" data-emc-close data-emc-focusable aria-label="' + esc(tr("close")) + '" title="' + esc(tr("close")) + '">' + icon("x") + '</button>' +
      '</div>' +
      '<div class="emc-command-row">' +
        '<label class="emc-search" for="emc-search">' + icon("search") + '<input id="emc-search" type="search" spellcheck="false" autocomplete="off" placeholder="' + esc(tr("search")) + '" value="' + esc(searchQuery) + '"><kbd>⌘ K</kbd></label>' +
        '<div class="emc-vitals" aria-label="Mission Control summary">' +
          summaryChip("layers-3", counts.spaces || 0, tr("spaceCount")) +
          summaryChip("workflow", counts.flows || 0, tr("flowCount")) +
          summaryChip("app-window", counts.windows || 0, tr("windowCount")) +
          summaryChip("panel-top", counts.widgets || 0, tr("widgetCount")) +
        '</div>' +
      '</div>' +
      '<div class="emc-filter-row"><nav class="emc-modes" aria-label="Mission Control filters">' + modeButtons() + '</nav><span class="emc-result-count" aria-live="polite">' + esc(data.total + " " + tr("results")) + '</span></div>' +
    '</header>';
  }

  function summaryChip(iconId, value, label) {
    return '<span class="emc-vital">' + icon(iconId) + '<strong>' + esc(value) + '</strong><span>' + esc(label) + '</span></span>';
  }

  function dragAttrs(section, item) {
    return ' draggable="true" data-emc-drag-item="' + esc(item.id) + '" data-emc-drag-section="' + section + '"';
  }

  function activeBadge(item) {
    return item.active ? '<span class="emc-status-badge">' + icon("check") + esc(tr("active")) + '</span>' : "";
  }

  function environmentCard(item, section) {
    return '<article class="emc-environment-card' + (item.active ? " is-active" : "") + '" style="--emc-item-accent:' + esc(item.accent || "var(--accent)") + '"' + dragAttrs(section, item) + '>' +
      '<span class="emc-drag-grip" aria-hidden="true">' + icon("grip-vertical") + '</span>' +
      '<button type="button" class="emc-card-primary" data-emc-item="' + esc(item.id) + '" data-emc-item-type="' + section + '" data-emc-focusable aria-label="' + esc(tr("apply") + " " + item.title) + '">' +
        '<span class="emc-environment-icon">' + icon(item.icon) + '</span>' +
        '<span class="emc-card-copy"><strong>' + esc(item.title) + '</strong><small>' + esc(item.subtitle) + '</small></span>' +
        activeBadge(item) + '<span class="emc-card-arrow">' + icon("arrow-up-right") + '</span>' +
      '</button>' +
    '</article>';
  }

  function windowCard(item) {
    return '<article class="emc-window-card' + (item.active ? " is-active" : "") + (item.minimized ? " is-minimized" : "") + '"' + dragAttrs("windows", item) + '>' +
      '<div class="emc-window-chrome"><span class="emc-window-dots"><i></i><i></i><i></i></span><span>' + esc(item.title) + '</span><span>' + icon(item.pinned ? "pin" : "minus") + '</span></div>' +
      '<button type="button" class="emc-window-preview" data-emc-item="' + esc(item.id) + '" data-emc-item-type="windows" data-emc-focusable>' +
        '<span class="emc-window-app-icon">' + icon(item.icon) + '</span><span class="emc-window-lines"><i></i><i></i><i></i></span>' +
        '<span class="emc-window-title"><strong>' + esc(item.title) + '</strong><small>' + esc(item.subtitle) + ' · ' + esc(item.screen) + '</small></span>' +
      '</button>' +
      '<div class="emc-window-actions" role="group" aria-label="' + esc(item.title) + '">' +
        iconAction("minus", tr("minimize"), "minimize", item.id) +
        iconAction("maximize-2", tr("maximize"), "maximize", item.id) +
        iconAction("pin", tr("pin"), "pin", item.id) +
        iconAction("x", tr("windowClose"), "close", item.id) +
      '</div>' +
    '</article>';
  }

  function iconAction(iconId, label, action, id) {
    return '<button type="button" class="emc-window-action" data-emc-window-action="' + action + '" data-emc-window-id="' + esc(id) + '" data-emc-focusable aria-label="' + esc(label) + '" title="' + esc(label) + '">' + icon(iconId) + '</button>';
  }

  function compactCard(item, section) {
    var meta = [];
    if (section === "ai" && item.provider) meta.push(item.provider);
    if (section === "widgets" && item.locked) meta.push("Locked");
    if (item.active) meta.push(tr("active"));
    var subtitle = meta.length ? meta.join(" · ") : item.subtitle;
    return '<article class="emc-compact-card' + (item.active ? " is-active" : "") + '"' + dragAttrs(section, item) + '>' +
      '<span class="emc-drag-grip" aria-hidden="true">' + icon("grip-vertical") + '</span>' +
      '<button type="button" class="emc-card-primary" data-emc-item="' + esc(item.id) + '" data-emc-item-type="' + section + '" data-emc-focusable>' +
        '<span class="emc-compact-icon">' + icon(item.icon) + '</span>' +
        '<span class="emc-card-copy"><strong>' + esc(item.title) + '</strong><small>' + esc(subtitle) + '</small></span>' +
        '<span class="emc-card-arrow">' + icon("chevron-right") + '</span>' +
      '</button>' +
    '</article>';
  }

  function sectionEmpty(section) {
    var values = {
      spaces: ["layers-3", tr("emptySpaces"), "", tr("newSpace"), "space"],
      flows: ["workflow", tr("emptyFlows"), "", tr("newFlow"), "flow"],
      windows: ["app-window", tr("emptyWindows"), tr("emptyWindowsCopy"), tr("openWindow"), "window"],
      ai: ["messages-square", tr("emptyAI"), tr("emptyAICopy"), tr("openAI"), "ai"],
      widgets: ["panel-top", tr("emptyWidgets"), tr("emptyWidgetsCopy"), tr("openWidgets"), "widgets"],
      dashboards: ["layout-template", tr("emptyDashboards"), tr("emptyDashboardsCopy"), "", ""],
      projects: ["folder-kanban", tr("emptyProjects"), tr("emptyProjectsCopy"), "", ""]
    };
    var item = values[section];
    return '<div class="emc-empty">' +
      '<span>' + icon(item[0]) + '</span><div><strong>' + esc(item[1]) + '</strong>' + (item[2] ? '<p>' + esc(item[2]) + '</p>' : "") + '</div>' +
      (item[3] ? '<button type="button" class="emc-button emc-button-secondary" data-emc-empty-action="' + item[4] + '" data-emc-focusable>' + esc(item[3]) + '</button>' : "") +
    '</div>';
  }

  function sectionHTML(section, items) {
    var meta = SECTION_META[section];
    var cardRenderer = section === "spaces" || section === "flows" ? function (item) { return environmentCard(item, section); } : section === "windows" ? windowCard : function (item) { return compactCard(item, section); };
    var layoutClass = section === "spaces" || section === "flows" ? "emc-environment-grid" : section === "windows" ? "emc-windows-grid" : "emc-compact-grid";
    return '<section class="emc-section emc-section-' + section + '" data-emc-section="' + section + '">' +
      '<header class="emc-section-header"><span class="emc-section-icon">' + icon(meta[2]) + '</span><div><span>' + esc(meta[1]) + '</span><h2>' + esc(meta[0]) + '</h2></div><span class="emc-section-count">' + esc(items.length) + '</span><span class="emc-section-drag-hint">' + icon("grip") + esc(tr("reorder")) + '</span></header>' +
      (items.length ? '<div class="' + layoutClass + '" data-emc-dropzone="' + section + '">' + items.map(cardRenderer).join("") + '</div>' : sectionEmpty(section)) +
    '</section>';
  }

  function contentHTML(data) {
    var visibleSections = selectedMode === "all" ? SECTION_ORDER : [selectedMode];
    if (searchQuery) visibleSections = visibleSections.filter(function (section) { return data[section] && data[section].length; });
    var hasAny = visibleSections.some(function (section) { return data[section] && data[section].length; });
    if (searchQuery && !hasAny) {
      return '<div class="emc-no-results">' + icon("search-x") + '<strong>' + esc(tr("noResults")) + '</strong><p>' + esc(tr("noResultsCopy")) + '</p><button type="button" class="emc-button emc-button-secondary" data-emc-clear-search data-emc-focusable>' + esc(tr("all")) + '</button></div>';
    }
    return visibleSections.map(function (section) { return sectionHTML(section, data[section] || []); }).join("");
  }

  function footerHTML() {
    return '<footer class="emc-footer">' +
      '<span>' + icon("move") + esc(tr("keyboard")) + '</span><span><kbd>↵</kbd>' + esc(tr("enter")) + '</span><span><kbd>Esc</kbd>' + esc(tr("escape")) + '</span><span>' + icon("grip-vertical") + esc(tr("reorder")) + '</span>' +
    '</footer>';
  }

  function render() {
    var dataModel = model();
    if (!shell || !dataModel) return;
    var activeElement = document.activeElement;
    var focusedSearch = activeElement && activeElement.id === "emc-search";
    var focusedItemId = activeElement && activeElement.dataset ? activeElement.dataset.emcItem || "" : "";
    var focusedMode = activeElement && activeElement.dataset ? activeElement.dataset.emcMode || "" : "";
    var selectionStart = focusedSearch ? activeElement.selectionStart : null;
    var data = dataModel.snapshot(searchQuery);
    shell.innerHTML = headerHTML(data) + '<main class="emc-scroll"><div class="emc-canvas">' + contentHTML(data) + '</div>' + footerHTML() + '</main>';
    renderIcons(shell);
    if (focusedSearch) {
      var search = qs("#emc-search", shell);
      if (search) {
        try { search.focus({ preventScroll: true }); search.setSelectionRange(selectionStart == null ? search.value.length : selectionStart, selectionStart == null ? search.value.length : selectionStart); } catch (error) {}
      }
    }
    if (!focusedSearch && (pendingFocusId || focusedItemId)) {
      var pending = qs('[data-emc-item="' + cssEscape(pendingFocusId || focusedItemId) + '"]', shell);
      pendingFocusId = "";
      if (pending) try { pending.focus({ preventScroll: true }); } catch (error) {}
    } else if (!focusedSearch && focusedMode) {
      var mode = qs('[data-emc-mode="' + cssEscape(focusedMode) + '"]', shell);
      if (mode) try { mode.focus({ preventScroll: true }); } catch (error) {}
    }
  }

  function scheduleRender() {
    if (!openState) return;
    if (renderFrame) global.cancelAnimationFrame(renderFrame);
    renderFrame = global.requestAnimationFrame(function () {
      renderFrame = 0;
      render();
    });
  }

  function cssEscape(value) {
    if (global.CSS && typeof global.CSS.escape === "function") return global.CSS.escape(String(value));
    return String(value || "").replace(/["\\#.;,[\]>+~*^$|=]/g, "\\$&");
  }

  function showSpaceDialog() {
    var layer = qs(".emc-create-layer", root);
    if (!layer) return;
    layer.innerHTML = '<div class="emc-create-scrim" data-emc-create-cancel></div>' +
      '<form class="emc-create-dialog" id="emc-space-form" aria-labelledby="emc-create-title">' +
        '<header><span>' + icon("layers-3") + '</span><div><small>ETHONE SPACE</small><h2 id="emc-create-title">' + esc(tr("createSpace")) + '</h2></div><button type="button" class="emc-icon-button" data-emc-create-cancel aria-label="' + esc(tr("cancel")) + '">' + icon("x") + '</button></header>' +
        '<div class="emc-create-fields">' +
          '<label><span>' + esc(tr("name")) + '</span><input id="emc-space-name" name="name" maxlength="48" required autocomplete="off" placeholder="' + esc(tr("personal")) + '"></label>' +
          '<label><span>' + esc(tr("template")) + '</span><select name="template"><option value="personal">' + esc(tr("personal")) + '</option><option value="work">' + esc(tr("work")) + '</option><option value="development">' + esc(tr("development")) + '</option><option value="study">' + esc(tr("study")) + '</option><option value="gaming">' + esc(tr("gaming")) + '</option><option value="streaming">' + esc(tr("streaming")) + '</option><option value="creative">' + esc(tr("creative")) + '</option></select></label>' +
          '<label class="emc-create-wide"><span>' + esc(tr("description")) + '</span><input name="description" maxlength="120" autocomplete="off"></label>' +
          '<label class="emc-color-field"><span>' + esc(tr("accent")) + '</span><input name="accent" type="color" value="#8b5cf6"><output>#8B5CF6</output></label>' +
        '</div>' +
        '<footer><button type="button" class="emc-button emc-button-secondary" data-emc-create-cancel>' + esc(tr("cancel")) + '</button><button type="submit" class="emc-button emc-button-primary">' + icon("plus") + esc(tr("create")) + '</button></footer>' +
      '</form>';
    layer.classList.add("is-open");
    layer.setAttribute("aria-hidden", "false");
    renderIcons(layer);
    var name = qs("#emc-space-name", layer);
    if (name) global.requestAnimationFrame(function () { try { name.focus(); } catch (error) {} });
  }

  function hideSpaceDialog() {
    var layer = qs(".emc-create-layer", root);
    if (!layer) return;
    layer.classList.remove("is-open");
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = "";
  }

  function openFlowBuilder() {
    var dataModel = model();
    close();
    if (!dataModel || typeof dataModel.openFlowBuilder !== "function") {
      notify(tr("flowUnavailable"), "warning");
      return;
    }
    dataModel.openFlowBuilder().then(function (opened) {
      if (!opened) notify(tr("flowUnavailable"), "warning");
    });
  }

  function handlePrimaryItem(button) {
    var type = button.dataset.emcItemType;
    var id = button.dataset.emcItem;
    var dataModel = model();
    if (!dataModel) return;
    if (type === "spaces") {
      dataModel.activateSpace(id);
      close();
      return;
    }
    if (type === "flows") {
      close();
      if (!dataModel.activateFlow(id)) dataModel.hydrate().then(function () { dataModel.activateFlow(id); });
      return;
    }
    if (type === "windows") {
      focusWindow(id);
      close();
      return;
    }
    if (type === "ai") { openPage("ai", { sessionId: id }); return; }
    if (type === "widgets") {
      close();
      runAction("widgets.open", { widgetType: id });
      return;
    }
    if (type === "dashboards") {
      dataModel.activateDashboard(id);
      close();
      openPage("dashboard");
      return;
    }
    if (type === "projects") {
      var project = dataModel.getProjects().find(function (entry) { return entry.id === id; });
      openPage(project && project.page || "notes", { projectId: id });
    }
  }

  function focusWindow(id) {
    var target = qs('[data-de-window="' + cssEscape(id) + '"]');
    if (target) {
      try { target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); } catch (error) { target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })); }
      return true;
    }
    var dataModel = model();
    var item = dataModel && dataModel.getWindows().find(function (windowItem) { return windowItem.id === id; });
    if (item) openPage(item.page);
    return !!item;
  }

  function windowAction(id, action) {
    focusWindow(id);
    var desktop = global.ETHONEDesktop;
    if (!desktop) return;
    var methods = { minimize: "minimizeActive", maximize: "maximizeActive", pin: "pinActive", close: "closeActive" };
    var method = methods[action];
    if (method && typeof desktop[method] === "function") desktop[method]();
    scheduleRender();
  }

  function onClick(event) {
    var target = event.target;
    if (target.closest("[data-emc-close]")) { event.preventDefault(); close(); return; }
    if (target.closest("[data-emc-create-cancel]")) { hideSpaceDialog(); return; }
    var clear = target.closest("[data-emc-clear-search]");
    if (clear) { searchQuery = ""; selectedMode = "all"; render(); var input = qs("#emc-search", root); if (input) input.focus(); return; }
    var mode = target.closest("[data-emc-mode]");
    if (mode) { selectedMode = mode.dataset.emcMode || "all"; render(); return; }
    var create = target.closest("[data-emc-create]");
    if (create) { create.dataset.emcCreate === "space" ? showSpaceDialog() : openFlowBuilder(); return; }
    var item = target.closest("[data-emc-item]");
    if (item) { handlePrimaryItem(item); return; }
    var windowButton = target.closest("[data-emc-window-action]");
    if (windowButton) { windowAction(windowButton.dataset.emcWindowId, windowButton.dataset.emcWindowAction); return; }
    var emptyAction = target.closest("[data-emc-empty-action]");
    if (!emptyAction) return;
    var action = emptyAction.dataset.emcEmptyAction;
    if (action === "space") showSpaceDialog();
    else if (action === "flow") openFlowBuilder();
    else if (action === "window") { close(); if (global.ETHONEWindowManager) global.ETHONEWindowManager.openCurrent(); }
    else if (action === "ai") openPage("ai");
    else if (action === "widgets") { close(); runAction("widgets.open"); }
  }

  function onInput(event) {
    if (event.target.id === "emc-search") {
      searchQuery = event.target.value || "";
      scheduleRender();
      return;
    }
    if (event.target.name === "accent") {
      var output = event.target.parentElement && event.target.parentElement.querySelector("output");
      if (output) output.textContent = String(event.target.value || "").toUpperCase();
    }
  }

  function onSubmit(event) {
    if (!event.target || event.target.id !== "emc-space-form") return;
    event.preventDefault();
    var form = event.target;
    var dataModel = model();
    var values = {
      name: form.elements.name.value,
      description: form.elements.description.value,
      template: form.elements.template.value,
      accent: form.elements.accent.value
    };
    var created = dataModel && dataModel.createSpace(values);
    if (!created) { notify(tr("createFailed"), "error"); return; }
    hideSpaceDialog();
    notify(tr("spaceCreated"), "success");
    render();
  }

  function visibleFocusable() {
    return qsa('[data-emc-focusable],#emc-search,.emc-create-dialog input,.emc-create-dialog select,.emc-create-dialog button', root).filter(function (element) {
      return !element.disabled && element.offsetParent !== null && element.getAttribute("aria-hidden") !== "true";
    });
  }

  function trapFocus(event) {
    if (event.key !== "Tab") return false;
    var focusable = visibleFocusable();
    if (!focusable.length) return false;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  function moveFocus(event) {
    var keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"];
    if (keys.indexOf(event.key) === -1 || isTypingTarget(event.target)) return false;
    var focusable = qsa("[data-emc-focusable]", shell).filter(function (element) { return element.offsetParent !== null && !element.disabled; });
    if (!focusable.length) return false;
    var index = focusable.indexOf(document.activeElement);
    if (event.key === "Home") index = 0;
    else if (event.key === "End") index = focusable.length - 1;
    else index = Math.max(0, Math.min(focusable.length - 1, index + (event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1)));
    event.preventDefault();
    focusable[index].focus({ preventScroll: true });
    focusable[index].scrollIntoView({ block: "nearest", inline: "nearest" });
    return true;
  }

  function reorderFromKeyboard(event) {
    if (!event.altKey || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].indexOf(event.key) === -1) return false;
    var item = event.target.closest("[data-emc-drag-item]");
    if (!item) return false;
    var section = item.dataset.emcDragSection;
    var items = qsa('[data-emc-drag-item][data-emc-drag-section="' + cssEscape(section) + '"]', shell);
    var index = items.indexOf(item);
    var direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    var target = items[index + direction];
    if (!target) return false;
    event.preventDefault();
    var ids = items.map(function (entry) { return entry.dataset.emcDragItem; });
    pendingFocusId = item.dataset.emcDragItem;
    model().reorder(section, item.dataset.emcDragItem, target.dataset.emcDragItem, ids);
    render();
    return true;
  }

  function onKeydown(event) {
    if (!openState) return;
    if (event.key === "Escape") {
      event.preventDefault();
      var dialog = qs(".emc-create-layer.is-open", root);
      if (dialog) hideSpaceDialog(); else close();
      return;
    }
    if (trapFocus(event)) return;
    if (event.target.id === "emc-search" && event.key === "ArrowDown") {
      var firstResult = qs(".emc-canvas [data-emc-focusable]", shell);
      if (firstResult) { event.preventDefault(); firstResult.focus(); }
      return;
    }
    if (!isTypingTarget(event.target) && event.key === "/") {
      event.preventDefault();
      var search = qs("#emc-search", shell);
      if (search) search.focus();
      return;
    }
    if (reorderFromKeyboard(event)) return;
    moveFocus(event);
  }

  function onDragStart(event) {
    var item = event.target.closest("[data-emc-drag-item]");
    if (!item) return;
    dragState = { id: item.dataset.emcDragItem, section: item.dataset.emcDragSection, mode: "native", dropId: "" };
    item.classList.add("is-dragging");
    root.classList.add("is-reordering");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragState.section + ":" + dragState.id);
    }
  }

  function onDragOver(event) {
    if (!dragState) return;
    var target = event.target.closest("[data-emc-drag-item]");
    if (!target || target.dataset.emcDragSection !== dragState.section || target.dataset.emcDragItem === dragState.id) return;
    event.preventDefault();
    qsa(".is-drop-target", root).forEach(function (entry) { entry.classList.remove("is-drop-target"); });
    target.classList.add("is-drop-target");
    dragState.dropId = target.dataset.emcDragItem;
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  }

  function onDrop(event) {
    if (!dragState) return;
    var target = event.target.closest("[data-emc-drag-item]");
    if (!target || target.dataset.emcDragSection !== dragState.section) { clearDragState(); return; }
    event.preventDefault();
    var items = qsa('[data-emc-drag-item][data-emc-drag-section="' + cssEscape(dragState.section) + '"]', shell);
    var ids = items.map(function (entry) { return entry.dataset.emcDragItem; });
    pendingFocusId = dragState.id;
    model().reorder(dragState.section, dragState.id, target.dataset.emcDragItem, ids);
    clearDragState();
    render();
  }

  function pointerTarget(event) {
    var hit = document.elementFromPoint(event.clientX, event.clientY);
    return hit && hit.closest ? hit.closest("[data-emc-drag-item]") : null;
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    var grip = event.target.closest && event.target.closest(".emc-drag-grip");
    var item = grip && grip.closest("[data-emc-drag-item]");
    if (!item) return;
    event.preventDefault();
    dragState = {
      id: item.dataset.emcDragItem,
      section: item.dataset.emcDragSection,
      mode: "pointer",
      pointerId: event.pointerId,
      dropId: ""
    };
    item.classList.add("is-dragging");
    root.classList.add("is-reordering");
    try { root.setPointerCapture(event.pointerId); } catch (error) {}
  }

  function onPointerMove(event) {
    if (!dragState || dragState.mode !== "pointer" || dragState.pointerId !== event.pointerId) return;
    var target = pointerTarget(event);
    qsa(".is-drop-target", root).forEach(function (entry) { entry.classList.remove("is-drop-target"); });
    if (!target || target.dataset.emcDragSection !== dragState.section || target.dataset.emcDragItem === dragState.id) {
      dragState.dropId = "";
      return;
    }
    event.preventDefault();
    dragState.dropId = target.dataset.emcDragItem;
    target.classList.add("is-drop-target");
  }

  function onPointerUp(event) {
    if (!dragState || dragState.mode !== "pointer" || dragState.pointerId !== event.pointerId) return;
    var activeDrag = Object.assign({}, dragState);
    var target = pointerTarget(event);
    var targetId = target && target.dataset.emcDragSection === activeDrag.section ? target.dataset.emcDragItem : activeDrag.dropId;
    var items = qsa('[data-emc-drag-item][data-emc-drag-section="' + cssEscape(activeDrag.section) + '"]', shell);
    var ids = items.map(function (entry) { return entry.dataset.emcDragItem; });
    try { root.releasePointerCapture(event.pointerId); } catch (error) {}
    clearDragState();
    if (!targetId || targetId === activeDrag.id) return;
    pendingFocusId = activeDrag.id;
    model().reorder(activeDrag.section, activeDrag.id, targetId, ids);
    render();
  }

  function onPointerCancel(event) {
    if (!dragState || dragState.mode !== "pointer" || dragState.pointerId !== event.pointerId) return;
    clearDragState();
  }

  function clearDragState() {
    if (!root) return;
    qsa(".is-dragging,.is-drop-target", root).forEach(function (entry) { entry.classList.remove("is-dragging", "is-drop-target"); });
    root.classList.remove("is-reordering");
    dragState = null;
  }

  function bindOpenSession() {
    if (sessionController) sessionController.abort();
    sessionController = typeof AbortController === "function" ? new AbortController() : null;
    var options = sessionController ? { signal: sessionController.signal } : false;
    ["ethone:workspace-change", "ethone:space-change", "ethone:space-update", "ethone:flow-change", "ethone:dashboard-layout-change", "ethone:page-ready", "ethone:profile-changed"].forEach(function (name) {
      global.addEventListener(name, scheduleRender, options);
    });
  }

  function unbindOpenSession() {
    if (sessionController) sessionController.abort();
    sessionController = null;
  }

  function open() {
    if (!isAppVisible()) return false;
    ensureRoot();
    if (openState) {
      var currentSearch = qs("#emc-search", root);
      if (currentSearch) currentSearch.focus({ preventScroll: true });
      return true;
    }
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    openState = true;
    searchQuery = "";
    selectedMode = "all";
    render();
    bindOpenSession();
    root.setAttribute("aria-hidden", "false");
    document.body.classList.add("ethone-mission-control-open");
    global.requestAnimationFrame(function () {
      if (!openState) return;
      root.classList.add("open");
      var search = qs("#emc-search", root);
      if (search) search.focus({ preventScroll: true });
    });
    var dataModel = model();
    if (dataModel && typeof dataModel.hydrate === "function") dataModel.hydrate().then(scheduleRender);
    return true;
  }

  function close() {
    if (!root || !openState) return false;
    openState = false;
    hideSpaceDialog();
    unbindOpenSession();
    if (renderFrame) global.cancelAnimationFrame(renderFrame);
    renderFrame = 0;
    clearDragState();
    root.classList.remove("open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ethone-mission-control-open");
    var restore = previousFocus;
    previousFocus = null;
    global.setTimeout(function () {
      if (!openState && restore && restore.isConnected) {
        try { restore.focus({ preventScroll: true }); } catch (error) {}
      }
    }, 180);
    return true;
  }

  function toggle() {
    return openState ? close() : open();
  }

  function destroy() {
    close();
    if (!root) return;
    root.removeEventListener("click", onClick);
    root.removeEventListener("input", onInput);
    root.removeEventListener("submit", onSubmit);
    root.removeEventListener("keydown", onKeydown);
    root.removeEventListener("dragstart", onDragStart);
    root.removeEventListener("dragover", onDragOver);
    root.removeEventListener("drop", onDrop);
    root.removeEventListener("dragend", clearDragState);
    root.removeEventListener("pointerdown", onPointerDown);
    root.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerup", onPointerUp);
    root.removeEventListener("pointercancel", onPointerCancel);
    root.remove();
    root = null;
    shell = null;
  }

  function registerActions() {
    var actions = global.ETHONEActions || global.ACTION_REGISTRY || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
    if (!actions || typeof actions.register !== "function") return false;
    function register(id, label, handler) {
      try {
        if (typeof actions.has === "function" && actions.has(id)) return;
        actions.register(id, { label: label, handler: handler });
      } catch (error) {}
    }
    register("missionControl.open", "Mission Control", open);
    register("mission.open", "Mission Control", open);
    register("missionControl.close", "Close Mission Control", close);
    return true;
  }

  var api = {
    open: open,
    close: close,
    toggle: toggle,
    refresh: scheduleRender,
    destroy: destroy,
    isOpen: function () { return openState; }
  };

  global.ETHONEMissionControl = api;
  global.openMissionControl = open;
  global.closeMissionControl = close;

  function boot() {
    registerActions();
    global.setTimeout(registerActions, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
