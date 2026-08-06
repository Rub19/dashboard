import { brandIcon, element, icon } from "./dom.mjs";
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

  const front = element("div", { className: `v8-google-calendar-live v8-google-calendar-live--${variant} v8-surface v8-live-card-front` }, [
    element("span", { className: "v8-google-calendar-icon" }, [icon("calendar-days"), livePulseDot()]),
    element("div", { className: "v8-google-calendar-live__body" }, [
      element("div", { className: "v8-google-calendar-live__meta" }, [brandIcon("google-calendar", "calendar-clock", "v8-live-brand-mark"), element("small", { text: "Prochain événement" })]),
      element("strong", { text: event.title, attributes: { translate: "no" } }),
      element("p", { text: meta, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);

  const back = element("div", { className: "v8-live-card-back v8-google-calendar-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("google-calendar", "calendar-clock", "v8-live-brand-mark"), element("strong", { text: "Google Calendar", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: event.title, attributes: { translate: "no" } }),
      element("p", { text: formatEventTime(event) }),
      event.location ? element("p", { text: event.location, attributes: { translate: "no" } }) : null,
      event.allDay ? element("p", { text: "Toute la journée" }) : null
    ].filter(Boolean)),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "Prochain événement" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-google-calendar-live v8-google-calendar-live--${variant}`,
    attributes: { "aria-label": "Prochain événement Google Calendar" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, a, input")) return;
    card.classList.toggle("is-flipped");
  });

  return card;
}
