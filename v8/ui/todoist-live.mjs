import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const HOUR_MINUTE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function formatDue(task) {
  const raw = task.dueDateTime || task.due;
  if (!raw) return "Sans échéance";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Sans échéance";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const overdue = date.getTime() < now.getTime() && (task.dueDateTime || sameDay);
  const label = task.dueDateTime
    ? (sameDay ? `Aujourd'hui à ${HOUR_MINUTE.format(date)}` : `${DAY_MONTH.format(date)} à ${HOUR_MINUTE.format(date)}`)
    : (sameDay ? "Aujourd'hui" : DAY_MONTH.format(date));
  return overdue ? `En retard - ${label}` : label;
}

export function todoistLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const task = presence.nextTask;
  const meta = [formatDue(task), presence.openCount ? `${presence.openCount} tache${presence.openCount > 1 ? "s" : ""} ouverte${presence.openCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" - ");

  const front = element("div", { className: `v8-todoist-live v8-todoist-live--${variant} v8-surface v8-live-card-front` }, [
    element("span", { className: "v8-todoist-icon" }, [icon("circle-check-big"), livePulseDot()]),
    element("div", { className: "v8-todoist-live__body" }, [
      element("div", { className: "v8-todoist-live__meta" }, [brandIcon("todoist", "circle-check-big", "v8-live-brand-mark"), element("small", { text: "Prochaine tâche" })]),
      element("strong", { text: task.content, attributes: { translate: "no" } }),
      element("p", { text: meta, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-todoist-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("todoist", "circle-check-big", "v8-live-brand-mark"), element("strong", { text: "Todoist", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: task.content, attributes: { translate: "no" } }),
      element("p", { text: formatDue(task) }),
      presence.openCount ? element("p", { text: `${presence.openCount} tâche(s) ouverte(s)` }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "Prochaine tâche" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-todoist-live v8-todoist-live--${variant}`,
    attributes: { "aria-label": "Prochaine tâche Todoist" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
