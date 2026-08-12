import { actionButton, debounce, element, icon } from "./dom.mjs";
import { bulkActionBar, createRowMenuController, createSelectionState, selectionControl } from "./dense-content.mjs";
import { emptyState } from "./empty-state.mjs";
import { refreshIcons } from "./icons.mjs";
import { createWindowController } from "./window-system.mjs";
import { createSelect } from "./select.mjs";
import { workspaceById } from "../data/workspaces.mjs";
import { CHANGELOG, CHANGELOG_KIND_ICONS, CHANGELOG_KIND_LABELS } from "../data/changelog.mjs";
import { createNotificationCenter } from "./notification-center.mjs";
import { currentLocale, translateSource } from "../i18n/catalog.mjs";

const PANEL_COPY = Object.freeze({
  widgets: { title: "Widgets", eyebrow: "Space actif", icon: "panels-top-left" },
  notifications: { title: "Notifications", eyebrow: "Centre de signal", icon: "bell" },
  profile: { title: "Profil", eyebrow: "Session locale", icon: "user-round" },
  changelog: { title: "Notes de version", eyebrow: "Historique ETHONE", icon: "sparkles" }
});

const NOTIFICATION_ICONS = Object.freeze({
  success: "check-circle-2",
  error: "circle-alert",
  warning: "triangle-alert",
  info: "info",
  sync: "refresh-cw",
  update: "circle-arrow-up",
  brain: "brain",
  loading: "loader-circle"
});

function formatTime(ts) {
  const diff = Date.now() - (ts || Date.now());
  const sec = Math.floor(diff / 1000);
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: "always", style: "short" });
  if (sec < 60) return rtf.format(-1, "second");
  const min = Math.floor(sec / 60);
  if (min < 60) return rtf.format(-min, "minute");
  const h = Math.floor(min / 60);
  if (h < 24) return rtf.format(-h, "hour");
  const d = Math.floor(h / 24);
  return rtf.format(-d, "day");
}

function panelMetric(iconName, value, label) {
  return element("div", { className: "v8-panel-metric", dataset: { liveWidget: "metric", liveKind: "metric" } }, [
    icon(iconName),
    element("strong", { text: String(value), dataset: { liveNumber: value } }),
    element("span", { text: label })
  ]);
}

function notification(item, state = {}) {
  const selected = state.selected === true;
  const read = state.read === true;
  const iconName = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.info;
  return element("article", {
    className: `v8-panel-notice v8-panel-notice--${item.type}${selected ? " is-selected" : ""}${read ? " is-read" : ""}${item.priority ? ` v8-panel-notice--priority-${item.priority}` : ""}`,
    attributes: { role: "listitem", tabindex: "0", "aria-selected": selected ? "true" : "false" },
    dataset: { notificationId: item.id }
  }, [
    selectionControl({ id: item.id, checked: selected, label: `${translateSource("Selectionner")} ${item.title}` }),
    element("span", { className: "v8-panel-notice__icon" }, [icon(iconName)]),
    element("div", {}, [element("span", { className: "v8-panel-notice__meta" }, [element("span", { text: formatTime(item.timestamp) }), item.category ? element("span", { className: "v8-panel-notice__category", text: String(item.category), attributes: { translate: "no" } }) : null]), element("strong", { text: item.title }), element("p", { text: item.message })]),
    read ? null : element("span", { className: "v8-panel-notice__dot", attributes: { "aria-label": translateSource("Non lue") } }),
    element("div", { className: "v8-row-actions" }, [element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": `${translateSource("Actions pour")} ${item.title}`, "aria-haspopup": "menu", "aria-expanded": "false" },
      dataset: { notificationMenu: item.id }
    }, [icon("more-horizontal")])])
  ]);
}

export function createPanelManager(host, options = {}) {
  let mounted = null;
  let mountedId = null;
  const shell = host.closest?.(".v8-shell");
  const windowController = createWindowController({ onEscape: () => options.onClose?.() });
  const notificationSelection = createSelectionState();
  const readNotifications = new Set();
  const dismissedNotifications = new Set();
  const notificationMenu = createRowMenuController();
  let notificationQuery = "";
  let notificationFilter = "all";
  let focusInterval = 0;
  let notificationCenter = null;
  let focusRemaining = 25 * 60;
  let focusTotal = 25 * 60;
  let focusRunning = false;
  let focusLabel = "Prêt (25 min)";

  function renderWorldClocks() {
    const hubs = [
      { city: "Paris", zone: "Europe/Paris", label: "Europe" },
      { city: "New York", zone: "America/New_York", label: "EST" },
      { city: "Tokyo", zone: "Asia/Tokyo", label: "JST" },
      { city: "San Francisco", zone: "America/Los_Angeles", label: "PST" }
    ];
    const grid = element("div", { className: "v8-world-grid" });
    const now = new Date();
    hubs.forEach((hub) => {
      let timeStr = "--:--";
      let isDay = true;
      try {
        const formatter = new Intl.DateTimeFormat(currentLocale(), { timeZone: hub.zone, hour: "2-digit", minute: "2-digit" });
        timeStr = formatter.format(now);
        const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: hub.zone, hour: "numeric", hour12: false }).format(now));
        isDay = hour >= 6 && hour < 20;
      } catch {
        timeStr = "12:00";
      }
      const dayNight = isDay ? translateSource("☀️ Jour") : translateSource("🌙 Nuit");
      const card = element("div", { className: "v8-world-card", attributes: { role: "button", tabindex: "0", title: `${translateSource("Copier l'heure de")} ${hub.city}` } }, [
        element("div", { className: "v8-world-card__top" }, [
          element("span", { className: "v8-world-card__city", text: hub.city }),
          element("span", { className: "v8-world-card__badge", text: dayNight })
        ]),
        element("div", { className: "v8-world-card__time", text: timeStr })
      ]);
      card.addEventListener("click", () => {
        options.onCopyWorldTime?.(hub.city, timeStr);
      });
      grid.append(card);
    });
    return element("section", { className: "v8-panel-section" }, [
      element("header", {}, [element("strong", { text: translateSource("Horloges & Hubs mondiaux") }), element("span", { text: translateSource("Temps réel") })]),
      grid
    ]);
  }

  function renderFocusExpress() {
    const mins = String(Math.floor(focusRemaining / 60)).padStart(2, "0");
    const secs = String(focusRemaining % 60).padStart(2, "0");
    const timerDisplay = element("span", { className: "v8-focus-express__timer", text: `${mins}:${secs}` });
    const statusDisplay = element("span", { className: "v8-focus-express__status", text: translateSource(focusLabel) });
    const fillBar = element("div", { className: "v8-focus-express__fill", attributes: { style: `width: ${Math.round(((focusTotal - focusRemaining) / focusTotal) * 100)}%;` } });

    const start25Btn = element("button", { className: "v8-button v8-button--secondary v8-button--sm", text: translateSource("25m Focus"), attributes: { type: "button" } });
    const start5Btn = element("button", { className: "v8-button v8-button--secondary v8-button--sm", text: translateSource("5m Pause"), attributes: { type: "button" } });
    const resetBtn = element("button", { className: "v8-button v8-button--outline v8-button--sm", text: focusRunning ? translateSource("Pause") : translateSource("Reset"), attributes: { type: "button" } });

    function updateView() {
      const m = String(Math.floor(focusRemaining / 60)).padStart(2, "0");
      const s = String(focusRemaining % 60).padStart(2, "0");
      timerDisplay.textContent = `${m}:${s}`;
      statusDisplay.textContent = translateSource(focusLabel);
      fillBar.style.width = `${Math.round(((focusTotal - focusRemaining) / focusTotal) * 100)}%`;
      resetBtn.textContent = focusRunning ? translateSource("Pause") : translateSource("Reset");
    }

    start25Btn.addEventListener("click", () => {
      clearInterval(focusInterval);
      focusTotal = 25 * 60;
      focusRemaining = focusTotal;
      focusRunning = true;
      focusLabel = "Focus en cours...";
      options.onTimerAction?.("start");
      focusInterval = setInterval(() => {
        if (focusRemaining > 0) {
          focusRemaining -= 1;
          updateView();
        } else {
          clearInterval(focusInterval);
          focusRunning = false;
          focusLabel = "Session Focus terminée !";
          options.onTimerAction?.("finish");
          updateView();
        }
      }, 1000);
      updateView();
    });

    start5Btn.addEventListener("click", () => {
      clearInterval(focusInterval);
      focusTotal = 5 * 60;
      focusRemaining = focusTotal;
      focusRunning = true;
      focusLabel = "Pause en cours...";
      options.onTimerAction?.("start");
      focusInterval = setInterval(() => {
        if (focusRemaining > 0) {
          focusRemaining -= 1;
          updateView();
        } else {
          clearInterval(focusInterval);
          focusRunning = false;
          focusLabel = "Pause terminée !";
          options.onTimerAction?.("finish");
          updateView();
        }
      }, 1000);
      updateView();
    });

    resetBtn.addEventListener("click", () => {
      if (focusRunning) {
        clearInterval(focusInterval);
        focusRunning = false;
        focusLabel = "En pause";
      } else {
        clearInterval(focusInterval);
        focusRemaining = 25 * 60;
        focusTotal = 25 * 60;
        focusLabel = "Prêt (25 min)";
      }
      options.onTimerAction?.("reset");
      updateView();
    });

    return element("section", { className: "v8-panel-section" }, [
      element("header", {}, [element("strong", { text: translateSource("Focus Express") }), statusDisplay]),
      element("div", { className: "v8-focus-express" }, [
        element("div", { className: "v8-focus-express__display" }, [timerDisplay, element("div", { className: "v8-focus-express__controls" }, [start25Btn, start5Btn, resetBtn])]),
        element("div", { className: "v8-focus-express__bar" }, [fillBar])
      ])
    ]);
  }

  function close(config = {}) {
    if (notificationCenter) { notificationCenter.close({ dispatch: false }); notificationCenter = null; }
    clearInterval(focusInterval);
    focusRunning = false;
    notificationMenu.close({ restoreFocus: false });
    if (!mounted && !mountedId) return false;
    const hadMounted = mounted;
    mounted = null;
    mountedId = null;
    shell?.classList.remove("has-open-panel");
    return hadMounted ? windowController.close(config) : true;
  }

  function widgetsContent() {
    const snapshot = options.snapshot?.() || {};
    const state = options.getState?.() || {};
    const openTasks = snapshot.tasks?.filter?.((task) => !task.completed)?.length || 0;
    return element("div", { className: "v8-panel__content" }, [
      element("div", { className: "v8-panel-space-summary" }, [
        element("span", { className: "v8-panel__symbol" }, [icon("layers-3")]),
        element("div", {}, [element("small", { text: "Space" }), element("strong", { text: workspaceById(state.space).label }), element("span", { text: state.flow || "Essentiel" })])
      ]),
      element("div", { className: "v8-panel-metrics" }, [
        panelMetric("notebook-pen", snapshot.notes?.length || 0, "Notes"),
        panelMetric("circle-check-big", openTasks, "A faire"),
        panelMetric("folder", snapshot.files?.length || 0, "Fichiers")
      ]),
      element("section", { className: "v8-panel-section" }, [
        element("header", {}, [element("strong", { text: "Actions rapides" }), element("span", { text: "Contexte actuel" })]),
        element("div", { className: "v8-panel-quick-grid" }, [
          actionButton({ actionId: "v8.notes.new" }, [icon("file-plus-2"), element("span", { text: "Note" })]),
          actionButton({ actionId: "v8.tasks.new" }, [icon("list-plus"), element("span", { text: "Tache" })]),
          actionButton({ actionId: "v8.calendar.new" }, [icon("calendar-plus"), element("span", { text: "Événement" })]),
          actionButton({ actionId: "v8.brain.open" }, [icon("brain"), element("span", { text: "Brain" })])
        ])
      ]),
      renderWorldClocks(),
      renderFocusExpress()
    ]);
  }

  function notificationsContent() {
    const notifications = options.notifications;
    const hasManager = notifications && typeof notifications.getHistory === "function";
    const categories = hasManager ? notifications.getCategories() : ["system", "brain", "updates"];
    const allItems = () => (hasManager ? notifications.getHistory() : []);

    const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher", "aria-label": "Rechercher dans les notifications", autocomplete: "off" } });
    search.value = notificationQuery;
    const filterOptions = [element("option", { text: "Toutes", attributes: { value: "all" } }), element("option", { text: "Non lues", attributes: { value: "unread" } })];
    categories.forEach((cat) => {
      const label = String(cat).charAt(0).toUpperCase() + String(cat).slice(1);
      filterOptions.push(element("option", { text: label, attributes: { value: cat } }));
    });
    const filter = createSelect({ className: "v8-input", attributes: { "aria-label": "Filtrer les notifications" } }, filterOptions);
    filter.value = notificationFilter;
    const list = element("div", { className: "v8-panel-notices", attributes: { role: "list", "aria-label": "Notifications" } });
    const bulkHost = element("div", { className: "v8-panel-bulk" });

    const muteHeader = element("div", { className: "v8-notification-mute" }, [element("strong", { text: "Silencieux par catégorie" })]);
    categories.forEach((cat) => {
      const muted = hasManager ? notifications.isMuted(cat) : false;
      const button = element("button", {
        className: `v8-notification-mute__cat${muted ? " is-muted" : ""}`,
        attributes: { type: "button", title: muted ? `Réactiver ${cat}` : `Mettre ${cat} en sourdine` },
        dataset: { muteCategory: cat }
      }, [icon(muted ? "volume-x" : "volume-2"), element("span", { text: cat })]);
      muteHeader.append(button);
    });

    const content = element("div", { className: "v8-panel__content v8-panel__content--notifications" }, [
      element("div", { className: "v8-panel-list-toolbar" }, [
        element("div", { className: "v8-input-wrap" }, [icon("search"), search]),
        filter,
        element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Tout marquer comme lu" }, dataset: { notificationReadAll: "" } }, [icon("check-check")])
      ]),
      hasManager ? muteHeader : null,
      bulkHost,
      list,
      actionButton({ actionId: "v8.sync.refresh", variant: "secondary" }, [icon("refresh-cw"), element("span", { text: "Vérifier la synchronisation" })])
    ]);

    function availableItems() {
      const normalized = notificationQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      return allItems().filter((item) => {
        if (notificationFilter === "unread" && item.read) return false;
        if (!["all", "unread"].includes(notificationFilter) && item.category !== notificationFilter) return false;
        const text = [item.title, item.message, item.category].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return !normalized || text.includes(normalized);
      });
    }

    function markRead(ids, read = true) {
      if (hasManager) notifications.markRead(ids, read);
      notificationSelection.clear();
      render();
    }

    function archive(ids) {
      if (hasManager) notifications.archive(ids);
      notificationSelection.clear();
      render();
    }

    function toggleMute(category) {
      if (!hasManager) return;
      if (notifications.isMuted(category)) notifications.unmuteCategory(category);
      else notifications.muteCategory(category);
      render();
    }

    function openNotificationMenu(id, anchor, point = null) {
      const item = allItems().find((entry) => entry.id === id);
      if (!item) return false;
      return notificationMenu.open(anchor, [
        { label: item.read ? "Marquer comme non lue" : "Marquer comme lue", icon: item.read ? "mail" : "mail-check", onSelect: () => markRead([id], !item.read) },
        { label: notificationSelection.has(id) ? "Retirer de la sélection" : "Ajouter à la sélection", icon: notificationSelection.has(id) ? "square-minus" : "square-check-big", onSelect: () => { notificationSelection.toggle(id); render(); } },
        { separator: true },
        { label: "Archiver", icon: "archive", tone: "danger", onSelect: () => archive([id]) }
      ], { label: `Actions pour ${item.title}`, point });
    }

    function render() {
      const available = allItems();
      notificationSelection.prune(available.map((item) => item.id));
      const visible = availableItems();
      const selectedCount = notificationSelection.size();
      bulkHost.replaceChildren(bulkActionBar({
        count: selectedCount,
        selection: notificationSelection,
        visibleIds: visible.map((item) => item.id),
        onToggleAll: (checked) => { visible.forEach((item) => notificationSelection.toggle(item.id, checked)); render(); },
        onClear: () => { notificationSelection.clear(); render(); },
        actions: [
          { label: "Marquer lues", icon: "mail-check", onSelect: () => markRead(notificationSelection.values(), true) },
          { label: "Archiver", icon: "archive", tone: "danger", onSelect: () => archive(notificationSelection.values()) }
        ]
      }));
      if (hasManager) {
        const cats = notifications.getCategories();
        const container = content.querySelector(".v8-notification-mute");
        if (container) {
          container.replaceChildren(element("strong", { text: "Silencieux par catégorie" }));
          cats.forEach((cat) => {
            const muted = notifications.isMuted(cat);
            const button = element("button", {
              className: `v8-notification-mute__cat${muted ? " is-muted" : ""}`,
              attributes: { type: "button", title: muted ? `Réactiver ${cat}` : `Mettre ${cat} en sourdine` },
              dataset: { muteCategory: cat }
            }, [icon(muted ? "volume-x" : "volume-2"), element("span", { text: cat })]);
            container.append(button);
          });
        }
      }
      list.replaceChildren();
      if (!visible.length) {
        list.append(emptyState({
          kind: notificationQuery || notificationFilter !== "all" ? "no-results" : "empty",
          iconName: notificationQuery || notificationFilter !== "all" ? "search-x" : "inbox",
          eyebrow: "Centre de signal",
          title: notificationQuery || notificationFilter !== "all" ? "Aucun résultat" : "Tout est traité",
          description: notificationQuery || notificationFilter !== "all" ? "Aucune notification ne correspond à cette vue." : "Les nouveaux signaux apparaîtront ici sans masquer votre travail.",
          compact: true
        }));
      } else {
        visible.forEach((item) => list.append(notification(item, { selected: notificationSelection.has(item.id), read: item.read })));
      }
      refreshIcons();
    }

    content.addEventListener("click", (event) => {
      const select = event.target.closest("[data-collection-select]");
      if (select && content.contains(select)) {
        notificationSelection.toggle(select.dataset.collectionSelect);
        render();
        return;
      }
      const menu = event.target.closest("[data-notification-menu]");
      if (menu && content.contains(menu)) {
        openNotificationMenu(menu.dataset.notificationMenu, menu);
        return;
      }
      const mute = event.target.closest("[data-mute-category]");
      if (mute && content.contains(mute)) {
        toggleMute(mute.dataset.muteCategory);
        return;
      }
      if (event.target.closest("[data-notification-read-all]")) {
        if (hasManager) notifications.markAllRead();
        else markRead(allItems().map((item) => item.id), true);
        notificationSelection.clear();
        render();
        return;
      }
      const row = event.target.closest("[data-notification-id]");
      if (row && !event.target.closest("button,input,select,a")) {
        notificationSelection.toggle(row.dataset.notificationId);
        render();
      }
    });
    content.addEventListener("contextmenu", (event) => {
      const row = event.target.closest("[data-notification-id]");
      if (!row) return;
      event.preventDefault();
      openNotificationMenu(row.dataset.notificationId, row, { x: event.clientX, y: event.clientY });
    });
    content.addEventListener("keydown", (event) => {
      const row = event.target.closest("[data-notification-id]");
      if (!row || event.target !== row || ![" ", "Enter"].includes(event.key)) return;
      event.preventDefault();
      notificationSelection.toggle(row.dataset.notificationId);
      render();
    });
    const debouncedRender = debounce(render, 120);
    search.addEventListener("input", () => { notificationQuery = search.value; debouncedRender(); });
    filter.addEventListener("change", () => { notificationFilter = filter.value; render(); });
    render();
    return content;
  }

  function changelogItemNode(item) {
    return element("li", { className: `v8-changelog-item v8-changelog-item--${item.kind}` }, [
      element("span", { className: "v8-changelog-item__icon" }, [icon(CHANGELOG_KIND_ICONS[item.kind] || "circle")]),
      element("div", { className: "v8-changelog-item__body" }, [
        element("span", { className: "v8-changelog-item__label", text: CHANGELOG_KIND_LABELS[item.kind] || "" }),
        element("p", { text: item.text, attributes: { translate: "no" } })
      ])
    ]);
  }

  function changelogEntryNode(release) {
    return element("article", { className: "v8-changelog-entry" }, [
      element("header", {}, [
        element("span", { className: "v8-changelog-entry__version", text: release.version, attributes: { translate: "no" } }),
        element("time", { className: "v8-changelog-entry__date", text: release.date, attributes: { translate: "no" } })
      ]),
      element("strong", { className: "v8-changelog-entry__title", text: release.title, attributes: { translate: "no" } }),
      element("ul", { className: "v8-changelog-entry__items" }, release.items.map(changelogItemNode))
    ]);
  }

  function changelogContent() {
    return element("div", { className: "v8-panel__content v8-panel__content--changelog" }, [
      element("p", { className: "v8-changelog-intro", text: "Ce qui a change recemment dans ETHONE, du plus recent au plus ancien." }),
      element("div", { className: "v8-changelog-list" }, CHANGELOG.map(changelogEntryNode))
    ]);
  }

  function profileAvatarNode(user) {
    const avatar = user?.avatar;
    if (avatar && avatar.kind === "image" && avatar.value) {
      return element("img", { className: "v8-panel-profile-card__avatar", attributes: { src: avatar.value, alt: "", loading: "lazy", referrerpolicy: "no-referrer" } });
    }
    const glyph = avatar && (avatar.kind === "symbol" || avatar.kind === "initials") ? avatar.value : (user?.initial || "R");
    return element("span", { className: "v8-panel-profile-card__avatar", text: String(glyph) });
  }

  function profileContent() {
    const state = options.getState?.() || {};
    const user = options.user || {};
    const profiles = options.repository?.listProfiles?.() || [];
    const activeProfile = options.repository?.activeProfile?.() || null;

    const language = createSelect({ className: "v8-input", attributes: { "aria-label": "Langue de l'interface", translate: "no" } }, [
      element("option", { text: "Francais", attributes: { value: "fr" } }),
      element("option", { text: "English", attributes: { value: "en" } }),
      element("option", { text: "Espanol", attributes: { value: "es" } }),
      element("option", { text: "Deutsch", attributes: { value: "de" } })
    ]);
    language.value = options.currentLocale?.() || "fr";
    language.addEventListener("change", () => options.onLocaleChange?.(language.value));

    const switcherList = element("div", { className: "v8-profile-switcher-list" });
    profiles.forEach((profile) => {
      const isActive = activeProfile ? String(profile.id) === String(activeProfile.id) : (user.name === profile.name);
      const actionBtn = isActive
        ? element("span", { className: "v8-badge v8-badge--accent", text: "Actif" })
        : element("button", {
            className: "v8-button v8-button--secondary v8-button--sm",
            text: "Basculer",
            attributes: { type: "button" }
          });

      if (!isActive) {
        actionBtn.addEventListener("click", () => {
          options.onSelectProfile?.(profile.id);
        });
      }

      const item = element("div", { className: `v8-profile-switcher-item${isActive ? " is-active" : ""}` }, [
        element("div", { className: "v8-profile-switcher-item__left" }, [
          profileAvatarNode(profile.avatar || { kind: "initials", value: profile.name?.[0] || "E" }),
          element("div", { className: "v8-profile-switcher-item__info" }, [
            element("strong", { text: profile.name || "Profil", attributes: { translate: "no" } }),
            element("span", { text: profile.typeLabel || profile.type || "Personnel" })
          ])
        ]),
        actionBtn
      ]);
      switcherList.append(item);
    });

    const createProfileBtn = element("button", {
      className: "v8-button v8-button--outline v8-button--full",
      attributes: { type: "button", style: "margin-top: 8px;" }
    }, [icon("plus"), element("span", { text: "Créer / Gérer un compte unique" })]);
    createProfileBtn.addEventListener("click", () => {
      options.onClose?.();
      options.onCreateProfile?.();
    });

    return element("div", { className: "v8-panel__content" }, [
      element("div", { className: "v8-panel-profile-card" }, [
        profileAvatarNode(user),
        element("div", {}, [element("strong", { text: user.name || "Rub", attributes: { translate: "no" } }), element("span", { text: `${workspaceById(state.space).label} | ${state.flow || "Essentiel"}` })]),
        element("span", { className: "v8-badge v8-badge--accent", text: "En ligne" })
      ]),
      element("section", { className: "v8-panel-section" }, [
        element("header", {}, [element("strong", { text: "Comptes & Environnements uniques" }), element("span", { text: `${profiles.length} compte(s)` })]),
        switcherList,
        createProfileBtn
      ]),
      element("label", { className: "v8-panel__language" }, [element("span", { text: "Langue" }), language]),
      element("div", { className: "v8-panel__actions" }, [
        actionButton({ actionId: "v8.profiles.open", variant: "secondary" }, [icon("layout-grid"), element("span", { text: "Choix de profil" })]),
        actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Réglages" })]),
        actionButton({ actionId: "v8.changelog.open", variant: "secondary" }, [icon("badge-check"), element("span", { text: "Notes de version" })]),
        actionButton({ actionId: "v8.auth.signout", variant: "outline" }, [icon("log-out"), element("span", { text: "Se déconnecter" })])
      ])
    ]);
  }

  function open(id) {
    close({ restoreFocus: false });
    const copy = PANEL_COPY[id];
    if (!copy) return false;
    if (id === "notifications" && options.notifications) {
      mountedId = "notifications";
      shell?.classList.add("has-open-panel");
      const onClose = () => options.onClose?.();
      notificationCenter = createNotificationCenter(options.notifications, {
        container: host,
        shell,
        actions: options.actions || null,
        externalServices: options.externalServices || null,
        notify: options.notify || (() => {}),
        onClose
      });
      notificationCenter.open();
      refreshIcons();
      return true;
    }
    const content = id === "widgets" ? widgetsContent() : id === "notifications" ? notificationsContent() : id === "changelog" ? changelogContent() : profileContent();
    const panel = element("aside", {
      className: "v8-panel",
      attributes: { role: "dialog", "aria-modal": "false", "aria-label": copy.title }
    }, [
      element("header", { className: "v8-panel__header" }, [
        element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
        element("div", {}, [element("span", { className: "v8-eyebrow", text: translateSource(copy.eyebrow) }), element("strong", { text: copy.title })]),
        actionButton({ actionId: "v8.panel.close", className: "v8-icon-button", ariaLabel: translateSource("Fermer le panneau") }, [icon("x")])
      ]),
      content
    ]);
    host.append(panel);
    mounted = panel;
    mountedId = id;
    shell?.classList.add("has-open-panel");
    refreshIcons();
    return windowController.open(panel, { initialFocus: () => panel.querySelector("button, select"), modal: false });
  }

  return Object.freeze({
    open,
    close,
    current: () => mountedId,
    notificationCount: () => options.notifications?.unreadCount?.() || 0,
    destroy: () => {
      clearInterval(focusInterval);
      notificationMenu.destroy();
      shell?.classList.remove("has-open-panel");
      windowController.destroy();
    }
  });
}
