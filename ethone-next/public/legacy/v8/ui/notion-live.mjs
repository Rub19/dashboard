import { attachFlipBehavior, brandIcon, element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `Il y a ${diffHour}h`;
  const diffDay = Math.round(diffHour / 24);
  return `Il y a ${diffDay}j`;
}

export function notionLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const page = presence.latestPage;
  const meta = [page.kind, formatRelativeTime(page.lastEditedTime)].filter(Boolean).join(" - ");

  const front = element("div", { className: `v8-notion-live v8-notion-live--${variant} v8-surface v8-live-card-front` }, [
    element("span", { className: "v8-notion-icon" }, [icon("notebook-tabs"), livePulseDot()]),
    element("div", { className: "v8-notion-live__body" }, [
      element("div", { className: "v8-notion-live__meta" }, [brandIcon("notion", "notebook-tabs", "v8-live-brand-mark"), element("small", { text: "Dernière page modifiée" })]),
      element("strong", { text: page.title, attributes: { translate: "no" } }),
      element("p", { text: meta, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ]),
    page.url ? element("a", {
      className: "v8-icon-button v8-notion-live__link",
      attributes: { href: page.url, target: "_blank", rel: "noopener noreferrer", "aria-label": "Ouvrir dans Notion" }
    }, [icon("arrow-up-right")]) : null
  ]);

  const back = element("div", { className: "v8-live-card-back v8-notion-live-back" }, [
    element("header", { className: "v8-flip-back-header" }, [brandIcon("notion", "notebook-tabs", "v8-live-brand-mark"), element("strong", { text: "Notion", attributes: { translate: "no" } })]),
    element("div", { className: "v8-flip-back-body" }, [
      element("p", { text: page.title, attributes: { translate: "no" } }),
      element("p", { text: page.kind }),
      element("p", { text: formatRelativeTime(page.lastEditedTime) })
    ]),
    element("footer", { className: "v8-flip-back-footer" }, [element("small", { text: "Dernière page modifiée" })])
  ]);

  const card = element(options.tagName || "article", {
    className: `v8-notion-live v8-notion-live--${variant}`,
    attributes: { "aria-label": "Dernière page Notion modifiée" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [element("div", { className: "v8-live-card-inner" }, [front, back])]);

  attachFlipBehavior(card);

  return card;
}
