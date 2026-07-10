/* ETHONE Brain Everywhere.
   Lightweight contextual Brain surface available on every app page.
   It uses ETHONEOSContext and only lazy-loads AI modules after user intent. */
(function initBrainEverywhere(global) {
  "use strict";

  if (!global || global.__ethoneBrainEverywhere) return;
  global.__ethoneBrainEverywhere = true;

  var ROOT_ID = "ethone-brain-everywhere-root";
  var STRIP_ID = "ethone-brain-strip";
  var renderTimer = 0;
  var open = false;
  var lastNonAIPage = "dashboard";
  var lastPrompt = "";

  function $(selector, root) {
    try { return (root || document).querySelector(selector); } catch (e) { return null; }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function lang() {
    return String(global._lang || localStorage.getItem("nexus_lang") || document.documentElement.lang || "fr").slice(0, 2).toLowerCase();
  }

  function fr() {
    return lang() === "fr";
  }

  function tr(frText, enText) {
    return fr() ? frText : enText;
  }

  function icon(name) {
    return '<i data-lucide="' + esc(name || "brain") + '" aria-hidden="true"></i>';
  }

  function renderIcons(root) {
    try {
      if (global.lucide && !global.__lucideFailed && typeof global.lucide.createIcons === "function") {
        global.lucide.createIcons({ attrs: { "stroke-width": 1.9, "aria-hidden": "true", focusable: "false" } }, root || document);
      }
    } catch (e) {}
  }

  function osSnapshot() {
    try {
      return global.ETHONEOSContext && typeof global.ETHONEOSContext.snapshot === "function"
        ? global.ETHONEOSContext.snapshot()
        : null;
    } catch (e) {
      return null;
    }
  }

  function profileState() {
    try {
      var p = typeof global.curP === "function" ? global.curP() : null;
      return p && p.state ? p.state : {};
    } catch (e) {
      return {};
    }
  }

  function hidden(el) {
    if (!el) return true;
    try {
      var cs = getComputedStyle(el);
      return el.hidden || cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0";
    } catch (e) {
      return false;
    }
  }

  function isAppVisible() {
    return !!$("#main-content") && hidden($("#auth-screen")) && hidden($("#profile-screen")) && hidden($("#password-screen"));
  }

  function actionRegistry() {
    try { return global.ACTION_REGISTRY || global.ETHONEActions || (global.Ethone && global.Ethone.get && global.Ethone.get("actions")); }
    catch (e) { return null; }
  }

  function runAction(id, context) {
    var actions = actionRegistry();
    if (actions && typeof actions.dispatch === "function") return actions.dispatch(id, Object.assign({ source: "brain-everywhere" }, context || {}));
    if (typeof global.runAction === "function") return global.runAction(id, Object.assign({ source: "brain-everywhere" }, context || {}));
    return false;
  }

  function toast(message, type) {
    try { if (typeof global.toast === "function") global.toast(message, type || "info"); } catch (e) {}
  }

  function noteDuplicateCount() {
    var notes = Array.isArray(profileState().notes) ? profileState().notes : [];
    var seen = Object.create(null);
    var duplicates = 0;
    notes.forEach(function (note) {
      var key = String(note.title || note.name || "").trim().toLowerCase().replace(/\s+/g, " ");
      if (!key) return;
      if (seen[key]) duplicates += 1;
      seen[key] = true;
    });
    return duplicates;
  }

  function currentSettingsTab() {
    var active = $(".settings-nav-item.active,[data-settings-tab].active");
    return active && active.dataset ? active.dataset.settingsTab || active.dataset.tab || "" : "";
  }

  function pageName(os) {
    return os && os.page && os.page.label || "ETHONE";
  }

  function workspaceName(os) {
    return os && os.workspace && os.workspace.name || tr("Espace par defaut", "Default Space");
  }

  function flowName(os) {
    return os && os.mode && os.mode.label || tr("Contexte personnel", "Personal context");
  }

  function promptBase(os) {
    os = os || osSnapshot() || {};
    return [
      "ETHONE OS context:",
      "- Page: " + (os.page && os.page.label || "Unknown"),
      "- Space: " + workspaceName(os),
      "- Flow/context: " + flowName(os),
      "- Summary: " + (os.summary || "No summary available")
    ].join("\n");
  }

  function rec(id, title, body, prompt, iconName, actionId) {
    return { id: id, title: title, body: body, prompt: prompt, icon: iconName || "sparkles", actionId: actionId || "" };
  }

  function recommendations(os) {
    os = os || osSnapshot() || {};
    var page = os.page && os.page.id || "dashboard";
    var facts = os.facts || {};
    var taskCount = facts.tasks && facts.tasks.open || 0;
    var noteCount = facts.notes && facts.notes.total || 0;
    var eventCount = facts.calendar && facts.calendar.today || 0;
    var fileCount = facts.files && facts.files.total || 0;
    var duplicateNotes = noteDuplicateCount();
    var base = promptBase(os);

    if (page === "notes") {
      return [
        rec("notes-summary", tr("Resumer cette note", "Summarize this note"), tr("Brain peut extraire les decisions, les idees fortes et les prochaines actions.", "Brain can extract decisions, key ideas and next actions."), "Summarize the current note. Extract decisions, key ideas and next actions.\n\n" + base, "notebook-pen"),
        rec("notes-duplicates", tr("Verifier les doublons", "Check duplicates"), duplicateNotes ? tr(duplicateNotes + " doublon(s) potentiel(s) detecte(s).", duplicateNotes + " possible duplicate(s) detected.") : tr("Brain peut comparer les titres et contenus proches.", "Brain can compare similar titles and content."), "Detect duplicate or overlapping notes. Suggest merges without deleting anything.\n\n" + base, "copy-check"),
        rec("notes-task", tr("Creer une tache depuis la note", "Create a task from this note"), tr("Transformer les actions implicites en taches a valider.", "Turn implicit action items into tasks to approve."), "Find action items in the current note and propose tasks. Ask before creating anything.\n\n" + base, "square-check-big")
      ];
    }

    if (page === "calendar") {
      return [
        rec("calendar-organize", tr("Optimiser le planning", "Optimize schedule"), tr("Brain peut reorganiser les blocs, pauses et priorites.", "Brain can reorganize blocks, buffers and priorities."), "Analyze my calendar and suggest a calmer, better organized plan. Ask before changing events.\n\n" + base, "calendar-clock"),
        rec("calendar-conflicts", tr("Detecter les conflits", "Detect conflicts"), eventCount ? tr(eventCount + " evenement(s) aujourd'hui a verifier.", eventCount + " event(s) today to review.") : tr("Le planning semble calme aujourd'hui.", "The schedule looks calm today."), "Detect conflicts, overloaded periods and missing buffers.\n\n" + base, "shield-alert"),
        rec("calendar-focus", tr("Proposer un bloc focus", "Suggest a focus block"), tr("Trouver le meilleur moment pour avancer maintenant.", "Find the best moment to make progress now."), "Suggest a focus block based on tasks, events and the current time.\n\n" + base, "timer")
      ];
    }

    if (page === "settings") {
      var tab = currentSettingsTab();
      return [
        rec("settings-explain", tr("Expliquer ce parametre", "Explain this setting"), tr("Brain explique l'impact sans modifier la configuration.", "Brain explains the impact without changing configuration."), "Explain the visible ETHONE settings" + (tab ? " tab: " + tab : "") + ". Recommend safe choices.\n\n" + base, "settings"),
        rec("settings-safe", tr("Configurer sans risque", "Configure safely"), tr("Proposer une configuration premium, stable et reversible.", "Suggest a premium, stable and reversible configuration."), "Suggest safe ETHONE settings improvements. Do not apply anything without confirmation.\n\n" + base, "sliders-horizontal"),
        rec("settings-brain", tr("Ouvrir Brain & IA", "Open Brain & AI"), tr("Providers, memoire et comportement du Brain.", "Providers, memory and Brain behavior."), "Open Brain settings and explain provider/memory choices.\n\n" + base, "brain", "settings.tab.open")
      ];
    }

    if (page === "files" || page === "items") {
      return [
        rec("files-classify", tr("Classer les fichiers", "Classify files"), fileCount ? tr(fileCount + " fichier(s) peuvent etre organises.", fileCount + " file(s) can be organized.") : tr("Brain peut preparer tags et dossiers.", "Brain can prepare tags and folders."), "Classify current files and suggest tags, folders and related notes.\n\n" + base, "folder-search"),
        rec("files-summary", tr("Resumer le fichier", "Summarize file"), tr("Resumer ou expliquer l'element selectionne.", "Summarize or explain the selected item."), "Summarize the selected/current file. If content is unavailable, infer from metadata and suggest next steps.\n\n" + base, "file-text"),
        rec("files-link", tr("Relier aux notes", "Link to notes"), tr("Trouver les notes et taches liees.", "Find related notes and tasks."), "Find related notes, tasks and projects for the current files.\n\n" + base, "git-merge")
      ];
    }

    if (page === "todos" || page === "tasks" || page === "kanban") {
      return [
        rec("tasks-priority", tr("Prioriser les taches", "Prioritize tasks"), taskCount ? tr(taskCount + " tache(s) ouvertes a organiser.", taskCount + " open task(s) to organize.") : tr("Aucune urgence evidente.", "No obvious urgency."), "Prioritize my open tasks and suggest the best next action.\n\n" + base, "list-checks"),
        rec("tasks-subtasks", tr("Generer des sous-taches", "Generate subtasks"), tr("Decouper le travail en petites etapes.", "Split work into small steps."), "Create subtasks for the selected/current task. Ask before creating anything.\n\n" + base, "workflow"),
        rec("tasks-reminder", tr("Ajouter un rappel", "Add reminder"), tr("Proposer un rappel adapte au planning.", "Suggest a reminder that fits the schedule."), "Suggest a reminder for the most important task based on calendar and current context.\n\n" + base, "bell")
      ];
    }

    if (page === "connections" || page === "marketplace") {
      return [
        rec("integrations-health", tr("Verifier les integrations", "Check integrations"), tr("Brain peut expliquer les statuts et prochaines etapes.", "Brain can explain statuses and next steps."), "Review integration health and recommend next setup steps.\n\n" + base, "plug-zap"),
        rec("widgets-recommend", tr("Recommander un widget", "Recommend a widget"), tr("Proposer le widget utile pour ce Space.", "Suggest the useful widget for this Space."), "Recommend widgets and integrations based on the current Space, Flow and usage.\n\n" + base, "blocks", "widgets.add"),
        rec("marketplace-fit", tr("Trouver un plugin utile", "Find a useful plugin"), tr("Identifier ce qui manque sans surcharger ETHONE.", "Identify what is missing without cluttering ETHONE."), "Recommend marketplace plugins or widgets that fit this context. Do not install anything.\n\n" + base, "store")
      ];
    }

    if (page === "ai") {
      return [
        rec("ai-context", tr("Contexte actif compris", "Active context understood"), tr("Brain connait la page, le Space et le Flow actuels.", "Brain knows the current page, Space and Flow."), "Explain the current ETHONE OS context and what you can help with.\n\n" + base, "brain-circuit"),
        rec("ai-memory", tr("Verifier la memoire", "Review memory"), tr("Identifier ce qui devrait etre retenu ou oublie.", "Identify what should be remembered or ignored."), "Review ETHONE Brain memory opportunities for this context. Ask before storing anything.\n\n" + base, "database-zap"),
        rec("ai-next", tr("Prochaine action", "Next action"), tr("Proposer la meilleure action maintenant.", "Suggest the best action now."), "Based on the current page, Space and Flow, recommend the single best next action.\n\n" + base, "arrow-right")
      ];
    }

    if (page === "dashboard") {
      return [
        rec("dashboard-brief", tr("Brief du moment", "Current briefing"), os.summary || tr("Brain lit le contexte actuel.", "Brain reads the current context."), "Create a concise ETHONE briefing for the current moment.\n\n" + base, "sparkles"),
        rec("dashboard-widget", tr("Recommander un widget", "Recommend widget"), tr("Adapter le dashboard au Flow actuel.", "Adapt the dashboard to the current Flow."), "Recommend one widget that should be visible now and explain why.\n\n" + base, "blocks", "widgets.add"),
        rec("dashboard-focus", tr("Que faire maintenant ?", "What now?"), taskCount || eventCount ? tr("Brain voit des signaux qui meritent attention.", "Brain sees signals that deserve attention.") : tr("L'espace est calme, choisir une action simple.", "The space is calm; choose one simple action."), "Tell me what I should do now and why. Keep it actionable.\n\n" + base, "target")
      ];
    }

    return [
      rec("page-summary", tr("Resumer cette page", "Summarize this page"), tr("Comprendre ce qui compte sur cet ecran.", "Understand what matters on this screen."), "Summarize the current ETHONE page and identify what matters.\n\n" + base, "scan-text"),
      rec("page-organize", tr("Organiser le contexte", "Organize context"), tr("Proposer une meilleure suite d'actions.", "Suggest a better next sequence."), "Organize this page context and propose next actions.\n\n" + base, "sparkles"),
      rec("page-create", tr("Creer depuis ce contexte", "Create from context"), tr("Proposer note, tache ou evenement selon le besoin.", "Suggest a note, task or event when useful."), "Look at this page and propose useful tasks, notes or events. Ask before creating.\n\n" + base, "plus-circle")
    ];
  }

  function ensureRoot() {
    var root = $("#" + ROOT_ID);
    if (root) return root;
    root = document.createElement("section");
    root.id = ROOT_ID;
    root.className = "brain-everywhere-root";
    root.setAttribute("aria-live", "polite");
    root.innerHTML =
      '<button class="be-orb" type="button" data-be-toggle aria-expanded="false" aria-label="Brain">' +
        icon("brain") + '<span>Brain</span><em data-be-count>0</em>' +
      '</button>' +
      '<aside class="be-panel" role="dialog" aria-label="ETHONE Brain context" aria-hidden="true">' +
        '<header class="be-panel-head"><div><span>Brain Everywhere</span><strong data-be-title>Context</strong></div><button type="button" data-be-close aria-label="Close">' + icon("x") + '</button></header>' +
        '<div class="be-panel-context" data-be-context></div>' +
        '<div class="be-panel-list" data-be-list></div>' +
      '</aside>';
    document.body.appendChild(root);
    root.addEventListener("click", handleRootClick);
    return root;
  }

  function ensureStrip() {
    var strip = $("#" + STRIP_ID);
    if (!strip) {
      strip = document.createElement("section");
      strip.id = STRIP_ID;
      strip.className = "brain-everywhere-strip";
      strip.setAttribute("aria-label", "Brain context");
      strip.addEventListener("click", handleStripClick);
    }
    var page = $(".tab-content.active[id^='page-']");
    if (!page || !isAppVisible()) {
      if (strip.parentNode) strip.parentNode.removeChild(strip);
      return null;
    }
    page.querySelectorAll(".brain-os-strip,.aie-page-actions[data-aie-page-actions]").forEach(function (legacy) {
      legacy.remove();
    });
    delete page.dataset.brainStrip;
    page.dataset.aieActions = "canonical";
    var topbar = $(".topbar,.section-header,.page-header,.ethone-os2-page-hero,.vh-hero", page);
    if (topbar && topbar.parentNode && topbar.nextSibling !== strip) topbar.parentNode.insertBefore(strip, topbar.nextSibling);
    else if (!strip.parentNode || strip.parentNode !== page) page.insertBefore(strip, page.firstChild);
    return strip;
  }

  function contextLine(os) {
    return [
      '<span>' + icon("app-window") + esc(pageName(os)) + '</span>',
      '<span>' + icon("monitor") + esc(workspaceName(os)) + '</span>',
      '<span>' + icon("workflow") + esc(flowName(os)) + '</span>'
    ].join("");
  }

  function actionButton(item, primary) {
    return '<button class="' + (primary ? "primary" : "") + '" type="button" data-be-action="' + esc(item.id) + '">' + icon(item.icon) + '<span>' + esc(item.title) + '</span></button>';
  }

  function render() {
    if (!isAppVisible()) {
      var existing = $("#" + ROOT_ID);
      if (existing) existing.classList.add("is-hidden");
      var strip = $("#" + STRIP_ID);
      if (strip && strip.parentNode) strip.parentNode.removeChild(strip);
      return;
    }
    var os = osSnapshot() || {};
    var page = os.page && os.page.id || "dashboard";
    if (page !== "ai") lastNonAIPage = page;
    var items = recommendations(os);
    var root = ensureRoot();
    root.classList.remove("is-hidden");
    root.classList.toggle("open", open);
    var orb = $("[data-be-toggle]", root);
    if (orb) orb.setAttribute("aria-expanded", open ? "true" : "false");
    var count = $("[data-be-count]", root);
    if (count) count.textContent = String(items.length);
    var title = $("[data-be-title]", root);
    if (title) title.textContent = flowName(os);
    var ctx = $("[data-be-context]", root);
    if (ctx) ctx.innerHTML = '<p>' + esc(os.summary || tr("Brain lit votre contexte actuel.", "Brain is reading your current context.")) + '</p><div>' + contextLine(os) + '</div>';
    var list = $("[data-be-list]", root);
    if (list) list.innerHTML = items.map(function (item, index) {
      return '<article class="be-card" data-be-card="' + esc(item.id) + '"><div class="be-card-icon">' + icon(item.icon) + '</div><div><strong>' + esc(item.title) + '</strong><p>' + esc(item.body) + '</p></div>' + actionButton(item, index === 0) + '</article>';
    }).join("");

    var strip = ensureStrip();
    if (strip) {
      var primary = items[0];
      strip.innerHTML =
        '<div class="be-strip-core"><span class="be-strip-orb">' + icon("brain") + '</span><div><strong>Brain</strong><p>' + esc(os.summary || tr("Contexte ETHONE actif.", "ETHONE context active.")) + '</p></div></div>' +
        '<div class="be-strip-meta">' + contextLine(os) + '</div>' +
        '<div class="be-strip-actions">' + items.slice(0, 3).map(function (item, index) { return actionButton(item, index === 0); }).join("") + '</div>';
    }
    renderIcons(root);
    renderIcons(strip);
  }

  function schedule(delay) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(render, delay == null ? 120 : delay);
  }

  function findRecommendation(id) {
    var items = recommendations(osSnapshot() || {});
    return items.find(function (item) { return item.id === id; }) || items[0] || null;
  }

  function focusAIInput(prompt) {
    if (!prompt) return;
    var input = $("#aie-copilot-input") || $("#ai-input");
    if (input) {
      input.value = prompt;
      try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
    }
  }

  function openBrainWithPrompt(prompt, item) {
    var os = osSnapshot() || {};
    lastPrompt = prompt || promptBase(os);
    global.__ethonePendingBrainPrompt = { prompt: lastPrompt, context: os, source: "brain-everywhere", action: item && item.id || "" };
    var context = {
      page: os.page && os.page.id || lastNonAIPage || "dashboard",
      kind: "brain-everywhere",
      label: item && item.title || "Brain",
      text: lastPrompt,
      facts: os.facts || {},
      workspace: os.workspace || null,
      mode: os.mode || null,
      summary: os.summary || ""
    };
    if (global.ETHONEAIEverywhere && typeof global.ETHONEAIEverywhere.openCopilot === "function") {
      global.ETHONEAIEverywhere.openCopilot(context, lastPrompt);
      return true;
    }
    var loader = global.ETHONELazyModules;
    if (loader && typeof loader.loadGroups === "function") {
      loader.loadGroups(["ai"]).then(function () {
        if (global.ETHONEAIEverywhere && typeof global.ETHONEAIEverywhere.openCopilot === "function") {
          global.ETHONEAIEverywhere.openCopilot(context, lastPrompt);
        } else {
          runAction("brain.open", { prompt: lastPrompt, context: context });
          setTimeout(function () { focusAIInput(lastPrompt); }, 260);
        }
      });
      return true;
    }
    runAction("brain.open", { prompt: lastPrompt, context: context });
    setTimeout(function () { focusAIInput(lastPrompt); }, 260);
    return true;
  }

  function runRecommendation(item) {
    if (!item) return false;
    if (item.actionId === "widgets.add") {
      runAction("widgets.add", { reason: item.title });
      toast(tr("Brain recommande ce widget.", "Brain recommends this widget."), "info");
      return true;
    }
    if (item.actionId === "settings.tab.open") {
      runAction("settings.tab.open", { tab: "brain" });
      return true;
    }
    return openBrainWithPrompt(item.prompt, item);
  }

  function handleRootClick(event) {
    var toggle = event.target.closest("[data-be-toggle]");
    if (toggle) {
      open = !open;
      render();
      return;
    }
    if (event.target.closest("[data-be-close]")) {
      open = false;
      render();
      return;
    }
    var action = event.target.closest("[data-be-action]");
    if (action) {
      runRecommendation(findRecommendation(action.dataset.beAction));
    }
  }

  function handleStripClick(event) {
    var action = event.target.closest("[data-be-action]");
    if (action) {
      runRecommendation(findRecommendation(action.dataset.beAction));
      return;
    }
    var core = event.target.closest(".be-strip-core");
    if (core) {
      open = true;
      render();
    }
  }

  function registerActions() {
    var actions = actionRegistry();
    if (!actions || typeof actions.register !== "function" || registerActions.done) return;
    registerActions.done = true;
    actions.register("brain.everywhere.open", { label: "Brain Everywhere", handler: function () { open = true; render(); } });
    actions.register("brain.everywhere.close", { label: "Close Brain Everywhere", handler: function () { open = false; render(); } });
    actions.register("brain.context.ask", { label: "Ask Brain about current context", handler: function () {
      return openBrainWithPrompt("Analyze the current ETHONE OS context and recommend the best next action.\n\n" + promptBase(osSnapshot()), null);
    } });
  }

  function bind() {
    registerActions();
    setTimeout(registerActions, 700);
    [
      "ethone:os-context-update",
      "ethone:page-ready",
      "ethone:dashboard-ready",
      "ethone:workspace-change",
      "ethone:flow-change",
      "ethone:settings-change",
      "ethone:lazy-group-loaded",
      "ethone:boot-sequence-complete"
    ].forEach(function (name) {
      global.addEventListener(name, function () { schedule(120); }, { passive: true });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && open) {
        open = false;
        render();
      }
    }, true);
    schedule(220);
  }

  global.ETHONEBrainEverywhere = {
    render: render,
    open: function () { open = true; render(); },
    close: function () { open = false; render(); },
    recommendations: function () { return recommendations(osSnapshot() || {}); },
    ask: function (prompt) { return openBrainWithPrompt(prompt || promptBase(osSnapshot()), null); }
  };
  if (global.Ethone && typeof global.Ethone.define === "function") global.Ethone.define("brainEverywhere", global.ETHONEBrainEverywhere);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})(window);
