import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

const DAY_MONTH = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const HOUR_MINUTE = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

function formatEventTime(event) {
  if (!event.start) return "";
  const start = new Date(event.start);
  if (Number.isNaN(start.getTime())) return "";
  if (event.allDay) return `Toute la journee - ${DAY_MONTH.format(start)}`;
  const diffMin = Math.round((start.getTime() - Date.now()) / 60000);
  const time = HOUR_MINUTE.format(start);
  if (diffMin <= 0 && diffMin > -180) return `En cours - ${time}`;
  if (diffMin > 0 && diffMin < 60) return `Dans ${diffMin} min - ${time}`;
  if (diffMin >= 60 && diffMin < 24 * 60 && start.toDateString() === new Date().toDateString()) return `Aujourd'hui a ${time}`;
  if (diffMin >= 60 && diffMin < 48 * 60) return `Demain a ${time}`;
  return `${DAY_MONTH.format(start)} a ${time}`;
}

export function googleCalendarLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const event = presence.nextEvent;
  const meta = [formatEventTime(event), event.location].filter(Boolean).join(" - ");
  return element(options.tagName || "article", {
    className: `v8-google-calendar-live v8-google-calendar-live--${variant} v8-surface`,
    attributes: { "aria-label": "Prochain evenement Google Calendar" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    element("span", { className: "v8-google-calendar-icon" }, [icon("calendar-days"), livePulseDot()]),
    element("div", { className: "v8-google-calendar-live__body" }, [
      element("div", { className: "v8-google-calendar-live__meta" }, [icon("calendar-clock"), element("small", { text: "Prochain evenement" })]),
      element("strong", { text: event.title, attributes: { translate: "no" } }),
      element("p", { text: meta, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
