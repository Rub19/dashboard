import { element, icon } from "./dom.mjs";
import { liveFreshnessNode, livePulseDot } from "./live-freshness.mjs";

function emblem(presence) {
  const inner = presence.avatarUrl
    ? element("span", { className: "v8-valorant-emblem__image" }, [element("img", {
      attributes: { src: presence.avatarUrl, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" }
    })])
    : element("span", { className: "v8-valorant-emblem__image is-fallback" }, [icon("swords")]);
  return element("span", { className: "v8-valorant-emblem" }, [inner, livePulseDot()]);
}

export function valorantLiveCard(presence = {}, options = {}) {
  if (presence.available !== true) return null;
  const variant = ["home", "activity"].includes(options.variant) ? options.variant : "home";
  const stat = presence.overview?.stats?.[0];
  const statLine = stat ? `${stat.displayName} : ${stat.displayValue}` : "Statistiques Valorant";
  return element(options.tagName || "article", {
    className: `v8-valorant-live v8-valorant-live--${variant} v8-surface`,
    attributes: { "aria-label": "Statistiques Valorant" },
    dataset: { liveWidget: "media", liveKind: "widget" }
  }, [
    emblem(presence),
    element("div", { className: "v8-valorant-live__body" }, [
      element("div", { className: "v8-valorant-live__meta" }, [icon("swords"), element("small", { text: "Valorant" })]),
      element("strong", { text: `${presence.name}#${presence.tag}`, attributes: { translate: "no" } }),
      element("p", { text: statLine, attributes: { translate: "no" } }),
      liveFreshnessNode(presence.updatedAt)
    ])
  ]);
}
