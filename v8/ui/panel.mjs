import { actionButton, element, icon } from "./dom.mjs";
import { bulkActionBar, createRowMenuController, createSelectionState, selectionControl } from "./dense-content.mjs";
import { emptyState } from "./empty-state.mjs";
import { refreshIcons } from "./icons.mjs";
import { createWindowController } from "./window-system.mjs";
import { createSelect } from "./select.mjs";
import { workspaceById } from "../data/workspaces.mjs";

const PANEL_COPY = Object.freeze({
  widgets: { title: "Widgets", eyebrow: "Space actif", icon: "panels-top-left" },
  notifications: { title: "Notifications", eyebrow: "Centre de signal", icon: "bell" },
  profile: { title: "Profil", eyebrow: "Session locale", icon: "user-round" }
});

const NOTIFICATION_ITEMS = Object.freeze([
  Object.freeze({ id: "cloud-sync", icon: "cloud", title: "Cloud Sync", message: "Les donnees locales sont a jour.", tone: "success", category: "system", time: "A l'instant" }),
  Object.freeze({ id: "brain-context", icon: "brain", title: "Brain est contextuel", message: "Les suggestions suivent maintenant la page et le Space actifs.", tone: "brain", category: "brain", time: "Il y a 2 min" }),
  Object.freeze({ id: "experience-update", icon: "sparkles", title: "Experience 1.0", message: "Le nouveau Shell et Mission Control sont disponibles.", tone: "info", category: "updates", time: "Aujourd'hui" })
]);

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
  return element("article", {
    className: `v8-panel-notice v8-panel-notice--${item.tone}${selected ? " is-selected" : ""}${read ? " is-read" : ""}`,
    attributes: { role: "listitem", tabindex: "0", "aria-selected": selected ? "true" : "false" },
    dataset: { notificationId: item.id }
  }, [
    selectionControl({ id: item.id, checked: selected, label: `Selectionner ${item.title}` }),
    element("span", { className: "v8-panel-notice__icon" }, [icon(item.icon)]),
    element("div", {}, [element("span", { className: "v8-panel-notice__meta", text: item.time }), element("strong", { text: item.title }), element("p", { text: item.message })]),
    read ? null : element("span", { className: "v8-panel-notice__dot", attributes: { "aria-label": "Non lue" } }),
    element("div", { className: "v8-row-actions" }, [element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": `Actions pour ${item.title}`, "aria-haspopup": "menu", "aria-expanded": "false" },
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

  function close(config = {}) {
    if (!mounted) return false;
    notificationMenu.close({ restoreFocus: false });
    mounted = null;
    mountedId = null;
    shell?.classList.remove("has-open-panel");
    return windowController.close(config);
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
          actionButton({ actionId: "v8.calendar.new" }, [icon("calendar-plus"), element("span", { text: "Evenement" })]),
          actionButton({ actionId: "v8.brain.open" }, [icon("brain"), element("span", { text: "Brain" })])
        ])
      ])
    ]);
  }

  function notificationsContent() {
    const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher", "aria-label": "Rechercher dans les notifications", autocomplete: "off" } });
    search.value = notificationQuery;
    const filter = createSelect({ className: "v8-input", attributes: { "aria-label": "Filtrer les notifications" } }, [
      element("option", { text: "Toutes", attributes: { value: "all" } }),
      element("option", { text: "Non lues", attributes: { value: "unread" } }),
      element("option", { text: "Système", attributes: { value: "system" } }),
      element("option", { text: "Brain", attributes: { value: "brain" } }),
      element("option", { text: "Mises à jour", attributes: { value: "updates" } })
    ]);
    filter.value = notificationFilter;
    const list = element("div", { className: "v8-panel-notices", attributes: { role: "list", "aria-label": "Notifications" } });
    const bulkHost = element("div", { className: "v8-panel-bulk" });
    const content = element("div", { className: "v8-panel__content v8-panel__content--notifications" }, [
      element("div", { className: "v8-panel-list-toolbar" }, [
        element("div", { className: "v8-input-wrap" }, [icon("search"), search]),
        filter,
        element("button", { className: "v8-icon-button", attributes: { type: "button", "aria-label": "Tout marquer comme lu" }, dataset: { notificationReadAll: "" } }, [icon("check-check")])
      ]),
      bulkHost,
      list,
      actionButton({ actionId: "v8.sync.refresh", variant: "secondary" }, [icon("refresh-cw"), element("span", { text: "Verifier la synchronisation" })])
    ]);

    function availableItems() {
      const normalized = notificationQuery.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      return NOTIFICATION_ITEMS.filter((item) => {
        if (dismissedNotifications.has(item.id)) return false;
        if (notificationFilter === "unread" && readNotifications.has(item.id)) return false;
        if (!["all", "unread"].includes(notificationFilter) && item.category !== notificationFilter) return false;
        return !normalized || [item.title, item.message, item.category].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalized);
      });
    }

    function markRead(ids, read = true) {
      ids.forEach((id) => read ? readNotifications.add(id) : readNotifications.delete(id));
      notificationSelection.clear();
      render();
    }

    function archive(ids) {
      ids.forEach((id) => dismissedNotifications.add(id));
      notificationSelection.clear();
      render();
    }

    function openNotificationMenu(id, anchor, point = null) {
      const item = NOTIFICATION_ITEMS.find((entry) => entry.id === id);
      if (!item) return false;
      return notificationMenu.open(anchor, [
        { label: readNotifications.has(id) ? "Marquer comme non lue" : "Marquer comme lue", icon: readNotifications.has(id) ? "mail" : "mail-check", onSelect: () => markRead([id], !readNotifications.has(id)) },
        { label: notificationSelection.has(id) ? "Retirer de la sélection" : "Ajouter à la sélection", icon: notificationSelection.has(id) ? "square-minus" : "square-check-big", onSelect: () => { notificationSelection.toggle(id); render(); } },
        { separator: true },
        { label: "Archiver", icon: "archive", tone: "danger", onSelect: () => archive([id]) }
      ], { label: `Actions pour ${item.title}`, point });
    }

    function render() {
      const available = NOTIFICATION_ITEMS.filter((item) => !dismissedNotifications.has(item.id));
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
        visible.forEach((item) => list.append(notification(item, { selected: notificationSelection.has(item.id), read: readNotifications.has(item.id) })));
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
      if (event.target.closest("[data-notification-read-all]")) {
        markRead(NOTIFICATION_ITEMS.filter((item) => !dismissedNotifications.has(item.id)).map((item) => item.id), true);
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
    search.addEventListener("input", () => { notificationQuery = search.value; render(); });
    filter.addEventListener("change", () => { notificationFilter = filter.value; render(); });
    render();
    return content;
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
    const language = createSelect({ className: "v8-input", attributes: { "aria-label": "Langue de l'interface" } }, [
      element("option", { text: "Francais", attributes: { value: "fr", translate: "no" } }),
      element("option", { text: "English", attributes: { value: "en", translate: "no" } }),
      element("option", { text: "Espanol", attributes: { value: "es", translate: "no" } }),
      element("option", { text: "Deutsch", attributes: { value: "de", translate: "no" } })
    ]);
    language.value = options.currentLocale?.() || "fr";
    language.addEventListener("change", () => options.onLocaleChange?.(language.value));
    return element("div", { className: "v8-panel__content" }, [
      element("div", { className: "v8-panel-profile-card" }, [
        profileAvatarNode(user),
        element("div", {}, [element("strong", { text: user.name || "Rub", attributes: { translate: "no" } }), element("span", { text: `${workspaceById(state.space).label} | ${state.flow || "Essentiel"}` })]),
        element("span", { className: "v8-badge v8-badge--accent", text: "En ligne" })
      ]),
      element("label", { className: "v8-panel__language" }, [element("span", { text: "Langue" }), language]),
      element("div", { className: "v8-panel__actions" }, [
        actionButton({ actionId: "v8.settings.open", variant: "secondary" }, [icon("settings-2"), element("span", { text: "Reglages" })]),
        actionButton({ actionId: "v8.auth.signout", variant: "outline" }, [icon("log-out"), element("span", { text: "Se deconnecter" })])
      ])
    ]);
  }

  function open(id) {
    close({ restoreFocus: false });
    const copy = PANEL_COPY[id];
    if (!copy) return false;
    const content = id === "widgets" ? widgetsContent() : id === "notifications" ? notificationsContent() : profileContent();
    const panel = element("aside", {
      className: "v8-panel",
      attributes: { role: "dialog", "aria-modal": "false", "aria-label": copy.title }
    }, [
      element("header", { className: "v8-panel__header" }, [
        element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
        element("div", {}, [element("span", { className: "v8-eyebrow", text: copy.eyebrow }), element("strong", { text: copy.title })]),
        actionButton({ actionId: "v8.panel.close", className: "v8-icon-button", ariaLabel: "Fermer le panneau" }, [icon("x")])
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
    notificationCount: () => NOTIFICATION_ITEMS.filter((item) => !dismissedNotifications.has(item.id) && !readNotifications.has(item.id)).length,
    destroy: () => {
      notificationMenu.destroy();
      shell?.classList.remove("has-open-panel");
      windowController.destroy();
    }
  });
}
