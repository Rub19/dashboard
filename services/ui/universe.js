/* ETHONE Universe
   Immersive planet navigation over existing pages and Spaces. */
(function () {
  "use strict";

  if (window.__ethoneUniverseLoaded) return;
  window.__ethoneUniverseLoaded = true;

  var selectedId = "brain";
  var root = null;
  var launcher = null;
  var resizeTimer = 0;

  var PLANETS = [
    planet("brain", "Brain", "Central intelligence", "ai", "ai-research", "brain-circuit", "#a78bfa", "Briefings, context, memory and AI actions."),
    planet("gaming", "Gaming", "Play environment", "gaming", "gaming", "gamepad-2", "#c084fc", "Valorant, Steam, Discord, Spotify and session context."),
    planet("dev", "Dev", "Build environment", "github", "development", "code-2", "#9d7cff", "GitHub, notes, databases, files and deep work."),
    planet("study", "Study", "Learning space", "notes", "study", "graduation-cap", "#b794f4", "Notes, files, calendar and focused learning."),
    planet("files", "Files", "Knowledge system", "files", "", "folder-open", "#8b5cf6", "Documents, links, folders, preview and quick access."),
    planet("calendar", "Calendar", "Time layer", "calendar", "", "calendar-days", "#a855f7", "Events, planning, deadlines and rituals."),
    planet("marketplace", "Marketplace", "Expansion layer", "marketplace", "", "store", "#d946ef", "Widgets, plugins, themes, packs and automations."),
    planet("settings", "Settings", "Control room", "settings", "", "sliders-horizontal", "#94a3b8", "Preferences, appearance, integrations and system tuning.")
  ];

  function planet(id, title, subtitle, page, workspace, icon, color, description) {
    return { id: id, title: title, subtitle: subtitle, page: page, workspace: workspace, icon: icon, color: color, description: description };
  }

  function qs(selector, node) {
    return (node || document).querySelector(selector);
  }

  function qsa(selector, node) {
    return Array.prototype.slice.call((node || document).querySelectorAll(selector));
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function icon(name) {
    return '<i data-lucide="' + esc(name || "circle") + '"></i>';
  }

  function appVisible() {
    var main = qs("#main-content");
    var auth = qs("#auth-screen,.auth-shell,.auth-page,.login-page");
    var profile = qs("#profile-screen");
    var password = qs("#password-screen");
    function hidden(el) {
      if (!el) return true;
      var styles = getComputedStyle(el);
      return el.hidden || styles.display === "none" || styles.visibility === "hidden" || el.offsetParent === null;
    }
    return !!main && !hidden(main) && hidden(auth) && hidden(profile) && hidden(password);
  }

  function currentPage() {
    var active = qs(".tab-content.active[id^='page-']");
    return active ? active.id.replace(/^page-/, "") : "dashboard";
  }

  function activeWorkspaceId() {
    try {
      var svc = window.ETHONEWorkspaces || window.ETHONESpaces;
      var active = svc && typeof svc.active === "function" ? svc.active() : null;
      if (active && active.id) return active.id;
    } catch (e) {}
    try { return localStorage.getItem("ethone:active-workspace-id") || ""; } catch (e) { return ""; }
  }

  function bestPlanetId() {
    var page = currentPage();
    var ws = activeWorkspaceId();
    var byWorkspace = PLANETS.find(function (p) { return p.workspace && p.workspace === ws; });
    if (byWorkspace) return byWorkspace.id;
    var byPage = PLANETS.find(function (p) { return p.page === page; });
    return byPage ? byPage.id : selectedId;
  }

  function ensureLauncher() {
    if (launcher && document.body.contains(launcher)) return launcher;
    launcher = document.createElement("button");
    launcher.id = "ethone-universe-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open ETHONE Universe");
    launcher.innerHTML = '<span class="universe-launcher-core">' + icon("orbit") + '</span><span>Universe</span>';
    launcher.addEventListener("click", open);
    document.body.appendChild(launcher);
    refreshIcons();
    return launcher;
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) return root;
    root = document.createElement("section");
    root.id = "ethone-universe";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "ETHONE Universe navigation");
    root.innerHTML = shellHTML();
    document.body.appendChild(root);
    root.addEventListener("click", onClick);
    root.addEventListener("keydown", onKey);
    return root;
  }

  function shellHTML() {
    return [
      '<div class="universe-backdrop" data-universe-close></div>',
      '<div class="universe-shell" tabindex="-1">',
      '<header class="universe-header">',
      '<div><span class="universe-kicker">ETHONE Universe</span><h2>Navigate your personal universe.</h2><p>Every module becomes a planet. Every planet opens a complete ETHONE environment.</p></div>',
      '<button type="button" class="universe-close" data-universe-close aria-label="Close Universe">' + icon("x") + '</button>',
      '</header>',
      '<div class="universe-main">',
      '<div class="universe-stage" aria-label="ETHONE planets">',
      '<div class="universe-stars"></div>',
      '<div class="universe-orbit orbit-a"></div><div class="universe-orbit orbit-b"></div><div class="universe-orbit orbit-c"></div>',
      '<button type="button" class="universe-core" data-universe-home><span>ETHONE</span><strong>OS</strong></button>',
      '<div class="universe-planets">' + PLANETS.map(planetButton).join("") + '</div>',
      '</div>',
      '<aside class="universe-panel" aria-live="polite"><div id="universe-detail"></div><div class="universe-actions"><button type="button" class="universe-btn primary" data-universe-enter>Enter planet</button><button type="button" class="universe-btn" data-universe-command>Command</button></div></aside>',
      '</div>',
      '</div>'
    ].join("");
  }

  function planetButton(p, index) {
    return '<button type="button" class="universe-planet" data-planet="' + esc(p.id) + '" data-index="' + index + '" style="--planet-color:' + esc(p.color) + '">' +
      '<span class="planet-glow"></span><span class="planet-core">' + icon(p.icon) + '</span><strong>' + esc(p.title) + '</strong><small>' + esc(p.subtitle) + '</small></button>';
  }

  function detailHTML(p) {
    var ws = p.workspace ? "Space: " + p.workspace.replace(/-/g, " ") : "Module global";
    return [
      '<div class="universe-detail-top"><span class="universe-detail-icon" style="--planet-color:' + esc(p.color) + '">' + icon(p.icon) + '</span><div><div class="universe-detail-kicker">' + esc(ws) + '</div><h3>' + esc(p.title) + '</h3></div></div>',
      '<p>' + esc(p.description) + '</p>',
      '<div class="universe-signals">',
      '<span>' + icon("sparkles") + ' Immersive transition</span>',
      '<span>' + icon("mouse-pointer-click") + ' Existing module</span>',
      '<span>' + icon("keyboard") + ' Keyboard ready</span>',
      '</div>'
    ].join("");
  }

  function refreshIcons() {
    try { if (window.lucide && !window.__lucideFailed) window.lucide.createIcons(); } catch (e) {}
  }

  function setSelected(id) {
    selectedId = id || selectedId;
    var p = PLANETS.find(function (item) { return item.id === selectedId; }) || PLANETS[0];
    qsa(".universe-planet", root).forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-planet") === p.id);
      button.setAttribute("aria-pressed", button.getAttribute("data-planet") === p.id ? "true" : "false");
    });
    var detail = qs("#universe-detail", root);
    if (detail) detail.innerHTML = detailHTML(p);
    refreshIcons();
  }

  function positionPlanets() {
    if (!root || !root.classList.contains("is-open")) return;
    var stage = qs(".universe-stage", root);
    if (!stage) return;
    var rect = stage.getBoundingClientRect();
    var radius = Math.max(118, Math.min(rect.width, rect.height) * .36);
    qsa(".universe-planet", root).forEach(function (button) {
      var index = Number(button.getAttribute("data-index")) || 0;
      var angle = (-90 + index * (360 / PLANETS.length)) * Math.PI / 180;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius * .72;
      button.style.setProperty("--planet-x", x.toFixed(2) + "px");
      button.style.setProperty("--planet-y", y.toFixed(2) + "px");
    });
  }

  function open() {
    if (!appVisible()) return;
    ensureRoot();
    selectedId = bestPlanetId();
    root.classList.add("is-open");
    document.body.classList.add("ethone-universe-open");
    setSelected(selectedId);
    requestAnimationFrame(function () {
      positionPlanets();
      var shell = qs(".universe-shell", root);
      if (shell) {
        try { shell.focus({ preventScroll: true }); } catch (e) { shell.focus(); }
      }
    });
  }

  function close() {
    if (!root) return;
    root.classList.remove("is-open");
    document.body.classList.remove("ethone-universe-open");
  }

  function onClick(event) {
    var closeTarget = event.target.closest("[data-universe-close]");
    if (closeTarget) { close(); return; }
    var planetButton = event.target.closest("[data-planet]");
    if (planetButton) {
      setSelected(planetButton.getAttribute("data-planet"));
      if (event.detail >= 2) enterSelected();
      return;
    }
    if (event.target.closest("[data-universe-enter]")) { enterSelected(); return; }
    if (event.target.closest("[data-universe-command]")) {
      close();
      if (typeof window.openCmdPalette === "function") window.openCmdPalette("universe ");
      return;
    }
    if (event.target.closest("[data-universe-home]")) {
      close();
      if (typeof window.switchPage === "function") window.switchPage("dashboard", null);
    }
  }

  function onKey(event) {
    if (event.key === "Escape") { close(); return; }
    if (event.key === "Enter") { event.preventDefault(); enterSelected(); return; }
    if (!/ArrowLeft|ArrowRight|ArrowUp|ArrowDown/.test(event.key)) return;
    event.preventDefault();
    var current = PLANETS.findIndex(function (p) { return p.id === selectedId; });
    var delta = /ArrowRight|ArrowDown/.test(event.key) ? 1 : -1;
    var next = (current + delta + PLANETS.length) % PLANETS.length;
    setSelected(PLANETS[next].id);
  }

  function enterSelected() {
    var p = PLANETS.find(function (item) { return item.id === selectedId; }) || PLANETS[0];
    close();
    universeJump(p, function () {
      try {
        var svc = window.ETHONEWorkspaces || window.ETHONESpaces;
        if (p.workspace && svc && typeof svc.setActive === "function") svc.setActive(p.workspace, { silent: true });
      } catch (e) {}
      if (typeof window.switchPage === "function") window.switchPage(p.page, null);
      try { window.dispatchEvent(new CustomEvent("ethone:universe-enter", { detail: { planet: p } })); } catch (e) {}
    });
  }

  function universeJump(p, done) {
    var portal = document.createElement("div");
    portal.className = "universe-jump";
    portal.style.setProperty("--planet-color", p.color);
    portal.innerHTML = '<div><span>' + esc(p.title) + '</span><strong>' + esc(p.subtitle) + '</strong></div>';
    document.body.appendChild(portal);
    document.body.classList.add("ethone-universe-jumping");
    setTimeout(function () { if (typeof done === "function") done(); }, 180);
    setTimeout(function () {
      portal.classList.add("leaving");
      document.body.classList.remove("ethone-universe-jumping");
      setTimeout(function () { portal.remove(); }, 280);
    }, 620);
  }

  function syncVisibility() {
    ensureLauncher();
    launcher.classList.toggle("is-visible", appVisible());
  }

  function schedulePosition() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(positionPlanets, 90);
  }

  function boot() {
    ensureLauncher();
    syncVisibility();
    ["ethone:page-ready", "ethone:workspace-change", "ethone:space-change"].forEach(function (name) {
      window.addEventListener(name, syncVisibility);
    });
    window.addEventListener("resize", schedulePosition);
    document.addEventListener("keydown", function (event) {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "u") {
        event.preventDefault();
        open();
      }
    });
    setTimeout(syncVisibility, 900);
    setTimeout(syncVisibility, 2200);
  }

  window.ETHONEUniverse = {
    open: open,
    close: close,
    enter: function (id) { selectedId = id || selectedId; enterSelected(); },
    planets: PLANETS.slice()
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
