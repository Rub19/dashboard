/* ETHONE Developer Inspector
   Lazy diagnostic panel. It installs runtime hooks only while open. */
(function initEthoneDeveloperInspector(global) {
  "use strict";
  if (global.ETHONEInspector) return;

  var doc = global.document;
  var state = {
    open: false,
    shell: null,
    interval: 0,
    raf: 0,
    lastFrame: 0,
    fps: 0,
    frameSamples: [],
    requests: [],
    diagnostics: [],
    startedAt: Date.now(),
    hooks: null,
    selectedTab: "overview"
  };

  var MAX_LOGS = 120;
  var MAX_REQUESTS = 80;

  function $(selector, root) {
    try { return (root || doc).querySelector(selector); } catch (error) { return null; }
  }

  function $all(selector, root) {
    try { return Array.prototype.slice.call((root || doc).querySelectorAll(selector)); } catch (error) { return []; }
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }

  function now() {
    return Date.now();
  }

  function toast(message, type) {
    try {
      if (typeof global.toast === "function") {
        global.toast(message, type || "info");
        return;
      }
    } catch (error) {}
    try { console[type === "error" ? "error" : "warn"]("[ETHONE Inspector]", message); } catch (error) {}
  }

  function formatMs(value) {
    if (value == null || !isFinite(value)) return "-";
    if (value < 1000) return Math.round(value) + " ms";
    return (value / 1000).toFixed(2) + " s";
  }

  function formatBytes(value) {
    if (value == null || !isFinite(value)) return "-";
    var units = ["B", "KB", "MB", "GB"];
    var size = value;
    var unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return size.toFixed(unit ? 1 : 0) + " " + units[unit];
  }

  function getBootReport() {
    try {
      if (global.ETHONEBootManager && typeof global.ETHONEBootManager.report === "function") {
        return global.ETHONEBootManager.report();
      }
    } catch (error) {}
    return {
      totalBootMs: 0,
      memory: getMemory(),
      modules: [],
      listeners: 0,
      duplicateListeners: 0,
      timers: 0,
      intervals: 0,
      animationFrames: 0,
      observers: 0
    };
  }

  function getMemory() {
    try {
      var memory = global.performance && global.performance.memory;
      if (!memory) return null;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    } catch (error) {
      return null;
    }
  }

  function getConsoleRecords() {
    try {
      if (global.ETHONEConsole && typeof global.ETHONEConsole.records === "function") {
        return global.ETHONEConsole.records().slice(-MAX_LOGS);
      }
    } catch (error) {}
    return [];
  }

  function getActivePage() {
    var active = $(".tab-content.active[id^='page-']");
    return active ? active.id.replace(/^page-/, "") : "unknown";
  }

  function getTheme() {
    try {
      return doc.documentElement.getAttribute("data-ethone-theme") ||
        doc.body.getAttribute("data-theme") ||
        localStorage.getItem("ethone:theme") ||
        "default";
    } catch (error) {
      return "default";
    }
  }

  function getWorkspace() {
    try {
      return localStorage.getItem("ethone:active-workspace") ||
        localStorage.getItem("ethone:active-space-id") ||
        (global.ETHONEWorkspaces && global.ETHONEWorkspaces.active && global.ETHONEWorkspaces.active().name) ||
        "default";
    } catch (error) {
      return "default";
    }
  }

  function getFlow() {
    try {
      return localStorage.getItem("ethone:active-flow") ||
        (global.ETHONEFlow && global.ETHONEFlow.current && global.ETHONEFlow.current().name) ||
        "none";
    } catch (error) {
      return "none";
    }
  }

  function navigationTiming() {
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (!nav) return null;
      return {
        domInteractive: nav.domInteractive,
        domComplete: nav.domComplete,
        load: nav.loadEventEnd || nav.duration,
        duration: nav.duration
      };
    } catch (error) {
      return null;
    }
  }

  function moduleSummary() {
    var report = getBootReport();
    var modules = Array.isArray(report.modules) ? report.modules : [];
    var out = { loaded: 0, failed: 0, disabled: 0, waiting: 0, lazyLoaded: 0, slow: [] };
    modules.forEach(function (module) {
      if (!module) return;
      if (module.status === "loaded") out.loaded += 1;
      else if (module.status === "failed") out.failed += 1;
      else if (module.status === "disabled") out.disabled += 1;
      else out.waiting += 1;
      if (String(module.id || "").indexOf("lazy:") === 0 && module.status === "loaded") out.lazyLoaded += 1;
      if ((module.duration || 0) > 350) out.slow.push(module);
    });
    out.slow.sort(function (a, b) { return (b.duration || 0) - (a.duration || 0); });
    return out;
  }

  function mountedPages() {
    return $all(".tab-content.active[id^='page-'],.tab-content[data-mounted='true'],[data-page-mounted='true']").map(function (el) {
      return el.id || el.dataset.page || el.className || "page";
    }).slice(0, 24);
  }

  function mountedWidgets() {
    return $all(".d4-widget,.live-widget,.widget,.panel[data-widget],.dashboard-widget,[data-widget-id]").filter(function (el) {
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(function (el) {
      return el.dataset.widgetType || el.dataset.widgetId || el.id || (el.querySelector(".panel-title,.d4-widget-title,.widget-title") || {}).textContent || "widget";
    }).slice(0, 40);
  }

  function activeOverlays() {
    return $all(".open,.active,[aria-modal='true'],.modal-overlay,.dropdown.open,.context-menu.open,#cmd-palette-overlay.open").filter(function (el) {
      if (!el || el === state.shell || (state.shell && state.shell.contains(el))) return false;
      var styles = getComputedStyle(el);
      var rect = el.getBoundingClientRect();
      return styles.display !== "none" && styles.visibility !== "hidden" && Number(styles.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    }).map(function (el) {
      return el.id || el.className || el.tagName.toLowerCase();
    }).slice(0, 30);
  }

  function installHooks() {
    if (state.hooks) return;
    var hooks = {};
    try {
      hooks.fetch = global.fetch;
      if (typeof hooks.fetch === "function") {
        global.fetch = function inspectorFetch(input, init) {
          var started = performance.now();
          var url = typeof input === "string" ? input : (input && input.url) || "request";
          return hooks.fetch.apply(this, arguments).then(function (response) {
            recordRequest(url, response.status, performance.now() - started, false);
            return response;
          }).catch(function (error) {
            recordRequest(url, "ERR", performance.now() - started, true);
            throw error;
          });
        };
      }
    } catch (error) {}
    state.hooks = hooks;
  }

  function removeHooks() {
    if (!state.hooks) return;
    try {
      if (state.hooks.fetch) global.fetch = state.hooks.fetch;
    } catch (error) {}
    state.hooks = null;
  }

  function recordRequest(url, status, duration, failed) {
    state.requests.unshift({
      url: String(url || ""),
      status: String(status || ""),
      duration: duration || 0,
      failed: !!failed,
      at: new Date().toISOString()
    });
    if (state.requests.length > MAX_REQUESTS) state.requests.length = MAX_REQUESTS;
  }

  function startFps() {
    stopFps();
    state.lastFrame = performance.now();
    state.frameSamples = [];
    function tick(ts) {
      if (!state.open) return;
      var delta = ts - state.lastFrame;
      state.lastFrame = ts;
      if (delta > 0) {
        state.frameSamples.push(1000 / delta);
        if (state.frameSamples.length > 45) state.frameSamples.shift();
        state.fps = Math.round(state.frameSamples.reduce(function (sum, value) { return sum + value; }, 0) / state.frameSamples.length);
      }
      state.raf = requestAnimationFrame(tick);
    }
    state.raf = requestAnimationFrame(tick);
  }

  function stopFps() {
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
  }

  function createShell() {
    var shell = doc.createElement("section");
    shell.id = "ethone-inspector";
    shell.className = "ethone-inspector";
    shell.setAttribute("role", "dialog");
    shell.setAttribute("aria-modal", "false");
    shell.setAttribute("aria-label", "ETHONE Developer Inspector");
    shell.innerHTML =
      '<div class="ei-panel">' +
        '<header class="ei-header">' +
          '<div class="ei-brand"><span class="ei-logo">E</span><div><strong>ETHONE Inspector</strong><small>Developer diagnostics</small></div></div>' +
          '<div class="ei-header-actions">' +
            '<button class="ei-button ei-button-primary" type="button" data-ei-action="diagnostic">Run Full Diagnostic</button>' +
            '<button class="ei-icon-button" type="button" data-ei-action="close" aria-label="Close Inspector">x</button>' +
          '</div>' +
        '</header>' +
        '<nav class="ei-tabs" aria-label="Inspector sections">' +
          '<button class="active" type="button" data-ei-tab="overview">Overview</button>' +
          '<button type="button" data-ei-tab="runtime">Runtime</button>' +
          '<button type="button" data-ei-tab="network">Network</button>' +
          '<button type="button" data-ei-tab="console">Console</button>' +
          '<button type="button" data-ei-tab="diagnostics">Diagnostics</button>' +
          '<button type="button" data-ei-tab="tools">Tools</button>' +
        '</nav>' +
        '<main class="ei-body">' +
          '<section class="ei-view active" data-ei-view="overview"><div class="ei-grid" id="ei-overview-grid"></div><div class="ei-card"><div class="ei-card-head"><strong>Mounted UI</strong><span>live snapshot</span></div><div id="ei-mounted"></div></div></section>' +
          '<section class="ei-view" data-ei-view="runtime"><div id="ei-runtime"></div></section>' +
          '<section class="ei-view" data-ei-view="network"><div id="ei-network"></div></section>' +
          '<section class="ei-view" data-ei-view="console"><div id="ei-console"></div></section>' +
          '<section class="ei-view" data-ei-view="diagnostics"><div id="ei-diagnostics"></div></section>' +
          '<section class="ei-view" data-ei-view="tools"><div id="ei-tools"></div></section>' +
        '</main>' +
      '</div>';
    shell.addEventListener("click", onShellClick);
    doc.body.appendChild(shell);
    return shell;
  }

  function onShellClick(event) {
    var action = event.target && event.target.closest && event.target.closest("[data-ei-action]");
    if (action) {
      var id = action.dataset.eiAction;
      if (id === "close") close();
      else if (id === "diagnostic") runFullDiagnostic();
      else if (id === "export") exportReport();
      else if (id === "copy") copyReport();
      else if (id === "clear-console") clearConsole();
      else if (id === "safe-mode") enableSafeMode();
      else if (id === "disable-experimental") disableExperimental();
      else if (id === "disable-animations") disableAnimations();
      else if (id === "reset-ui") resetUiState();
      else if (id === "reset-sidebar") resetSidebarState();
      else if (id === "reset-widgets") resetWidgetLayout();
      else if (id === "reset-onboarding") resetOnboardingState();
      return;
    }
    var tab = event.target && event.target.closest && event.target.closest("[data-ei-tab]");
    if (tab) switchTab(tab.dataset.eiTab);
  }

  function switchTab(tab) {
    state.selectedTab = tab || "overview";
    $all("[data-ei-tab]", state.shell).forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.eiTab === state.selectedTab);
    });
    $all("[data-ei-view]", state.shell).forEach(function (view) {
      view.classList.toggle("active", view.dataset.eiView === state.selectedTab);
    });
    render();
  }

  function metricCard(label, value, status, sub) {
    return '<div class="ei-metric ' + esc(status || "") + '">' +
      '<span>' + esc(label) + '</span>' +
      '<strong>' + esc(value) + '</strong>' +
      (sub ? '<small>' + esc(sub) + '</small>' : '') +
    '</div>';
  }

  function renderOverview() {
    var boot = getBootReport();
    var modules = moduleSummary();
    var nav = navigationTiming();
    var memory = boot.memory || getMemory();
    var consoleRecords = getConsoleRecords();
    var errors = consoleRecords.filter(function (entry) { return entry.level === "error"; }).length;
    var warnings = consoleRecords.filter(function (entry) { return entry.level === "warn"; }).length;
    var bootMs = boot.totalBootMs || (nav && nav.duration) || 0;
    var grid = $("#ei-overview-grid", state.shell);
    if (grid) {
      grid.innerHTML =
        metricCard("FPS", state.fps || "-", state.fps < 45 ? "warn" : "ok", "sampled only while open") +
        metricCard("Boot", formatMs(bootMs), bootMs > 2000 ? "warn" : "ok", "global startup") +
        metricCard("Page", getActivePage(), "ok", "current route") +
        metricCard("Modules", modules.loaded + " loaded", modules.failed ? "critical" : "ok", modules.failed + " failed / " + modules.disabled + " disabled") +
        metricCard("Listeners", String(boot.listeners || 0), (boot.duplicateListeners || 0) > 20 ? "warn" : "ok", (boot.duplicateListeners || 0) + " duplicate") +
        metricCard("Timers", String((boot.timers || 0) + (boot.intervals || 0)), (boot.intervals || 0) > 20 ? "warn" : "ok", (boot.animationFrames || 0) + " RAF") +
        metricCard("Observers", String(boot.observers || 0), (boot.observers || 0) > 40 ? "warn" : "ok", "Mutation / Resize / Intersection") +
        metricCard("Memory", memory ? formatBytes(memory.used) : "n/a", memory && memory.limit && memory.used / memory.limit > 0.7 ? "warn" : "ok", memory ? "limit " + formatBytes(memory.limit) : "browser unsupported") +
        metricCard("Console", errors + " errors", errors ? "critical" : warnings ? "warn" : "ok", warnings + " warnings") +
        metricCard("Network", state.requests.length + " recent", state.requests.some(function (r) { return r.failed; }) ? "warn" : "ok", "captured while open") +
        metricCard("Theme", getTheme(), "ok", "active theme") +
        metricCard("Workspace", getWorkspace(), "ok", "flow " + getFlow());
    }
    var mounted = $("#ei-mounted", state.shell);
    if (mounted) {
      mounted.innerHTML =
        '<div class="ei-columns">' +
          '<div><h4>Pages mounted</h4>' + list(mountedPages()) + '</div>' +
          '<div><h4>Widgets mounted</h4>' + list(mountedWidgets()) + '</div>' +
          '<div><h4>Active overlays</h4>' + list(activeOverlays()) + '</div>' +
        '</div>';
    }
  }

  function renderRuntime() {
    var boot = getBootReport();
    var modules = Array.isArray(boot.modules) ? boot.modules.slice() : [];
    modules.sort(function (a, b) { return (b.duration || 0) - (a.duration || 0); });
    var target = $("#ei-runtime", state.shell);
    if (!target) return;
    target.innerHTML =
      '<div class="ei-card"><div class="ei-card-head"><strong>Runtime counters</strong><span>from Boot Manager</span></div>' +
      '<div class="ei-table">' +
      row("Listeners", boot.listeners || 0, (boot.duplicateListeners || 0) + " duplicate") +
      row("Timers", boot.timers || 0, "timeouts") +
      row("Intervals", boot.intervals || 0, "active") +
      row("Animation frames", boot.animationFrames || 0, "pending") +
      row("Observers", boot.observers || 0, "created") +
      '</div></div>' +
      '<div class="ei-card"><div class="ei-card-head"><strong>Modules</strong><span>slowest first</span></div>' +
      '<div class="ei-module-list">' + modules.slice(0, 80).map(function (module) {
        return '<div class="ei-module ' + esc(module.status || "waiting") + '"><span>' + esc(module.id) + '</span><b>' + esc(module.status || "waiting") + '</b><small>' + esc(formatMs(module.duration || 0)) + '</small></div>';
      }).join("") + '</div></div>';
  }

  function renderNetwork() {
    var target = $("#ei-network", state.shell);
    if (!target) return;
    target.innerHTML =
      '<div class="ei-card"><div class="ei-card-head"><strong>Recent network requests</strong><span>captured only while Inspector is open</span></div>' +
      (state.requests.length ? '<div class="ei-request-list">' + state.requests.map(function (request) {
        return '<div class="ei-request ' + (request.failed ? "failed" : "") + '"><span>' + esc(request.url) + '</span><b>' + esc(request.status) + '</b><small>' + esc(formatMs(request.duration)) + '</small></div>';
      }).join("") + '</div>' : '<div class="ei-empty">No requests captured since Inspector opened.</div>') +
      '</div>';
  }

  function renderConsole() {
    var target = $("#ei-console", state.shell);
    if (!target) return;
    var records = getConsoleRecords().reverse();
    target.innerHTML =
      '<div class="ei-card"><div class="ei-card-head"><strong>Console records</strong><span>ETHONE console hygiene buffer</span></div>' +
      (records.length ? '<div class="ei-log-list">' + records.map(function (entry) {
        return '<div class="ei-log ' + esc(entry.level) + '"><b>' + esc(entry.level) + '</b><span>' + esc(entry.message) + '</span><small>' + esc(entry.at) + '</small></div>';
      }).join("") + '</div>' : '<div class="ei-empty">No console warnings or errors recorded.</div>') +
      '</div>';
  }

  function renderDiagnostics() {
    var target = $("#ei-diagnostics", state.shell);
    if (!target) return;
    var report = state.diagnostics;
    var counts = countDiagnostics(report);
    target.innerHTML =
      '<div class="ei-card"><div class="ei-card-head"><strong>Full Diagnostic</strong><span>' + esc(counts.ok) + ' OK / ' + esc(counts.warning) + ' warnings / ' + esc(counts.critical) + ' critical</span></div>' +
      '<div class="ei-report-actions"><button class="ei-button ei-button-primary" type="button" data-ei-action="diagnostic">Run Full Diagnostic</button><button class="ei-button" type="button" data-ei-action="export">Export report JSON</button><button class="ei-button" type="button" data-ei-action="copy">Copy report</button></div>' +
      (report.length ? '<div class="ei-diagnostic-list">' + report.map(diagnosticItem).join("") + '</div>' : '<div class="ei-empty">No diagnostic has been run yet.</div>') +
      '</div>';
  }

  function renderTools() {
    var target = $("#ei-tools", state.shell);
    if (!target) return;
    var buttons = [
      ["clear-console", "Clear console errors", "Clear ETHONE console buffer."],
      ["safe-mode", "Safe Mode", "Enable minimal runtime flags and disable heavy visual work."],
      ["disable-experimental", "Disable experimental modules", "Turn off modules that are beta by default."],
      ["disable-animations", "Disable animations", "Respect reduced motion immediately."],
      ["reset-ui", "Reset UI state", "Clear only layout and panel preferences."],
      ["reset-sidebar", "Reset sidebar state", "Restore sidebar width, collapse and scroll state."],
      ["reset-widgets", "Reset widget layout", "Clear dashboard widget layout preferences."],
      ["reset-onboarding", "Reset onboarding state", "Let first-run onboarding appear again without deleting data."]
    ];
    target.innerHTML =
      '<div class="ei-card"><div class="ei-card-head"><strong>Repair tools</strong><span>non-destructive local fixes</span></div>' +
      '<div class="ei-tool-grid">' + buttons.map(function (button) {
        return '<button class="ei-tool" type="button" data-ei-action="' + esc(button[0]) + '"><strong>' + esc(button[1]) + '</strong><span>' + esc(button[2]) + '</span></button>';
      }).join("") + '</div></div>';
  }

  function list(items) {
    if (!items || !items.length) return '<div class="ei-empty small">None</div>';
    return '<ul class="ei-list">' + items.map(function (item) { return '<li>' + esc(item) + '</li>'; }).join("") + '</ul>';
  }

  function row(a, b, c) {
    return '<div class="ei-row"><span>' + esc(a) + '</span><strong>' + esc(b) + '</strong><small>' + esc(c || "") + '</small></div>';
  }

  function diagnosticItem(item) {
    return '<article class="ei-diag ' + esc(item.status) + '">' +
      '<div><b>' + esc(statusLabel(item.status)) + '</b><strong>' + esc(item.component || "System") + '</strong><span>' + esc(item.page || "global") + '</span></div>' +
      '<p>' + esc(item.issue || "") + '</p>' +
      '<dl><dt>Cause probable</dt><dd>' + esc(item.probableCause || "-") + '</dd><dt>Fichier probable</dt><dd>' + esc(item.probableFile || "-") + '</dd><dt>Action recommandee</dt><dd>' + esc(item.recommendation || "-") + '</dd></dl>' +
    '</article>';
  }

  function statusLabel(status) {
    if (status === "critical") return "Critical";
    if (status === "warning") return "Warning";
    return "OK";
  }

  function countDiagnostics(report) {
    return (report || []).reduce(function (acc, item) {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { ok: 0, warning: 0, critical: 0 });
  }

  function addResult(out, status, page, component, issue, probableCause, probableFile, recommendation) {
    out.push({
      status: status,
      page: page || "global",
      component: component || "System",
      issue: issue || "",
      probableCause: probableCause || "",
      probableFile: probableFile || "",
      recommendation: recommendation || ""
    });
  }

  function runFullDiagnostic() {
    var report = [];
    addResult(report, "ok", "auth", "Login state", "Auth containers are present or app shell is mounted.", "Boot sequence loaded.", "services/auth/legacy/session.js", "Keep auth checks before mounting app shell.");
    diagnoseSidebar(report);
    diagnoseNavigation(report);
    diagnoseButtons(report);
    diagnoseCommandPalette(report);
    diagnoseSettings(report);
    diagnoseAI(report);
    diagnoseWidgets(report);
    diagnoseNotifications(report);
    diagnoseOverlays(report);
    diagnoseResponsive(report);
    diagnoseConsole(report);
    diagnoseModules(report);
    diagnoseRuntime(report);
    state.diagnostics = report;
    switchTab("diagnostics");
    toast("Diagnostic complete: " + countDiagnostics(report).critical + " critical, " + countDiagnostics(report).warning + " warnings.", countDiagnostics(report).critical ? "warning" : "success");
    render();
    return report;
  }

  function diagnoseSidebar(out) {
    var sidebar = $("#main-sidebar");
    if (!sidebar) {
      addResult(out, "critical", "global", "Sidebar", "Sidebar element is missing.", "App shell did not mount or sidebar id changed.", "pages/dashboard/shell.js", "Restore #main-sidebar or update Inspector selectors.");
      return;
    }
    var navItems = $all(".nav-item, [data-action-page], [data-page]", sidebar);
    addResult(out, navItems.length ? "ok" : "warning", "global", "Sidebar navigation", navItems.length + " sidebar navigation controls detected.", navItems.length ? "Navigation is mounted." : "No navigation controls found.", "index.html / pages/dashboard/shell.js", "Verify sidebar template if count is zero.");
    var blocked = sampleClickBlockers(navItems.slice(0, 12));
    if (blocked.length) {
      addResult(out, "critical", "global", "Sidebar interactions", blocked.length + " sidebar controls may be covered by another element.", "elementFromPoint returned another interactive layer.", "ui/layout-integrity.css", "Remove invisible overlays or fix pointer-events/z-index.");
    } else {
      addResult(out, "ok", "global", "Sidebar interactions", "No obvious click blockers detected on sampled sidebar controls.", "Pointer hit testing is clean.", "ui/os-sidebar.css", "Keep active states inside items.");
    }
    var rect = sidebar.getBoundingClientRect();
    if (rect.width < 64 || rect.height < 300) {
      addResult(out, "warning", "global", "Sidebar sizing", "Sidebar size looks unusual: " + Math.round(rect.width) + "x" + Math.round(rect.height) + ".", "Collapsed or constrained layout.", "ui/os-sidebar.css", "Check responsive/collapse state if unintended.");
    }
  }

  function sampleClickBlockers(elements) {
    return elements.filter(function (el) {
      if (!el || !el.getBoundingClientRect) return false;
      var rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      var x = Math.max(1, Math.min(global.innerWidth - 1, rect.left + Math.min(rect.width / 2, 24)));
      var y = Math.max(1, Math.min(global.innerHeight - 1, rect.top + rect.height / 2));
      var hit = doc.elementFromPoint(x, y);
      return hit && hit !== el && !el.contains(hit) && !hit.closest("#ethone-inspector");
    });
  }

  function diagnoseNavigation(out) {
    var pages = $all(".tab-content[id^='page-']");
    addResult(out, pages.length ? "ok" : "critical", "global", "Pages", pages.length + " page containers detected.", pages.length ? "Routing surface exists." : "No pages found.", "index.html", "Ensure page containers are rendered in app shell.");
    var active = pages.filter(function (page) { return page.classList.contains("active"); });
    addResult(out, active.length === 1 ? "ok" : active.length > 1 ? "critical" : "warning", "global", "Active page isolation", active.length + " active pages detected.", "Only one active page should exist.", "actions/navigation.js", "Unmount/deactivate previous page before switching.");
  }

  function diagnoseButtons(out) {
    var visibleButtons = $all("button,.btn,[role='button']").filter(isVisible).filter(function (el) { return !el.closest("#ethone-inspector"); });
    var unlabeled = visibleButtons.filter(function (el) {
      return !String(el.textContent || "").trim() && !el.getAttribute("aria-label") && !el.getAttribute("title");
    });
    var inert = visibleButtons.filter(function (el) {
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return false;
      if (el.closest("form") && el.type === "submit") return false;
      return !el.onclick && !el.dataset.actionId && !el.dataset.ethoneAction && !el.dataset.action && !el.getAttribute("onclick") && !el.closest("[onclick]");
    });
    addResult(out, unlabeled.length ? "warning" : "ok", "global", "Button labels", unlabeled.length + " visible buttons without accessible label.", "Missing text, title or aria-label.", "index.html / components", "Add aria-label to icon-only buttons.");
    addResult(out, inert.length ? "warning" : "ok", "global", "Button actions", inert.length + " visible buttons appear inert.", "No action attribute or handler detected.", "actions/action-registry.js", "Route product actions through ACTION_REGISTRY or mark as disabled.");
  }

  function diagnoseCommandPalette(out) {
    var exists = !!$("#cmd-palette-overlay") && typeof global.openCmdPalette === "function";
    addResult(out, exists ? "ok" : "critical", "global", "Ctrl+K", exists ? "Command palette is available." : "Command palette is unavailable.", exists ? "openCmdPalette exists." : "Global command palette function missing.", "components/command-palette.js", "Restore command palette runtime or lazy-load it before use.");
  }

  function diagnoseSettings(out) {
    var settings = $("#page-settings");
    var developer = $("#settings-developer");
    addResult(out, settings && developer ? "ok" : "warning", "settings", "Developer settings", settings && developer ? "Settings and Developer tab are present." : "Settings developer tab is missing.", "Settings template may be incomplete.", "index.html", "Ensure Settings > Developer renders Inspector entry.");
  }

  function diagnoseAI(out) {
    var hasAIPage = !!$("#page-ai");
    var canLazy = !!(global.ETHONELazyModules && global.ETHONELazyModules.canLoadPage && global.ETHONELazyModules.canLoadPage("ai"));
    addResult(out, hasAIPage || canLazy ? "ok" : "warning", "ai", "ETHONE IA", hasAIPage ? "AI page container is present." : canLazy ? "AI page can lazy-load." : "AI page is not available.", "AI is expected to be lazy.", "services/ai/legacy/chat.js", "Keep AI lazy and avoid API calls during boot.");
  }

  function diagnoseWidgets(out) {
    var widgets = mountedWidgets();
    var panel = $("#live-panel, #live-widgets-panel, #live-panel-toggle-btn");
    addResult(out, panel ? "ok" : "warning", "dashboard", "Widgets", widgets.length + " visible widget surfaces detected.", panel ? "Widget panel controls are present." : "No widget panel control found.", "pages/dashboard/live-panel-resize.js", "Keep widgets lazy and panel optional.");
  }

  function diagnoseNotifications(out) {
    var available = typeof global.toast === "function" || !!$("#notif-bell-btn");
    addResult(out, available ? "ok" : "warning", "global", "Notifications", available ? "Notification/toast entry point exists." : "No toast or notification control found.", "Notification center is lazy-loaded.", "actions/notification-center.js", "Ensure duplicate toasts are deduplicated.");
  }

  function diagnoseOverlays(out) {
    var overlays = activeOverlays();
    var invisible = $all("body *").filter(function (el) {
      if (el.closest("#ethone-inspector")) return false;
      var styles = getComputedStyle(el);
      if (styles.position !== "fixed" && styles.position !== "absolute") return false;
      if (styles.pointerEvents === "none") return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 80 && rect.height > 80 && Number(styles.opacity || 1) < 0.02 && styles.visibility !== "hidden" && styles.display !== "none";
    }).slice(0, 8);
    addResult(out, invisible.length ? "critical" : "ok", "global", "Invisible overlays", invisible.length + " invisible pointer-capturing layers found.", "Transparent fixed/absolute element may block clicks.", "ui/layout-integrity.css", "Set pointer-events:none or unmount closed overlays.");
    addResult(out, overlays.length > 8 ? "warning" : "ok", "global", "Active overlays", overlays.length + " active overlays detected.", "Many overlays can create z-index conflicts.", "components/modals.js", "Close/unmount overlays when hidden.");
  }

  function diagnoseResponsive(out) {
    var horizontalOverflow = doc.documentElement.scrollWidth > doc.documentElement.clientWidth + 2;
    addResult(out, horizontalOverflow ? "critical" : "ok", "global", "Responsive overflow", horizontalOverflow ? "Document has horizontal overflow." : "No document-level horizontal overflow detected.", "An element exceeds viewport width.", "ui/responsive-audit.css", "Clamp widths and remove fixed large min-widths.");
  }

  function diagnoseConsole(out) {
    var records = getConsoleRecords();
    var errors = records.filter(function (entry) { return entry.level === "error"; });
    var warnings = records.filter(function (entry) { return entry.level === "warn"; });
    addResult(out, errors.length ? "critical" : warnings.length ? "warning" : "ok", "global", "Console", errors.length + " errors and " + warnings.length + " warnings in buffer.", "Runtime console hygiene captured records.", "core/console-hygiene.js", "Fix errors first; warnings should be actionable.");
  }

  function diagnoseModules(out) {
    var modules = moduleSummary();
    addResult(out, modules.failed ? "critical" : "ok", "global", "Modules failed", modules.failed + " failed modules.", "Boot Manager status report.", "core/boot-manager.js", "Disable or fix failed modules so boot remains clean.");
    addResult(out, modules.slow.length ? "warning" : "ok", "global", "Slow modules", modules.slow.length + " modules took longer than 350ms.", "Large scripts/styles or synchronous initialization.", "core/lazy-modules.js", "Lazy-load and split slow modules.");
  }

  function diagnoseRuntime(out) {
    var boot = getBootReport();
    addResult(out, (boot.duplicateListeners || 0) > 30 ? "warning" : "ok", "global", "Duplicate listeners", (boot.duplicateListeners || 0) + " duplicate listeners detected.", "Same listener attached repeatedly.", "core/boot-manager.js", "Guard init functions and cleanup page listeners.");
    addResult(out, (boot.intervals || 0) > 25 ? "warning" : "ok", "global", "Active intervals", (boot.intervals || 0) + " active intervals detected.", "Timers may remain after navigation.", "widgets / services", "Replace polling with lazy/visible updates and clear intervals.");
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var rect = el.getBoundingClientRect();
    var styles = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && styles.display !== "none" && styles.visibility !== "hidden";
  }

  function exportReport() {
    var data = JSON.stringify({ generatedAt: new Date().toISOString(), report: state.diagnostics, boot: getBootReport() }, null, 2);
    var blob = new Blob([data], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = doc.createElement("a");
    a.href = url;
    a.download = "ethone-diagnostic-report.json";
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function copyReport() {
    var data = JSON.stringify({ generatedAt: new Date().toISOString(), report: state.diagnostics, boot: getBootReport() }, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(data).then(function () { toast("Diagnostic report copied.", "success"); }).catch(copyFallback.bind(null, data));
    } else {
      copyFallback(data);
    }
  }

  function copyFallback(data) {
    var input = doc.createElement("textarea");
    input.value = data;
    input.style.position = "fixed";
    input.style.opacity = "0";
    doc.body.appendChild(input);
    input.select();
    try { doc.execCommand("copy"); toast("Diagnostic report copied.", "success"); } catch (error) { toast("Copy failed.", "error"); }
    input.remove();
  }

  function clearConsole() {
    try {
      if (global.ETHONEConsole && typeof global.ETHONEConsole.clear === "function") global.ETHONEConsole.clear();
    } catch (error) {}
    toast("Console buffer cleared.", "success");
    render();
  }

  function enableSafeMode() {
    try {
      localStorage.setItem("ethone:safe-mode", "1");
      localStorage.setItem("ethone:experimental-enabled", "0");
      localStorage.setItem("ethone:animations", "0");
      doc.body.classList.add("ethone-safe-mode", "ethone-low-power");
    } catch (error) {}
    toast("Safe Mode flags enabled. Refresh to apply every guard.", "success");
  }

  function disableExperimental() {
    try { localStorage.setItem("ethone:experimental-enabled", "0"); } catch (error) {}
    toast("Experimental modules disabled.", "success");
  }

  function disableAnimations() {
    try { localStorage.setItem("ethone:animations", "0"); } catch (error) {}
    doc.documentElement.classList.add("reduce-motion");
    doc.body.classList.add("ethone-reduced-motion");
    toast("Animations disabled locally.", "success");
  }

  function removeKeys(match) {
    try {
      Object.keys(localStorage).forEach(function (key) {
        if (match(key)) localStorage.removeItem(key);
      });
    } catch (error) {}
  }

  function resetUiState() {
    removeKeys(function (key) {
      return /^ethone:(layout-mode|widgets-panel|active-flow|ui-|panel-|dock-|desktop)/.test(key);
    });
    toast("UI state reset. Refresh if a panel is still open.", "success");
  }

  function resetSidebarState() {
    removeKeys(function (key) {
      return /^ethone:(sidebar|nav-|os-sidebar)/.test(key) || key.indexOf("sidebar") >= 0;
    });
    doc.documentElement.style.removeProperty("--sidebar-width");
    toast("Sidebar state reset.", "success");
  }

  function resetWidgetLayout() {
    removeKeys(function (key) {
      return /^ethone:(widget|widgets|dashboard-layout|live-panel)/.test(key) || key.indexOf("widget-layout") >= 0;
    });
    toast("Widget layout preferences reset.", "success");
  }

  function resetOnboardingState() {
    removeKeys(function (key) {
      return /^ethone:(first-run|onboarding)/.test(key) || key.indexOf("onboarding") >= 0;
    });
    try {
      if (global.ETHONEFirstRun && typeof global.ETHONEFirstRun.resetCompletionOnly === "function") {
        global.ETHONEFirstRun.resetCompletionOnly();
      }
    } catch (error) {}
    toast("Onboarding state reset without deleting user data.", "success");
  }

  function render() {
    if (!state.open || !state.shell) return;
    if (state.selectedTab === "overview") renderOverview();
    else if (state.selectedTab === "runtime") renderRuntime();
    else if (state.selectedTab === "network") renderNetwork();
    else if (state.selectedTab === "console") renderConsole();
    else if (state.selectedTab === "diagnostics") renderDiagnostics();
    else if (state.selectedTab === "tools") renderTools();
  }

  function open() {
    if (state.open) {
      if (state.shell) state.shell.classList.add("open");
      render();
      return;
    }
    try { localStorage.setItem("ethone:developer-mode", "1"); } catch (error) {}
    state.open = true;
    state.shell = state.shell || createShell();
    state.shell.classList.add("open");
    installHooks();
    startFps();
    renderOverview();
    switchTab(state.selectedTab || "overview");
    state.interval = setInterval(render, 1200);
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    if (state.interval) {
      clearInterval(state.interval);
      state.interval = 0;
    }
    stopFps();
    removeHooks();
    if (state.shell) state.shell.classList.remove("open");
  }

  function toggle() {
    if (state.open) close();
    else open();
  }

  function status() {
    return {
      open: state.open,
      fps: state.fps,
      requests: state.requests.slice(),
      diagnostics: state.diagnostics.slice(),
      boot: getBootReport()
    };
  }

  global.ETHONEInspector = {
    open: open,
    close: close,
    toggle: toggle,
    runFullDiagnostic: runFullDiagnostic,
    status: status
  };
})(window);
