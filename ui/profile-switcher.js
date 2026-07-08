/* ETHONE Profile Switcher
   Premium, non-destructive profile entry point for the existing profile system. */
(function initEthoneProfileSwitcher(global) {
  "use strict";

  if (global.ETHONEProfileSwitcher) return;

  var root = null;
  var isOpen = false;
  var entrypointsBound = false;

  function manager() {
    return global.ETHONEProfileManager || null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeCall(label, fn) {
    try {
      if (typeof fn === "function") return fn();
    } catch (error) {
      console.warn("[ETHONE profile switcher] " + label + " failed", error);
    }
    return null;
  }

  function currentId() {
    var api = manager();
    var current = api && api.current ? api.current() : null;
    return current ? String(current.id) : "";
  }

  function profileType(profile) {
    return profile && (profile.profileType || profile.type) ? String(profile.profileType || profile.type) : "personal";
  }

  function profileAccent(profile) {
    if (profile && profile.theme && profile.theme.customAccent) return profile.theme.customAccent;
    if (profile && profile.customAccent) return profile.customAccent;
    var api = manager();
    var tpl = api && api.templates ? api.templates[profileType(profile)] : null;
    return (tpl && tpl.accent) || "#8b5cf6";
  }

  function avatarMarkup(profile) {
    if (!profile) return "<span>U</span>";
    if (profile.avatarImg) {
      return '<img src="' + escapeHtml(profile.avatarImg) + '" alt="" onerror="this.remove()">';
    }
    var letter = escapeHtml((profile.name || "U").slice(0, 1).toUpperCase());
    return "<span>" + letter + "</span>";
  }

  function statsFor(profile) {
    var state = (profile && profile.state) || {};
    var todos = Array.isArray(state.todos) ? state.todos : [];
    var openTasks = todos.filter(function (todo) { return !todo.done && !todo.completed; }).length;
    var notes = Array.isArray(state.notes) ? state.notes.length : 0;
    var spaces = Array.isArray(profile && profile.workspaces) ? profile.workspaces.length : 0;
    var widgets = profile && profile.dashboardProfile && Array.isArray(profile.dashboardProfile.widgets) ? profile.dashboardProfile.widgets.length : 0;
    return [
      { label: "Notes", value: notes },
      { label: "Taches", value: openTasks },
      { label: "Spaces", value: spaces },
      { label: "Widgets", value: widgets }
    ];
  }

  function templateMarkup() {
    var api = manager();
    var templates = api && api.templates ? api.templates : {};
    return Object.keys(templates).map(function (key) {
      var tpl = templates[key];
      return '<button type="button" class="eps-template" data-eps-action="create-template" data-template="' + escapeHtml(key) + '" style="--eps-template-accent:' + escapeHtml(tpl.accent) + '">' +
        '<span class="eps-template-icon">' + escapeHtml(tpl.icon || key.slice(0, 1).toUpperCase()) + '</span>' +
        '<span><strong>' + escapeHtml(tpl.label) + '</strong><small>' + escapeHtml(tpl.description) + '</small></span>' +
      '</button>';
    }).join("");
  }

  function profileCard(profile) {
    var id = String(profile.id);
    var active = id === currentId();
    var stats = statsFor(profile).map(function (item) {
      return '<span><strong>' + escapeHtml(item.value) + '</strong>' + escapeHtml(item.label) + '</span>';
    }).join("");
    var description = profile.description || (profile.state && profile.state.bio) || "Profil ETHONE";
    return '<article class="eps-profile-card' + (active ? " is-active" : "") + '" role="button" tabindex="0" data-profile-id="' + escapeHtml(id) + '" style="--eps-profile-accent:' + escapeHtml(profileAccent(profile)) + '">' +
      '<div class="eps-profile-glow" aria-hidden="true"></div>' +
      '<div class="eps-profile-head">' +
        '<div class="eps-profile-avatar">' + avatarMarkup(profile) + '</div>' +
        '<div class="eps-profile-title">' +
          '<h3>' + escapeHtml(profile.name || "User") + '</h3>' +
          '<p>' + escapeHtml(profileType(profile)) + '</p>' +
        '</div>' +
        (active ? '<span class="eps-current-badge">Actif</span>' : '<button type="button" class="eps-mini-action" data-eps-action="switch" data-profile-id="' + escapeHtml(id) + '">Activer</button>') +
      '</div>' +
      '<p class="eps-description">' + escapeHtml(description) + '</p>' +
      '<div class="eps-profile-stats">' + stats + '</div>' +
      '<div class="eps-profile-actions">' +
        '<button type="button" data-eps-action="edit" data-profile-id="' + escapeHtml(id) + '">Modifier</button>' +
        '<button type="button" data-eps-action="duplicate" data-profile-id="' + escapeHtml(id) + '">Dupliquer</button>' +
      '</div>' +
    '</article>';
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "ethone-profile-switcher-root";
    root.className = "ethone-profile-switcher";
    root.setAttribute("aria-hidden", "true");
    document.body.appendChild(root);
    root.addEventListener("click", onRootClick);
    root.addEventListener("keydown", onRootKeydown);
    return root;
  }

  function render() {
    var api = manager();
    var profiles = api && api.list ? api.list() : [];
    var current = api && api.current ? api.current() : profiles[0];
    var currentName = current ? current.name : "ETHONE";
    var currentDescription = current ? (current.description || (current.state && current.state.bio) || "Votre environnement actif") : "Votre environnement actif";
    ensureRoot().innerHTML =
      '<div class="eps-backdrop" data-eps-action="close"></div>' +
      '<section class="eps-shell" role="dialog" aria-modal="true" aria-labelledby="eps-title">' +
        '<header class="eps-header">' +
          '<div>' +
            '<span class="eps-kicker">ETHONE Profiles</span>' +
            '<h2 id="eps-title">Changer d\'environnement</h2>' +
            '<p>' + escapeHtml(currentDescription) + '</p>' +
          '</div>' +
          '<div class="eps-current-mini">' +
            '<div class="eps-current-avatar">' + avatarMarkup(current) + '</div>' +
            '<span><strong>' + escapeHtml(currentName) + '</strong><small>Profil actif</small></span>' +
          '</div>' +
          '<button type="button" class="eps-close" data-eps-action="close" aria-label="Fermer">x</button>' +
        '</header>' +
        '<div class="eps-body">' +
          '<div class="eps-profiles">' + profiles.map(profileCard).join("") + '</div>' +
          '<aside class="eps-side">' +
            '<div class="eps-side-panel">' +
              '<span class="eps-kicker">Creer vite</span>' +
              '<h3>Nouveau profil</h3>' +
              '<p>Chaque profil garde son theme, ses widgets, ses workspaces et ses preferences.</p>' +
              '<div class="eps-template-list">' + templateMarkup() + '</div>' +
            '</div>' +
            '<div class="eps-side-actions">' +
              '<button type="button" data-eps-action="legacy-manage">Gestion complete</button>' +
              '<button type="button" data-eps-action="create-legacy">Profil personnalise</button>' +
            '</div>' +
          '</aside>' +
        '</div>' +
      '</section>';
  }

  function open() {
    if (!manager()) {
      if (typeof global.toast === "function") global.toast("Gestionnaire de profils indisponible", "error");
      return false;
    }
    render();
    isOpen = true;
    ensureRoot().classList.add("is-open");
    ensureRoot().setAttribute("aria-hidden", "false");
    document.body.classList.add("ethone-profile-switcher-open");
    setTimeout(function () {
      var first = root && root.querySelector(".eps-profile-card.is-active,.eps-profile-card,.eps-close");
      if (first && typeof first.focus === "function") first.focus({ preventScroll: true });
    }, 60);
    return true;
  }

  function close() {
    if (!root) return;
    isOpen = false;
    root.classList.remove("is-open");
    root.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ethone-profile-switcher-open");
  }

  function toggle() {
    return isOpen ? close() : open();
  }

  function onRootClick(event) {
    var actionEl = event.target.closest("[data-eps-action]");
    var card = event.target.closest(".eps-profile-card[data-profile-id]");
    if (!actionEl && !card) return;
    event.preventDefault();
    event.stopPropagation();

    var api = manager();
    var action = actionEl && actionEl.dataset.epsAction;
    var profileId = (actionEl && actionEl.dataset.profileId) || (card && card.dataset.profileId);

    if (action === "close") return close();
    if (action === "legacy-manage") {
      close();
      if (typeof global.goToProfileScreen === "function") global.goToProfileScreen();
      return;
    }
    if (action === "create-legacy") {
      close();
      if (typeof global.openCreateProfile === "function") global.openCreateProfile();
      return;
    }
    if (action === "create-template") {
      var created = api && api.createFromTemplate ? api.createFromTemplate(actionEl.dataset.template || "personal") : null;
      if (created && api.switchTo) api.switchTo(created.id);
      close();
      return;
    }
    if (action === "edit") {
      close();
      if (typeof global.openEditProfile === "function") global.openEditProfile(profileId);
      return;
    }
    if (action === "duplicate") {
      if (api && api.duplicate) {
        api.duplicate(profileId);
        render();
      }
      return;
    }
    if ((action === "switch" || !action) && profileId && api && api.switchTo) {
      api.switchTo(profileId);
      close();
    }
  }

  function onRootKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target.closest("button,a,input,select,textarea")) return;
    var card = event.target.closest(".eps-profile-card[data-profile-id]");
    var api = manager();
    if (!card || !api || !api.switchTo) return;
    event.preventDefault();
    api.switchTo(card.dataset.profileId);
    close();
  }

  function onKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  function bindEntrypoints() {
    if (entrypointsBound) return;
    entrypointsBound = true;
    document.addEventListener("click", function (event) {
      if (event.target.closest("#ethone-profile-switcher-root")) return;
      var trigger = event.target.closest("#topbar-profile-btn,#mob-topbar-avatar,#mob-topbar-name,#main-sidebar .user-card,[data-action-id='profile.switch'],[data-ethone-action='profile.switch']");
      if (!trigger) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      open();
    }, true);
    document.addEventListener("keydown", onKeydown, true);
  }

  function registerAction() {
    var actions = global.ETHONEActions || global.ACTION_REGISTRY || (global.Ethone && global.Ethone.get && global.Ethone.get("actions"));
    if (!actions || typeof actions.register !== "function") return false;
    actions.register("profiles.open", { label: "Open profiles", handler: open });
    actions.register("profile.switch", { label: "Switch profile", handler: function (ctx) {
      if (ctx && ctx.profileId && manager()) return manager().switchTo(ctx.profileId);
      return open();
    } });
    return true;
  }

  var api = {
    open: open,
    close: close,
    toggle: toggle,
    refresh: function () { if (isOpen) render(); },
    isOpen: function () { return isOpen; }
  };

  global.ETHONEProfileSwitcher = api;

  function boot() {
    bindEntrypoints();
    if (!registerAction()) setTimeout(registerAction, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  global.addEventListener("ethone:profile-created", function () { if (isOpen) render(); });
  global.addEventListener("ethone:profile-changed", function () { if (isOpen) render(); });
})(window);
