import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";
import { getLayerManager } from "./layer-manager.mjs";

const ICONS = Object.freeze({
  success: "check-circle-2",
  error: "circle-alert",
  warning: "triangle-alert",
  info: "info",
  sync: "refresh-cw",
  update: "circle-arrow-up",
  brain: "brain",
  loading: "loader-circle"
});

export function createToastManager(region, options = {}) {
  const documentRef = region.ownerDocument || globalThis.document;
  const runtime = documentRef?.defaultView || globalThis;
  const layerManager = getLayerManager({ document: documentRef, runtime });
  const records = new Map();
  const sounds = options.sounds || null;
  const presence = options.presence || null;
  let layerRegistration = null;

  function ensureLayer() {
    if (layerRegistration) return;
    layerRegistration = layerManager.register({
      element: region,
      boundary: region,
      kind: "toast",
      closeOnEscape: false
    });
  }

  function releaseLayerIfEmpty() {
    if (records.size || !layerRegistration) return;
    layerRegistration.release({ restoreFocus: false });
    layerRegistration = null;
  }

  function importantNotice(notice, type) {
    return notice.important === true || type === "error" || type === "warning";
  }

  function syncNotificationPresence() {
    const count = [...records.values()].filter((record) => record.important && !record.dismissing).length;
    presence?.update?.({ notificationsImportant: count });
  }

  function clearTimers(record) {
    record.timers.forEach((timer) => globalThis.clearTimeout(timer));
    record.timers.clear();
    record.node.classList.remove("is-timed");
  }

  function dismiss(id) {
    const record = records.get(id);
    if (!record) return false;
    clearTimers(record);
    record.dismissing = true;
    syncNotificationPresence();
    const remove = () => {
      record.node.remove();
      if (records.get(id) === record) {
        records.delete(id);
        syncNotificationPresence();
        releaseLayerIfEmpty();
      }
    };
    if (presence?.signalActivity) {
      presence.signalActivity(record.node, "notification", { phase: "exit", onComplete: remove });
      return true;
    }
    record.node.classList.remove("is-visible");
    const timer = globalThis.setTimeout(remove, 210);
    record.timers.add(timer);
    return true;
  }

  function removeImmediately(id) {
    const record = records.get(id);
    if (!record) return false;
    clearTimers(record);
    presence?.cancelTransition?.(record.node);
    record.node.remove();
    records.delete(id);
    syncNotificationPresence();
    releaseLayerIfEmpty();
    return true;
  }

  function schedule(record, duration) {
    clearTimers(record);
    if (duration === 0) return;
    record.node.style.setProperty("--v8-toast-duration", `${duration}ms`);
    record.node.getBoundingClientRect();
    record.node.classList.add("is-timed");
    const timer = globalThis.setTimeout(() => dismiss(record.id), duration);
    record.timers.add(timer);
  }

  function show(notice = {}) {
    const id = String(notice.id || notice.message || "notice").slice(0, 96);
    let existing = records.get(id);
    if (existing?.dismissing) {
      removeImmediately(id);
      existing = null;
    }
    if (existing) {
      const title = existing.message.querySelector("strong");
      const copy = existing.message.querySelector("span");
      if (title) title.textContent = String(notice.title || "ETHONE");
      if (copy) copy.textContent = String(notice.message || "");
      if (typeof notice.action?.run === "function") {
        let actionButton = existing.node.querySelector("[data-toast-action]");
        if (!actionButton) {
          actionButton = element("button", {
            className: "v8-button v8-button--secondary",
            attributes: { type: "button" },
            dataset: { toastAction: id }
          });
          existing.node.querySelector("[data-toast-close]")?.before(actionButton);
        }
        actionButton.textContent = String(notice.action.label || "Ouvrir");
        existing.node.classList.add("v8-toast--action");
        existing.action = notice.action.run;
      }
      const nextType = ICONS[notice.type] ? notice.type : "info";
      existing.important = importantNotice(notice, nextType);
      if (nextType !== existing.type) {
        Object.keys(ICONS).forEach((tone) => existing.node.classList.remove(`v8-toast--${tone}`));
        existing.node.classList.add(`v8-toast--${nextType}`);
        existing.node.querySelector(".v8-toast__icon")?.replaceChildren(icon(ICONS[nextType]));
        existing.type = nextType;
        sounds?.playNotification?.({ ...notice, type: nextType });
        refreshIcons();
      }
      existing.node.classList.add("is-visible");
      presence?.signalActivity?.(existing.node, "notification", { phase: "update" });
      syncNotificationPresence();
      schedule(existing, notice.duration === 0 ? 0 : (notice.duration || 4200));
      ensureLayer();
      return id;
    }

    while (records.size >= 3) removeImmediately(records.keys().next().value);
    const type = ICONS[notice.type] ? notice.type : "info";
    const message = element("div", { className: "v8-toast__message" }, [
      element("strong", { text: notice.title || "ETHONE" }),
      element("span", { text: notice.message || "Action terminée." })
    ]);
    const close = element("button", {
      className: "v8-icon-button",
      attributes: { type: "button", "aria-label": "Fermer la notification" },
      dataset: { toastClose: id }
    }, [icon("x")]);
    const action = typeof notice.action?.run === "function"
      ? element("button", {
        className: "v8-button v8-button--secondary",
        text: String(notice.action.label || "Ouvrir"),
        attributes: { type: "button" },
        dataset: { toastAction: id }
      })
      : null;
    const node = element("article", {
      className: `v8-toast v8-toast--${type}${action ? " v8-toast--action" : ""}`,
      attributes: { role: type === "error" ? "alert" : "status" }
    }, [element("span", { className: "v8-toast__icon" }, [icon(ICONS[type])]), message, action, close].filter(Boolean));
    const record = { id, node, message, action: notice.action?.run || null, type, important: importantNotice(notice, type), timers: new Set(), dismissing: false };
    records.set(id, record);
    ensureLayer();
    region.append(node);
    node.classList.add("is-visible");
    presence?.signalActivity?.(node, "notification", { phase: "enter" });
    syncNotificationPresence();
    schedule(record, notice.duration === 0 ? 0 : (notice.duration || 4200));
    sounds?.playNotification?.({ ...notice, type });
    refreshIcons();
    return id;
  }

  function handleClick(event) {
    const action = event.target.closest("[data-toast-action]");
    if (action) {
      const record = records.get(action.dataset.toastAction);
      try { record?.action?.(); } finally { dismiss(action.dataset.toastAction); }
      return;
    }
    const button = event.target.closest("[data-toast-close]");
    if (button) dismiss(button.dataset.toastClose);
  }

  region.addEventListener("click", handleClick);

  return Object.freeze({
    show,
    dismiss,
    count: () => records.size,
    destroy: () => {
      region.removeEventListener("click", handleClick);
      records.forEach((record) => {
        clearTimers(record);
        presence?.cancelTransition?.(record.node);
        record.node.remove();
      });
      records.clear();
      layerRegistration?.release?.({ restoreFocus: false });
      layerRegistration = null;
      presence?.update?.({ notificationsImportant: 0 });
    }
  });
}
