import { element, icon } from "./dom.mjs";
import { createToastManager } from "./toast.mjs";
import { showBottomSheet } from "./bottom-sheet.mjs";
import { refreshIcons } from "./icons.mjs";

const HISTORY_KEY = "v8_notification_history";
const MUTED_KEY = "v8_notification_muted";
const SNOOZED_KEY = "ethone:notifications:snoozed";

const DEFAULT_CATEGORIES = Object.freeze(["important", "messages", "activity", "system", "brain", "security"]);
const PRIORITIES = Object.freeze(["critical", "important", "normal", "silent"]);
const TYPES = Object.freeze(["success", "error", "warning", "info", "sync", "update", "brain", "loading", "github-pr", "calendar", "mail", "system"]);

const CATEGORY_META = Object.freeze({
  important: { label: "Important", icon: "star" },
  messages: { label: "Messages", icon: "mail" },
  activity: { label: "Activity", icon: "activity" },
  system: { label: "System", icon: "settings" },
  brain: { label: "Brain", icon: "brain" },
  security: { label: "Security", icon: "shield" }
});

const PRIORITY_META = Object.freeze({
  critical: { label: "Critical", tone: "danger" },
  important: { label: "Important", tone: "warning" },
  normal: { label: "Normal", tone: "info" },
  silent: { label: "Silent", tone: "success" }
});

const TYPE_ICONS = Object.freeze({
  success: "check-circle-2",
  error: "circle-alert",
  warning: "triangle-alert",
  info: "info",
  sync: "refresh-cw",
  update: "circle-arrow-up",
  brain: "brain",
  loading: "loader-circle",
  "github-pr": "github",
  calendar: "calendar-days",
  mail: "mail",
  system: "settings"
});

const SNOOZE_OPTIONS = Object.freeze(["10m", "1h", "tonight", "tomorrow"]);
const SNOOZE_LABELS = Object.freeze({ "10m": "10 min", "1h": "1 h", "tonight": "Ce soir", "tomorrow": "Demain" });

function loadStorage(key, fallback) {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  try { globalThis.localStorage?.setItem(key, JSON.stringify(value)); } catch { /* silent */ }
}

function normalizePriority(value, type = "") {
  if (value === "critical" || value === "high") return "critical";
  if (value === "important" || value === "medium") return "important";
  if (value === "normal") return "normal";
  if (value === "silent" || value === "low") return "silent";
  if (type === "error") return "critical";
  if (type === "warning") return "important";
  if (type === "brain" || type === "loading") return "silent";
  return "normal";
}

function buildRecord(notice) {
  const id = String(notice.id || `${notice.title}-${Date.now()}`).slice(0, 96);
  const category = DEFAULT_CATEGORIES.includes(notice.category) ? notice.category : "system";
  const priority = normalizePriority(notice.priority, notice.type);
  const type = TYPES.includes(notice.type) ? notice.type : "info";
  return {
    id,
    title: String(notice.title || "ETHONE"),
    message: String(notice.message || notice.body || ""),
    body: String(notice.body || notice.message || ""),
    type,
    category,
    priority,
    source: String(notice.source || CATEGORY_META[category]?.label || "ETHONE"),
    icon: notice.icon || null,
    read: false,
    archived: false,
    demo: notice.demo === true,
    timestamp: notice.timestamp || Date.now(),
    action: notice.action ? { label: String(notice.action.label || "Ouvrir"), run: notice.action.run } : null,
    data: notice.data || null
  };
}

function seedDemo(history) {
  const demos = [
    { id: "demo:github:1", title: "Review requested", message: "PR #42 on ethone-dashboard needs your review.", type: "github-pr", category: "activity", priority: "important", source: "GitHub", icon: "github", data: { pr: 42 } },
    { id: "demo:github:2", title: "PR #37 approved", message: "brain/runtime PR approved and ready to merge.", type: "github-pr", category: "activity", priority: "normal", source: "GitHub", icon: "github", data: { pr: 37 } },
    { id: "demo:calendar:1", title: "Réunion Brain", message: "Dans 15 minutes — Focus room.", type: "calendar", category: "important", priority: "important", source: "Google Calendar", icon: "calendar", data: { eventId: "demo" } },
    { id: "demo:mail:1", title: "Invitation ETHONE", message: "Vous avez été invité à rejoindre le serveur Discord.", type: "mail", category: "messages", priority: "normal", source: "ETHONE Mail", icon: "mail", data: { messageId: "demo" } },
    { id: "demo:security:1", title: "Nouvelle connexion", message: "Un appareil inconnu vient de se connecter.", type: "system", category: "security", priority: "critical", source: "ETHONE Security", icon: "shield-alert" },
    { id: "demo:brain:1", title: "Rappel Brain", message: "Pensez à finaliser votre contexte.", type: "brain", category: "brain", priority: "silent", source: "Brain", icon: "brain" }
  ];
  demos.forEach((demo) => { history.push(buildRecord({ ...demo, demo: true })); });
}

function snoozeWakeTimestamp(duration) {
  const now = Date.now();
  const map = {
    "10m": () => now + 10 * 60 * 1000,
    "1h": () => now + 60 * 60 * 1000,
    tonight: () => {
      const d = new Date();
      d.setHours(22, 0, 0, 0);
      if (d.getTime() <= now) d.setDate(d.getDate() + 1);
      return d.getTime();
    },
    tomorrow: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d.getTime();
    }
  };
  return map[duration]?.() || null;
}

export function createNotificationManager(region, options = {}) {
  const manager = createToastManager(region, options);
  const history = loadStorage(HISTORY_KEY, []);
  const muted = new Set(loadStorage(MUTED_KEY, []));
  let snoozed = loadStorage(SNOOZED_KEY, {});
  const subscribers = new Set();

  function persist() { saveStorage(HISTORY_KEY, history.slice(-250)); }
  function saveSnoozed() { saveStorage(SNOOZED_KEY, snoozed); }
  function cleanExpiredSnoozed() {
    const now = Date.now();
    let changed = false;
    for (const id of Object.keys(snoozed)) {
      if (snoozed[id] < now) { delete snoozed[id]; changed = true; }
    }
    if (changed) saveSnoozed();
  }

  cleanExpiredSnoozed();
  if (history.length === 0) { seedDemo(history); persist(); }

  function notifySubscribers() { subscribers.forEach((cb) => cb(unreadCount())); }

  function isSnoozed(id) { return (snoozed[id] || 0) > Date.now(); }

  function upsert(notice) {
    const record = buildRecord(notice);
    const existing = history.find((item) => item.id === record.id);
    if (existing) {
      existing.title = record.title;
      existing.message = record.message;
      existing.body = record.body;
      existing.type = record.type;
      existing.category = record.category;
      existing.priority = record.priority;
      existing.source = record.source;
      existing.icon = record.icon;
      existing.timestamp = record.timestamp;
      existing.action = record.action;
      existing.data = record.data;
      existing.archived = false;
    } else {
      history.unshift(record);
      if (history.length > 300) history.length = 300;
    }
    delete snoozed[record.id];
    saveSnoozed();
    persist();
    notifySubscribers();
    return record;
  }

  function show(notice = {}) {
    const record = upsert(notice);
    if (notice.silent || muted.has(record.category)) { notifySubscribers(); return record.id; }
    const important = record.priority === "critical" || record.priority === "important" || record.type === "error" || record.type === "warning" || notice.important === true;
    manager.show({
      id: record.id,
      title: record.title,
      message: record.message,
      type: record.type,
      duration: notice.duration,
      important,
      action: record.action
    });
    return record.id;
  }

  function markRead(ids, read = true) {
    [].concat(ids).forEach((id) => { const item = history.find((entry) => entry.id === id); if (item) item.read = read; });
    persist();
    notifySubscribers();
  }

  function archive(ids) {
    [].concat(ids).forEach((id) => {
      const item = history.find((entry) => entry.id === id);
      if (item) { item.archived = true; item.read = true; delete snoozed[id]; }
    });
    saveSnoozed();
    persist();
    notifySubscribers();
  }

  function clear() {
    history.length = 0;
    snoozed = {};
    saveSnoozed();
    persist();
    notifySubscribers();
  }

  function markAllRead() {
    history.forEach((item) => { if (!item.archived) item.read = true; });
    persist();
    notifySubscribers();
  }

  function markImportant(ids) {
    [].concat(ids).forEach((id) => {
      const item = history.find((entry) => entry.id === id);
      if (item) item.priority = "important";
    });
    persist();
    notifySubscribers();
  }

  function muteCategory(category) {
    if (!category) return;
    muted.add(category);
    saveStorage(MUTED_KEY, [...muted]);
  }

  function unmuteCategory(category) {
    if (!category) return;
    muted.delete(category);
    saveStorage(MUTED_KEY, [...muted]);
  }

  function isMuted(category) { return muted.has(category); }

  function getActive() { return history.filter((item) => !item.archived && !isSnoozed(item.id)); }

  function getHistory() { return getActive(); }

  function getAll() { return history.filter((item) => !item.archived); }

  function getSnoozed() {
    const now = Date.now();
    return history.filter((item) => !item.archived && (snoozed[item.id] || 0) > now);
  }

  function getArchived() { return history.filter((item) => item.archived); }

  function getCategories() { return [...DEFAULT_CATEGORIES]; }

  function unreadCount() { return history.filter((item) => !item.read && !item.archived && !isSnoozed(item.id)).length; }

  function importantCount() {
    return history.filter((item) => !item.read && !item.archived && !isSnoozed(item.id) && (item.priority === "critical" || item.priority === "important")).length;
  }

  function snoozeNotification(id, duration) {
    const until = snoozeWakeTimestamp(duration);
    if (!until) return false;
    const item = history.find((entry) => entry.id === id);
    if (!item) return false;
    snoozed[id] = until;
    saveSnoozed();
    notifySubscribers();
    return true;
  }

  function subscribe(callback) {
    subscribers.add(callback);
    callback(unreadCount());
    return () => subscribers.delete(callback);
  }

  function dismiss(id) { manager.dismiss(id); }

  function destroy() {
    manager.destroy();
    subscribers.clear();
  }

  return Object.freeze({
    show,
    dismiss,
    markRead,
    archive,
    markAllRead,
    markImportant,
    clear,
    muteCategory,
    unmuteCategory,
    isMuted,
    getHistory,
    getAll,
    getArchived,
    getSnoozed,
    getCategories,
    snoozeNotification,
    unreadCount,
    importantCount,
    subscribe,
    destroy
  });
}

function formatTime(ts) {
  const diff = Date.now() - (ts || Date.now());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "À l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

export function createNotificationCenter(manager, options = {}) {
  const actions = options.actions || null;
  const externalServices = options.externalServices || null;
  const notify = options.notify || (() => {});
  const onClose = options.onClose || null;
  const container = options.container || (typeof document !== "undefined" ? document.body : null);
  const shell = options.shell || container?.closest?.(".v8-shell");

  let active = false;
  let closed = false;
  let drawer = null;
  let sheet = null;
  let unsubscribe = null;
  let currentFilter = "all";
  let currentQuery = "";
  const expandedGroups = new Set();
  const snoozeOpen = new Set();

  const categories = [
    { id: "all", label: "Toutes" },
    { id: "unread", label: "Non lues" },
    ...DEFAULT_CATEGORIES.map((id) => ({ id, label: CATEGORY_META[id].label }))
  ];

  function isMobile() { return globalThis.matchMedia?.("(max-width: 640px)")?.matches === true; }

  function getVisibleItems() {
    let list = manager.getHistory();
    if (currentFilter === "unread") list = list.filter((item) => !item.read);
    else if (currentFilter !== "all") list = list.filter((item) => item.category === currentFilter);
    const query = currentQuery.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (query) {
      list = list.filter((item) => [item.title, item.message, item.source, item.category].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query));
    }
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }

  function itemActions(item) {
    if (item.type === "github-pr") return [{ id: "review", label: "Review", icon: "eye" }, { id: "open", label: "Open", icon: "external-link" }, { id: "snooze", label: "Snooze", icon: "clock-3" }, { id: "dismiss", label: "Dismiss", icon: "x" }];
    if (item.type === "calendar") return [{ id: "open", label: "Open", icon: "calendar" }, { id: "snooze", label: "Snooze", icon: "clock-3" }, { id: "dismiss", label: "Dismiss", icon: "x" }];
    if (item.type === "mail") return [{ id: "read", label: "Read", icon: "mail-open" }, { id: "archive", label: "Archive", icon: "archive" }, { id: "snooze", label: "Snooze", icon: "clock-3" }, { id: "dismiss", label: "Dismiss", icon: "x" }];
    if (item.type === "system") return [{ id: "dismiss", label: "Dismiss", icon: "x" }];
    return [{ id: "open", label: "Open", icon: "external-link" }, { id: "snooze", label: "Snooze", icon: "clock-3" }, { id: "dismiss", label: "Dismiss", icon: "x" }];
  }

  function openItem(item, actionId) {
    if (actionId === "dismiss" || actionId === "archive") { manager.archive([item.id]); return; }
    if (actionId === "snooze") { if (snoozeOpen.has(item.id)) snoozeOpen.delete(item.id); else snoozeOpen.add(item.id); return; }
    if (actionId === "read" || actionId === "open" || actionId === "review") manager.markRead([item.id]);

    if (item.type === "github-pr") {
      const data = item.data || {};
      if (externalServices?.githubOAuth?.openPR) { try { externalServices.githubOAuth.openPR(data); } catch {} }
      else if (externalServices?.github?.openPR) { try { externalServices.github.openPR(data); } catch {} }
      else if (actions?.dispatch) { actions.dispatch("v8.connections.open"); notify({ title: "GitHub", message: "Ouvrez Connections pour lier GitHub.", type: "info" }); }
      else notify({ title: item.title, message: "Ouvert", type: "info" });
      return;
    }
    if (item.type === "calendar") {
      if (externalServices?.googleCalendarOAuth?.openEvent) { try { externalServices.googleCalendarOAuth.openEvent(item.data); } catch {} }
      else if (actions?.dispatch) { actions.dispatch("v8.calendar.open"); }
      else notify({ title: item.title, message: "Ouvert", type: "info" });
      return;
    }
    if (item.type === "mail") {
      if (externalServices?.mail?.open) { try { externalServices.mail.open(item.data); } catch {} }
      else if (actions?.dispatch) { actions.dispatch("v8.mail.open", { id: item.id }); }
      else notify({ title: item.title, message: "Ouvert", type: "info" });
      return;
    }
    if (item.action?.run) { try { item.action.run(); } catch {} }
    else if (actions?.dispatch && item.data?.route) { actions.dispatch(item.data.route); }
    else notify({ title: item.title, message: "Notification ouverte", type: "info" });
  }

  function renderItem(item) {
    const meta = PRIORITY_META[item.priority] || PRIORITY_META.normal;
    const iconName = item.icon || TYPE_ICONS[item.type] || "bell";
    const row = element("article", {
      className: `v8-notification-item v8-notification-item--${item.type} v8-notification-item--priority-${item.priority}${item.read ? " is-read" : ""}`,
      attributes: { role: "listitem", tabindex: "0", "aria-label": item.title },
      dataset: { notificationId: item.id }
    }, [
      element("span", { className: `v8-notification-item__icon v8-notification-item__icon--${meta.tone}` }, [icon(iconName)]),
      element("div", { className: "v8-notification-item__body" }, [
        element("div", { className: "v8-notification-item__meta" }, [
          element("span", { text: formatTime(item.timestamp) }),
          element("span", { className: "v8-notification-item__source", text: item.source }),
          element("span", { className: `v8-notification-priority v8-notification-priority--${item.priority}`, text: meta.label })
        ]),
        element("strong", { text: item.title }),
        element("p", { text: item.message })
      ]),
      element("div", { className: "v8-notification-item__actions" }, itemActions(item).map((action) => element("button", {
        className: "v8-button v8-button--secondary v8-button--sm",
        attributes: { type: "button" },
        dataset: { notificationAction: action.id, notificationId: item.id }
      }, [icon(action.icon), element("span", { text: action.label })]))),
      snoozeOpen.has(item.id) ? element("div", { className: "v8-notification-snooze" }, SNOOZE_OPTIONS.map((dur) => element("button", {
        className: "v8-button v8-button--outline v8-button--sm",
        attributes: { type: "button" },
        dataset: { notificationSnooze: item.id, duration: dur }
      }, [element("span", { text: SNOOZE_LABELS[dur] })]))) : null
    ]);

    let startX = 0;
    let currentX = 0;
    row.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      currentX = 0;
      row.style.transition = "none";
    }, { passive: true });
    row.addEventListener("touchmove", (event) => {
      if (!startX) return;
      currentX = event.touches[0].clientX - startX;
      if (currentX < 0) row.style.transform = `translateX(${Math.max(currentX, -120)}px)`;
    }, { passive: true });
    row.addEventListener("touchend", () => {
      row.style.transition = "";
      if (currentX < -80) {
        manager.archive([item.id]);
        notify({ title: item.title, message: "Notification supprimée", type: "info" });
        render();
      } else {
        row.style.transform = "";
      }
      startX = 0;
    });
    return row;
  }

  function renderGroup(source, items) {
    const expanded = expandedGroups.has(source);
    const groupIcon = items[0]?.icon || CATEGORY_META[items[0]?.category]?.icon || "bell";
    const header = element("button", {
      className: "v8-notification-group__header",
      attributes: { type: "button", "aria-expanded": String(expanded) },
      dataset: { groupToggle: source }
    }, [
      element("span", { className: "v8-notification-group__icon" }, [icon(groupIcon)]),
      element("span", { className: "v8-notification-group__title", text: `${items.length} ${source}` }),
      element("span", { className: `v8-notification-group__arrow${expanded ? " is-open" : ""}` }, [icon("chevron-down")])
    ]);
    const body = element("div", { className: "v8-notification-group__items", attributes: { role: "list", hidden: expanded ? null : "true" } }, items.map(renderItem));
    return element("div", { className: "v8-notification-group" }, [header, body]);
  }

  function renderList() {
    const items = getVisibleItems();
    if (items.length === 0) {
      return element("div", { className: "v8-notification-empty" }, [
        icon("inbox"),
        element("strong", { text: "Tout est traité" }),
        element("p", { text: "Aucune notification active. De nouveaux signaux apparaîtront ici." })
      ]);
    }
    const map = new Map();
    items.forEach((item) => {
      const source = item.source || item.category || "ETHONE";
      if (!map.has(source)) map.set(source, []);
      map.get(source).push(item);
    });
    const groups = element("div", { className: "v8-notification-groups", attributes: { role: "list", "aria-label": "Notifications" } });
    map.forEach((groupItems, source) => { groups.append(renderGroup(source, groupItems)); });
    return groups;
  }

  function updateChips(chipsHost) {
    chipsHost.replaceChildren(...categories.map((cat) => {
      const isActive = currentFilter === cat.id;
      return element("button", {
        className: `v8-notification-chip${isActive ? " is-active" : ""}`,
        attributes: { type: "button", "aria-pressed": String(isActive) },
        dataset: { notificationChip: cat.id }
      }, [cat.id !== "all" && cat.id !== "unread" ? icon(CATEGORY_META[cat.id]?.icon || "bell") : null, element("span", { text: cat.label })].filter(Boolean));
    }));
  }

  function buildContent() {
    const markAllBtn = element("button", { className: "v8-button v8-button--secondary v8-button--sm", attributes: { type: "button", "aria-label": "Tout marquer comme lu" }, dataset: { notificationMarkAll: "" } }, [icon("check-check"), element("span", { text: "Mark all read" })]);
    const clearBtn = element("button", { className: "v8-button v8-button--outline v8-button--sm", attributes: { type: "button", "aria-label": "Effacer les notifications" }, dataset: { notificationClear: "" } }, [icon("trash-2"), element("span", { text: "Clear" })]);
    const filterSelect = element("select", { className: "v8-input v8-notification-filter", attributes: { "aria-label": "Filtrer" } }, categories.map((cat) => element("option", { text: cat.label, attributes: { value: cat.id, selected: cat.id === currentFilter ? "selected" : null } })));
    const search = element("input", { className: "v8-input", attributes: { type: "search", placeholder: "Rechercher...", "aria-label": "Rechercher dans les notifications", autocomplete: "off", value: currentQuery } });

    const toolbar = element("div", { className: "v8-notification-toolbar" }, [
      element("div", { className: "v8-notification-toolbar__actions" }, [markAllBtn, clearBtn]),
      element("div", { className: "v8-notification-toolbar__fields" }, [
        element("div", { className: "v8-input-wrap" }, [icon("search"), search]),
        filterSelect
      ])
    ]);

    const chipsHost = element("div", { className: "v8-notification-chips" });
    updateChips(chipsHost);

    const listHost = element("div", { className: "v8-notification-list-host" });

    const root = element("div", { className: "v8-notification-center" }, [toolbar, chipsHost, listHost]);

    search.addEventListener("input", () => { currentQuery = search.value; render(); });
    filterSelect.addEventListener("change", () => { currentFilter = filterSelect.value; render(); });

    root.addEventListener("click", (event) => {
      const markAll = event.target.closest("[data-notification-mark-all]");
      if (markAll) { manager.markAllRead(); notify({ title: "Notifications", message: "Tout marqué comme lu", type: "success" }); render(); return; }
      const clear = event.target.closest("[data-notification-clear]");
      if (clear) { manager.clear(); notify({ title: "Notifications", message: "Centre de signal effacé", type: "info" }); render(); return; }
      const chip = event.target.closest("[data-notification-chip]");
      if (chip) { currentFilter = chip.dataset.notificationChip; render(); return; }
      const group = event.target.closest("[data-group-toggle]");
      if (group) { const source = group.dataset.groupToggle; if (expandedGroups.has(source)) expandedGroups.delete(source); else expandedGroups.add(source); render(); return; }
      const snooze = event.target.closest("[data-notification-snooze]");
      if (snooze) {
        const id = snooze.dataset.notificationSnooze;
        const dur = snooze.dataset.duration;
        manager.snoozeNotification(id, dur);
        snoozeOpen.delete(id);
        notify({ title: "Snooze", message: `Reporté à ${SNOOZE_LABELS[dur]}`, type: "success" });
        render();
        return;
      }
      const actionBtn = event.target.closest("[data-notification-action]");
      if (actionBtn) {
        const actionId = actionBtn.dataset.notificationAction;
        const itemId = actionBtn.dataset.notificationId;
        const item = manager.getHistory().find((i) => i.id === itemId);
        if (!item) return;
        openItem(item, actionId);
        render();
      }
    });

    function render() {
      filterSelect.value = currentFilter;
      search.value = currentQuery;
      updateChips(chipsHost);
      listHost.replaceChildren(renderList());
      refreshIcons();
    }

    return { root, render };
  }

  function createDrawer(contentRoot) {
    const panel = element("aside", {
      className: "v8-panel v8-notification-drawer",
      attributes: { role: "dialog", "aria-modal": "false", "aria-label": "Notifications" }
    }, [
      element("header", { className: "v8-panel__header" }, [
        element("div", { className: "v8-window-controls", attributes: { "aria-hidden": "true" } }, [element("span"), element("span"), element("span")]),
        element("div", {}, [element("span", { className: "v8-eyebrow", text: "Centre de signal" }), element("strong", { text: "Notifications" })]),
        element("button", {
          className: "v8-icon-button",
          attributes: { type: "button", "aria-label": "Fermer" },
          events: { click: () => doClose() }
        }, [icon("x")])
      ]),
      contentRoot
    ]);
    container.append(panel);
    shell?.classList?.add("has-open-panel");
    return panel;
  }

  function doClose() {
    if (closed) return;
    closed = true;
    active = false;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (sheet) { const s = sheet; sheet = null; s.close(); }
    if (drawer) { const d = drawer; drawer = null; d.remove(); }
    shell?.classList?.remove("has-open-panel");
    onClose?.();
  }

  function open() {
    if (active) return;
    active = true;
    closed = false;
    snoozeOpen.clear();
    const content = buildContent();
    if (isMobile()) {
      sheet = showBottomSheet({ title: "Notifications", children: [content.root], onClose: () => { if (!closed) doClose(); } });
    } else {
      drawer = createDrawer(content.root);
    }
    unsubscribe = manager.subscribe(() => { if (active) content.render(); });
    content.render();
    refreshIcons();
  }

  function close() { doClose(); }
  function toggle() { active ? close() : open(); }

  return Object.freeze({ open, close, toggle, isOpen: () => active, current: () => currentFilter });
}
