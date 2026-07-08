/*
 * ETHONE Settings V2 shell.
 * Reorganizes the existing settings UI while preserving every legacy handler.
 */
(function () {
  "use strict";

  if (window.__ethoneSettingsV2) return;
  window.__ethoneSettingsV2 = true;

  var META = {
    profilee: { label: "Profile", icon: "user-round", group: "Personal", description: "Manage your identity, profile details, avatar and language." },
    account: { label: "Account", icon: "circle-user-round", group: "Personal", description: "Review your ETHONE account, credentials and current session." },
    theme: { label: "Appearance", icon: "palette", group: "Personal", description: "Tune the visual language, density, motion and overall feel of ETHONE." },
    workspaces: { label: "Workspaces", icon: "panels-top-left", group: "System", description: "Organize named spaces and choose the context ETHONE opens with." },
    widgets: { label: "Dashboard", icon: "layout-dashboard", group: "System", description: "Control dashboard widgets, visibility and layout preferences." },
    brain: { label: "Brain & AI", icon: "brain", group: "System", description: "Inspect ETHONE AI Core and open advanced provider configuration." },
    automation: { label: "Automations", icon: "zap", group: "System", description: "Create and manage rules that run repetitive actions for you." },
    marketplace: { label: "Marketplace", icon: "store", group: "System", description: "Review installed content and discover extensions for your system." },
    plugins: { label: "Integrations", icon: "plug", group: "System", description: "Connect services and manage the tools available across ETHONE." },
    notifications: { label: "Notifications", icon: "bell", group: "Preferences", description: "Choose when and how ETHONE is allowed to get your attention." },
    keyboard: { label: "Keyboard shortcuts", icon: "command", group: "Preferences", description: "Review every keyboard command and speed up common workflows." },
    backup: { label: "Backup & sync", icon: "cloud", group: "Preferences", description: "Sync, download or restore a secure copy of your ETHONE data." },
    importx: { label: "Import", icon: "upload", group: "Preferences", description: "Bring a compatible ETHONE data archive into this profile." },
    exportx: { label: "Export", icon: "download", group: "Preferences", description: "Download your profile data in a portable JSON archive." },
    security: { label: "Security", icon: "shield-check", group: "Preferences", description: "Protect this profile and manage local access controls." },
    developer: { label: "Developer", icon: "terminal", group: "Advanced", description: "Inspect the runtime environment, diagnostics and local caches." },
    experimental: { label: "Experimental", icon: "flask-conical", group: "Advanced", description: "Preview advanced capabilities that are still being evaluated." }
  };

  var ORDER = [
    "profilee", "account", "theme",
    "workspaces", "widgets", "brain", "automation", "marketplace", "plugins",
    "notifications", "keyboard", "backup", "importx", "exportx", "security",
    "developer", "experimental"
  ];

  var currentTab = "profilee";
  var originalSwitch = null;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function tabFromButton(button) {
    if (!button) return "";
    var explicit = button.getAttribute("data-settings-tab");
    if (explicit) return explicit;
    var onclick = button.getAttribute("onclick") || "";
    var match = /switchSettingsTab\(['"]([^'"]+)/.exec(onclick);
    return match ? match[1] : "";
  }

  function iconMarkup(name) {
    return '<i data-lucide="' + name + '" aria-hidden="true"></i>';
  }

  function safeProfile() {
    try {
      if (typeof window.curP === "function") return window.curP() || {};
    } catch (error) {}
    return {};
  }

  function profileInitial(name) {
    return String(name || "E").trim().charAt(0).toUpperCase() || "E";
  }

  function renderProfileSummary() {
    var target = qs(".settings-v2-profile");
    if (!target) return;
    var profile = safeProfile();
    var name = profile.name || profile.username || "ETHONE User";
    var subtitle = profile.email || "Personal workspace";
    var avatar = profile.avatar || profile.avatarUrl || "";
    var avatarHTML = avatar
      ? '<img src="' + String(avatar).replace(/"/g, "&quot;") + '" alt="">'
      : profileInitial(name);
    target.innerHTML =
      '<div class="settings-v2-avatar">' + avatarHTML + '</div>' +
      '<div><strong>' + String(name).replace(/[&<>"]/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
      }) + '</strong><span>' + String(subtitle).replace(/[&<>"]/g, function (char) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
      }) + '</span></div>';
  }

  function buildNav(nav) {
    if (qs(".settings-v2-nav-head", nav)) return;

    var buttons = Array.prototype.slice.call(nav.querySelectorAll(".settings-nav-item"));
    var byTab = {};
    buttons.forEach(function (button) {
      var tab = tabFromButton(button);
      if (!tab || !META[tab]) return;
      byTab[tab] = button;
      button.setAttribute("data-settings-tab", tab);
      button.setAttribute("title", META[tab].label);
      var icon = qs(".settings-nav-icon", button);
      if (icon) icon.innerHTML = iconMarkup(META[tab].icon);
      var label = button.querySelector("span:last-child");
      if (label && !label.hasAttribute("data-i18n")) label.textContent = META[tab].label;
    });

    var head = document.createElement("div");
    head.className = "settings-v2-nav-head";
    head.innerHTML =
      '<button class="settings-v2-back" type="button" aria-label="Back to dashboard" title="Back to dashboard">' +
        iconMarkup("arrow-left") +
      '</button>' +
      '<h2 class="settings-v2-nav-title">Settings</h2>' +
      '<label class="settings-v2-search">' +
        iconMarkup("search") +
        '<input type="search" id="settings-v2-search-input" placeholder="Search settings" autocomplete="off" aria-label="Search settings">' +
        '<span class="settings-v2-search-kbd">/</span>' +
      '</label>';

    var list = document.createElement("div");
    list.className = "settings-v2-nav-list";
    var lastGroup = "";
    ORDER.forEach(function (tab) {
      var button = byTab[tab];
      if (!button) return;
      var group = META[tab].group;
      if (group !== lastGroup) {
        var label = document.createElement("div");
        label.className = "settings-v2-group-label";
        label.textContent = group;
        list.appendChild(label);
        lastGroup = group;
      }
      list.appendChild(button);
    });
    var empty = document.createElement("div");
    empty.className = "settings-v2-nav-empty";
    empty.textContent = "No matching setting.";
    list.appendChild(empty);

    var foot = document.createElement("div");
    foot.className = "settings-v2-nav-foot";
    foot.innerHTML = '<div class="settings-v2-profile"></div>';

    nav.prepend(head);
    nav.appendChild(list);
    nav.appendChild(foot);

    qs(".settings-v2-back", nav).addEventListener("click", function () {
      var Actions = window.Ethone && window.Ethone.get && window.Ethone.get("actions");
      if (Actions && Actions.dispatch) Actions.dispatch("dashboard.open", { source: "settings-v2" });
      else if (typeof window.switchPage === "function") window.switchPage("dashboard");
    });

    var search = qs("#settings-v2-search-input", nav);
    search.addEventListener("input", function () {
      var query = search.value.trim().toLowerCase();
      var visibleCount = 0;
      ORDER.forEach(function (tab) {
        var button = byTab[tab];
        if (!button) return;
        var match = !query ||
          META[tab].label.toLowerCase().indexOf(query) !== -1 ||
          META[tab].description.toLowerCase().indexOf(query) !== -1 ||
          META[tab].group.toLowerCase().indexOf(query) !== -1;
        button.hidden = !match;
        if (match) visibleCount += 1;
      });
      Array.prototype.forEach.call(list.querySelectorAll(".settings-v2-group-label"), function (groupLabel) {
        var node = groupLabel.nextElementSibling;
        var hasVisible = false;
        while (node && !node.classList.contains("settings-v2-group-label") && !node.classList.contains("settings-v2-nav-empty")) {
          if (node.classList.contains("settings-nav-item") && !node.hidden) hasVisible = true;
          node = node.nextElementSibling;
        }
        groupLabel.hidden = !hasVisible;
      });
      empty.style.display = visibleCount ? "none" : "block";
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      var activeTag = document.activeElement && document.activeElement.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
      var page = qs("#page-settings");
      if (!page || !page.classList.contains("active")) return;
      event.preventDefault();
      search.focus();
    });

    renderProfileSummary();
  }

  function buildContentHead(content) {
    if (qs(".settings-v2-page-head", content)) return;
    var head = document.createElement("header");
    head.className = "settings-v2-page-head";
    head.innerHTML =
      '<div class="settings-v2-page-title-wrap">' +
        '<h1 class="settings-v2-page-title" id="settings-v2-title">Profile</h1>' +
        '<p class="settings-v2-page-description" id="settings-v2-description"></p>' +
      '</div>' +
      '<div class="settings-v2-save-state"><span class="settings-v2-save-dot"></span><span>Saved automatically</span></div>';
    content.prepend(head);
  }

  function buildContext(layout) {
    if (qs(".settings-v2-context", layout)) return;
    var aside = document.createElement("aside");
    aside.className = "settings-v2-context";
    aside.setAttribute("aria-label", "ETHONE live preview");
    aside.innerHTML =
      '<div class="settings-v2-context-label">Live preview</div>' +
      '<h2 class="settings-v2-context-title">Your ETHONE system</h2>' +
      '<p class="settings-v2-context-copy" id="settings-v2-context-copy">A quiet preview of the current interface settings.</p>' +
      '<div class="settings-v2-preview">' +
        '<div class="settings-v2-preview-bar"><span class="settings-v2-preview-mark">E</span><span>ETHONE</span></div>' +
        '<div class="settings-v2-preview-body">' +
          '<div class="settings-v2-preview-rail">' +
            '<span class="active">' + iconMarkup("house") + '</span>' +
            '<span>' + iconMarkup("brain") + '</span>' +
            '<span>' + iconMarkup("square-check-big") + '</span>' +
            '<span>' + iconMarkup("calendar-days") + '</span>' +
            '<span>' + iconMarkup("settings-2") + '</span>' +
          '</div>' +
          '<div class="settings-v2-preview-main">' +
            '<div class="settings-v2-preview-time" id="settings-v2-preview-time">--:--</div>' +
            '<div class="settings-v2-preview-date" id="settings-v2-preview-date">ETHONE is ready</div>' +
            '<div class="settings-v2-mini-card brain">' +
              '<div class="settings-v2-mini-label">Brain</div>' +
              '<div class="settings-v2-mini-title">Your workspace is organized and ready.</div>' +
              '<div class="settings-v2-mini-progress"><span></span></div>' +
            '</div>' +
            '<div class="settings-v2-mini-card">' +
              '<div class="settings-v2-mini-label">Focus</div>' +
              '<div class="settings-v2-mini-title">Continue your highest-priority task.</div>' +
            '</div>' +
            '<div class="settings-v2-mini-card">' +
              '<div class="settings-v2-mini-label">Today</div>' +
              '<div class="settings-v2-mini-title">3 tasks · 1 workspace update</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="settings-v2-system"><span></span>All systems operational</div>';
    layout.appendChild(aside);
  }

  function updateClock() {
    var time = qs("#settings-v2-preview-time");
    var date = qs("#settings-v2-preview-date");
    if (!time || !date) return;
    var now = new Date();
    time.textContent = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    try {
      date.textContent = now.toLocaleDateString(document.documentElement.lang || "en", {
        weekday: "long",
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      date.textContent = "ETHONE is ready";
    }
  }

  function updateHead(tab) {
    var meta = META[tab] || META.profilee;
    currentTab = tab;
    var title = qs("#settings-v2-title");
    var description = qs("#settings-v2-description");
    var context = qs("#settings-v2-context-copy");
    if (title) title.textContent = meta.label;
    if (description) description.textContent = meta.description;
    if (context) context.textContent = tab === "theme"
      ? "Changes appear instantly across the ETHONE interface."
      : "This preview stays synchronized with your personal operating system.";
    var content = qs("#page-settings .settings-content");
    if (content && window.matchMedia("(max-width: 760px)").matches) {
      content.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function wrapSwitchHandler() {
    if (window.switchSettingsTab && window.switchSettingsTab.__settingsV2Wrapped) return;
    if (typeof window.switchSettingsTab !== "function") return;
    originalSwitch = window.switchSettingsTab;
    var wrapped = function (tab, element) {
      originalSwitch(tab, element);
      updateHead(tab);
    };
    wrapped.__settingsV2Wrapped = true;
    window.switchSettingsTab = wrapped;
  }

  function mount() {
    var page = qs("#page-settings");
    var layout = qs(".settings-layout", page);
    var nav = qs(".settings-nav", page);
    var content = qs(".settings-content", page);
    if (!page || !layout || !nav || !content) return;

    page.classList.add("settings-v2");
    buildNav(nav);
    buildContentHead(content);
    buildContext(layout);
    wrapSwitchHandler();

    var active = qs(".settings-nav-item.active", nav);
    updateHead(tabFromButton(active) || currentTab);
    updateClock();
    renderProfileSummary();

    try {
      if (window.lucide && !window.__lucideFailed) window.lucide.createIcons();
    } catch (error) {}

    if (!window.__ethoneSettingsV2Clock) {
      window.__ethoneSettingsV2Clock = setInterval(updateClock, 60000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  window.addEventListener("ethone:page-ready", function (event) {
    if (event && event.detail && event.detail.page === "settings") {
      mount();
      renderProfileSummary();
      updateClock();
    }
  });
}());
