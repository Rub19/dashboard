import { element, icon } from "./dom.mjs";

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const HOUR_MINUTE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function formatDue(task) {
  const raw = task.dueDateTime || task.due;
  if (!raw) return "Sans echeance";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Sans echeance";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const overdue = date.getTime() < now.getTime() && (task.dueDateTime || sameDay);
  const label = task.dueDateTime
    ? (sameDay ? `Aujourd'hui a ${HOUR_MINUTE.format(date)}` : `${DAY_MONTH.format(date)} a ${HOUR_MINUTE.format(date)}`)
    : (sameDay ? "Aujourd'hui" : DAY_MONTH.format(date));
  return overdue ? `En retard - ${label}` : label;
}

export function todoistLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const task = presence.nextTask;
  const meta = [formatDue(task), presence.openCount ? `${presence.openCount} tache${presence.openCount > 1 ? "s" : ""} ouverte${presence.openCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" - ");
  return element(options.tagName || "article", {
    className: `v8-todoist-live v8-todoist-live--${variant} v8-surface`,
    attributes: { "aria-label": "Prochaine tache Todoist" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    element("span", { className: "v8-todoist-icon" }, [icon("circle-check-big")]),
    element("div", { className: "v8-todoist-live__body" }, [
      element("div", { className: "v8-todoist-live__meta" }, [icon("circle-check-big"), element("small", { text: "Prochaine tache" })]),
      element("strong", { text: task.content, attributes: { translate: "no" } }),
      element("p", { text: meta, attributes: { translate: "no" } })
    ])
  ]);
}
