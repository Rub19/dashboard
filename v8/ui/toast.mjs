import { element, icon } from "./dom.mjs";
import { refreshIcons } from "./icons.mjs";

const ICONS = Object.freeze({
  success: "check-circle-2",
  error: "circle-alert",
  warning: "triangle-alert",
  info: "info"
});

export function createToastManager(region) {
  const records = new Map();

  function clearTimers(record) {
    record.timers.forEach((timer) => globalThis.clearTimeout(timer));
    record.timers.clear();
    record.node.classList.remove("is-timed");
  }

  function dismiss(id) {
    const record = records.get(id);
    if (!record) return false;
    clearTimers(record);
    record.node.classList.remove("is-visible");
    const timer = globalThis.setTimeout(() => {
      record.node.remove();
      records.delete(id);
    }, 210);
    record.timers.add(timer);
    return true;
  }

  function removeImmediately(id) {
    const record = records.get(id);
    if (!record) return false;
    clearTimers(record);
    record.node.remove();
    records.delete(id);
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
    const existing = records.get(id);
    if (existing) {
      const copy = existing.message.querySelector("span");
      if (copy) copy.textContent = String(notice.message || "");
      existing.action = notice.action?.run || existing.action;
      schedule(existing, notice.duration === 0 ? 0 : (notice.duration || 4200));
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
      className: `v8-toast v8-toast--${type}`,
      attributes: { role: type === "error" ? "alert" : "status" }
    }, [element("span", { className: "v8-toast__icon" }, [icon(ICONS[type])]), message, action, close].filter(Boolean));
    const record = { id, node, message, action: notice.action?.run || null, timers: new Set() };
    records.set(id, record);
    region.append(node);
    node.getBoundingClientRect();
    node.classList.add("is-visible");
    schedule(record, notice.duration === 0 ? 0 : (notice.duration || 4200));
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
        record.node.remove();
      });
      records.clear();
    }
  });
}
